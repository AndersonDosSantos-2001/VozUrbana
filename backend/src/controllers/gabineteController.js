const { Op } = require('sequelize');
const { Denuncia, Categoria, Usuario } = require('../models');

const STATUS_PERMITIDOS = [
  'PENDENTE',
  'EM_ANALISE',
  'EM_ANDAMENTO',
  'RESOLVIDO',
  'REJEITADO',
];

const gabineteController = {
  /**
   * GET /api/gabinete/denuncias
   * Rota exclusiva do GESTOR para listar a fila de triagem do Gabinete.
   * Suporta filtros (bairro, status, categoria_id, busca) e ordenação por
   * 'prioridade' (total_apoios DESC), 'antiguidade' (created_at ASC) ou 'mais_recentes' (created_at DESC).
   */
  async listarDenuncias(req, res) {
    try {
      const {
        bairro,
        status,
        categoria_id,
        busca,
        ordenar = 'prioridade',
      } = req.query;

      const condicoesWhere = {};

      if (categoria_id !== undefined && categoria_id !== '') {
        condicoesWhere.categoria_id = Number(categoria_id);
      }

      if (status !== undefined && status !== '' && String(status).toUpperCase() !== 'TODOS') {
        condicoesWhere.status = String(status).trim().toUpperCase();
      }

      if (bairro !== undefined && bairro !== '' && String(bairro).toUpperCase() !== 'TODOS') {
        condicoesWhere.bairro = {
          [Op.iLike]: String(bairro).trim(),
        };
      }

      if (busca !== undefined && String(busca).trim() !== '') {
        const termo = `%${String(busca).trim()}%`;
        condicoesWhere[Op.or] = [
          { endereco_aproximado: { [Op.iLike]: termo } },
          { observacao: { [Op.iLike]: termo } },
          { bairro: { [Op.iLike]: termo } },
        ];
      }

      let order = [
        ['total_apoios', 'DESC'],
        ['created_at', 'ASC'],
      ];

      if (ordenar === 'antiguidade') {
        order = [['created_at', 'ASC']];
      } else if (ordenar === 'mais_recentes') {
        order = [['created_at', 'DESC']];
      }

      const denuncias = await Denuncia.findAll({
        where: condicoesWhere,
        include: [
          {
            model: Categoria,
            as: 'categoria',
            attributes: ['id', 'nome', 'icone', 'cor_hex'],
          },
          {
            model: Usuario,
            as: 'autor',
            attributes: ['id', 'nome', 'email', 'cpf'],
          },
        ],
        order,
      });

      return res.status(200).json(denuncias);
    } catch (err) {
      console.error('Erro em gabineteController.listarDenuncias:', err);
      return res.status(500).json({
        erro: 'Erro interno ao listar a fila de triagem do Gabinete.',
      });
    }
  },

  /**
   * PATCH /api/gabinete/denuncias/:id/status
   * Rota exclusiva do GESTOR para atualizar o status de resolução e gravar a resposta_prefeitura.
   */
  async atualizarStatus(req, res) {
    try {
      const denunciaId = Number(req.params.id);
      const { status, resposta_prefeitura } = req.body;

      if (!status) {
        return res.status(400).json({
          erro: 'O campo status é obrigatório.',
          status_permitidos: STATUS_PERMITIDOS,
        });
      }

      const statusNormalizado = String(status).trim().toUpperCase();

      if (!STATUS_PERMITIDOS.includes(statusNormalizado)) {
        return res.status(400).json({
          erro: `Status inválido. Valores permitidos: ${STATUS_PERMITIDOS.join(', ')}.`,
          status_permitidos: STATUS_PERMITIDOS,
        });
      }

      const denuncia = await Denuncia.findByPk(denunciaId);

      if (!denuncia) {
        return res.status(404).json({
          erro: 'Denúncia não encontrada.',
        });
      }

      denuncia.status = statusNormalizado;

      if (resposta_prefeitura !== undefined) {
        const respostaTexto =
          resposta_prefeitura !== null ? String(resposta_prefeitura).trim() : '';
        denuncia.resposta_prefeitura = respostaTexto !== '' ? respostaTexto : null;
      }

      await denuncia.save();

      const denunciaAtualizada = await Denuncia.findByPk(denuncia.id, {
        include: [
          {
            model: Categoria,
            as: 'categoria',
            attributes: ['id', 'nome', 'icone', 'cor_hex'],
          },
          {
            model: Usuario,
            as: 'autor',
            attributes: ['id', 'nome', 'email', 'cpf'],
          },
        ],
      });

      return res.status(200).json({
        mensagem: 'Status da denúncia atualizado com sucesso pelo Gabinete.',
        denuncia: denunciaAtualizada || denuncia,
      });
    } catch (err) {
      console.error('Erro em gabineteController.atualizarStatus:', err);
      return res.status(500).json({
        erro: 'Erro interno ao atualizar o status da denúncia.',
      });
    }
  },
};

gabineteController.STATUS_PERMITIDOS = STATUS_PERMITIDOS;

module.exports = gabineteController;
