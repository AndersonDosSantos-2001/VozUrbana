const { Op } = require('sequelize');
const {
  Sequelize,
  Denuncia,
  Categoria,
} = require('../models');
const { gerarLiteralHaversineKm } = require('../utils/haversineSql');

const dashboardController = {
  /**
   * GET /api/dashboard/estatisticas
   * Retorna dados agregados pelo PostgreSQL para alimentar os gráficos de Pizza e Colunas:
   * - resumo_geral (total_denuncias, total_apoios_acumulados, taxa_resolucao_percentual)
   * - por_categoria (categoria_id, nome, cor_hex, icone, total_denuncias, percentual, total_curtidas)
   * - areas_mais_criticas (top 10 bairros com mais denúncias e soma de apoios)
   * - por_status (distribuição e percentual por status)
   */
  async obterEstatisticas(req, res) {
    try {
      const {
        bairro,
        periodo_dias,
        status,
        lat,
        lng,
        raio_km,
      } = req.query;

      const condicoesAnd = [];

      // Filtro por bairro
      const bairroAplicado =
        bairro && String(bairro).trim() !== '' && String(bairro).toUpperCase() !== 'TODOS'
          ? String(bairro).trim()
          : 'TODOS';

      if (bairroAplicado !== 'TODOS') {
        condicoesAnd.push({
          bairro: {
            [Op.iLike]: bairroAplicado,
          },
        });
      }

      // Filtro por período em dias (ex: últimos 30 dias)
      const periodoDiasNum =
        periodo_dias !== undefined && periodo_dias !== '' ? Number(periodo_dias) : null;
      const periodoAplicado =
        Number.isFinite(periodoDiasNum) && periodoDiasNum > 0 ? periodoDiasNum : null;

      if (periodoAplicado) {
        const dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() - periodoAplicado);
        condicoesAnd.push({
          created_at: {
            [Op.gte]: dataLimite,
          },
        });
      }

      // Filtro por status
      const statusAplicado =
        status && String(status).trim() !== '' && String(status).toUpperCase() !== 'TODOS'
          ? String(status).trim().toUpperCase()
          : 'TODOS';

      if (statusAplicado !== 'TODOS') {
        condicoesAnd.push({
          status: statusAplicado,
        });
      }

      // Filtro geográfico opcional por raio em km (via Haversine)
      const latNum = lat !== undefined && lat !== '' ? Number(lat) : NaN;
      const lngNum = lng !== undefined && lng !== '' ? Number(lng) : NaN;
      const raioKmNum = raio_km !== undefined && raio_km !== '' ? Number(raio_km) : NaN;

      if (
        Number.isFinite(latNum) &&
        Number.isFinite(lngNum) &&
        Number.isFinite(raioKmNum) &&
        raioKmNum > 0
      ) {
        const literalDistancia = gerarLiteralHaversineKm(latNum, lngNum, 'Denuncia');
        condicoesAnd.push(
          Sequelize.where(literalDistancia, {
            [Op.lte]: raioKmNum,
          })
        );
      }

      const whereFiltro =
        condicoesAnd.length > 0
          ? { [Op.and]: condicoesAnd }
          : {};

      // Executa as 3 consultas agregadas em paralelo no PostgreSQL
      const [agregadoPorCategoria, agregadoPorBairro, agregadoPorStatus] = await Promise.all([
        Denuncia.findAll({
          attributes: [
            'categoria_id',
            [Sequelize.fn('COUNT', Sequelize.col('Denuncia.id')), 'total_denuncias'],
            [
              Sequelize.fn('COALESCE', Sequelize.fn('SUM', Sequelize.col('Denuncia.total_apoios')), 0),
              'total_curtidas',
            ],
          ],
          where: whereFiltro,
          include: [
            {
              model: Categoria,
              as: 'categoria',
              attributes: ['id', 'nome', 'icone', 'cor_hex'],
            },
          ],
          group: ['Denuncia.categoria_id', 'categoria.id'],
          order: [
            [Sequelize.literal('total_denuncias'), 'DESC'],
            [Sequelize.literal('total_curtidas'), 'DESC'],
          ],
          raw: true,
          nest: true,
        }),

        Denuncia.findAll({
          attributes: [
            'bairro',
            [Sequelize.fn('COUNT', Sequelize.col('Denuncia.id')), 'total_denuncias'],
            [
              Sequelize.fn('COALESCE', Sequelize.fn('SUM', Sequelize.col('Denuncia.total_apoios')), 0),
              'total_curtidas',
            ],
          ],
          where: whereFiltro,
          group: ['bairro'],
          order: [
            [Sequelize.literal('total_denuncias'), 'DESC'],
            [Sequelize.literal('total_curtidas'), 'DESC'],
          ],
          limit: 10,
          raw: true,
        }),

        Denuncia.findAll({
          attributes: [
            'status',
            [Sequelize.fn('COUNT', Sequelize.col('Denuncia.id')), 'total'],
            [
              Sequelize.fn('COALESCE', Sequelize.fn('SUM', Sequelize.col('Denuncia.total_apoios')), 0),
              'soma_apoios',
            ],
          ],
          where: whereFiltro,
          group: ['status'],
          raw: true,
        }),
      ]);

      // Cálculo do resumo geral a partir do agregado por status
      let totalDenunciasGeral = 0;
      let totalApoiosAcumulados = 0;
      let totalResolvidas = 0;

      for (const item of agregadoPorStatus) {
        const qtd = Number(item.total) || 0;
        const apoios = Number(item.soma_apoios) || 0;
        totalDenunciasGeral += qtd;
        totalApoiosAcumulados += apoios;
        if (item.status === 'RESOLVIDO') {
          totalResolvidas += qtd;
        }
      }

      const taxaResolucaoPercentual =
        totalDenunciasGeral > 0
          ? Number(((totalResolvidas / totalDenunciasGeral) * 100).toFixed(1))
          : 0.0;

      // Formatação de por_categoria com cálculo de percentual
      const porCategoria = agregadoPorCategoria.map((item) => {
        const totalCat = Number(item.total_denuncias) || 0;
        const curtidasCat = Number(item.total_curtidas) || 0;
        const percentual =
          totalDenunciasGeral > 0
            ? Number(((totalCat / totalDenunciasGeral) * 100).toFixed(1))
            : 0.0;

        return {
          categoria_id: Number(item.categoria_id),
          nome: item.categoria ? item.categoria.nome : null,
          icone: item.categoria ? item.categoria.icone : null,
          cor_hex: item.categoria ? item.categoria.cor_hex : '#6B7280',
          total_denuncias: totalCat,
          percentual,
          total_curtidas: curtidasCat,
        };
      });

      // Formatação de areas_mais_criticas (Top 10 bairros)
      const areasMaisCriticas = agregadoPorBairro.map((item) => {
        const totalBairro = Number(item.total_denuncias) || 0;
        const curtidasBairro = Number(item.total_curtidas) || 0;

        return {
          bairro: item.bairro,
          total_denuncias: totalBairro,
          total_curtidas: curtidasBairro,
        };
      });

      // Formatação de por_status
      const porStatus = agregadoPorStatus.map((item) => {
        const totalStatus = Number(item.total) || 0;
        const percentual =
          totalDenunciasGeral > 0
            ? Number(((totalStatus / totalDenunciasGeral) * 100).toFixed(1))
            : 0.0;

        return {
          status: item.status,
          total: totalStatus,
          percentual,
        };
      });

      return res.status(200).json({
        filtros_aplicados: {
          bairro: bairroAplicado,
          periodo_dias: periodoAplicado,
          status: statusAplicado,
        },
        resumo_geral: {
          total_denuncias: totalDenunciasGeral,
          total_apoios_acumulados: totalApoiosAcumulados,
          taxa_resolucao_percentual: taxaResolucaoPercentual,
        },
        por_categoria: porCategoria,
        areas_mais_criticas: areasMaisCriticas,
        por_status: porStatus,
      });
    } catch (err) {
      console.error('Erro em dashboardController.obterEstatisticas:', err);
      return res.status(500).json({
        erro: 'Erro interno ao gerar estatísticas do dashboard.',
      });
    }
  },

  /**
   * GET /api/dashboard/bairros
   * Lista os bairros distintos que possuem denúncias registradas (útil para filtros do Front-end).
   */
  async listarBairros(_req, res) {
    try {
      const registros = await Denuncia.findAll({
        attributes: [
          'bairro',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'total_denuncias'],
        ],
        group: ['bairro'],
        order: [[Sequelize.literal('total_denuncias'), 'DESC']],
        raw: true,
      });

      return res.status(200).json(
        registros.map((r) => ({
          bairro: r.bairro,
          total_denuncias: Number(r.total_denuncias) || 0,
        }))
      );
    } catch (err) {
      console.error('Erro em dashboardController.listarBairros:', err);
      return res.status(500).json({
        erro: 'Erro interno ao listar bairros.',
      });
    }
  },
};

module.exports = dashboardController;
