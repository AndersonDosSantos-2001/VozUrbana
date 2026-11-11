const { Op } = require('sequelize');
const {
  sequelize,
  Sequelize,
  Denuncia,
  Categoria,
  Usuario,
  ApoioDenuncia,
} = require('../models');
const {
  converterMetrosParaKm,
  gerarLiteralHaversineKm,
  calcularDistanciaHaversineKm,
} = require('../utils/haversineSql');
const {
  uploadImagemBuffer,
  deletarImagemCloudinary,
} = require('../config/cloudinary');

/**
 * Formata uma instância de Denuncia exatamente no contrato JSON esperado pelo Front-end.
 *
 * @param {object} denuncia Instância do Model Denuncia ou objeto plano
 * @param {number|null} usuarioLogadoId ID do usuário autenticado (ou null se visitante)
 * @param {Set<number>} [idsApoiadosSet] Conjunto de IDs de denúncias apoiadas pelo usuário logado
 * @param {{ lat?: number, lng?: number }} [coordenadasRef] Coordenadas opcionais de referência
 * @returns {object}
 */
function formatarCardDenuncia(
  denuncia,
  usuarioLogadoId = null,
  idsApoiadosSet = new Set(),
  coordenadasRef = {}
) {
  const dados = typeof denuncia.toJSON === 'function' ? denuncia.toJSON() : { ...denuncia };

  const latNum = Number(dados.latitude);
  const lngNum = Number(dados.longitude);

  let distanciaKm = null;
  if (dados.distancia_km !== undefined && dados.distancia_km !== null) {
    distanciaKm = Number(Number(dados.distancia_km).toFixed(3));
  } else if (
    Number.isFinite(coordenadasRef.lat) &&
    Number.isFinite(coordenadasRef.lng) &&
    Number.isFinite(latNum) &&
    Number.isFinite(lngNum)
  ) {
    distanciaKm = Number(
      calcularDistanciaHaversineKm(
        coordenadasRef.lat,
        coordenadasRef.lng,
        latNum,
        lngNum
      ).toFixed(3)
    );
  }

  const isAutor = Boolean(usuarioLogadoId && Number(dados.usuario_id) === Number(usuarioLogadoId));
  const podeEditarExcluir = Boolean(isAutor && dados.status === 'PENDENTE');
  const apoiadoPeloUsuario = Boolean(
    usuarioLogadoId &&
      (idsApoiadosSet.has(Number(dados.id)) ||
        (Array.isArray(dados.apoios) &&
          dados.apoios.some((a) => Number(a.usuario_id) === Number(usuarioLogadoId))))
  );

  return {
    id: dados.id,
    usuario_id: dados.usuario_id,
    categoria_id: dados.categoria_id,
    observacao: dados.observacao ?? null,
    imagem_url: dados.imagem_url ?? null,
    imagem_public_id: dados.imagem_public_id ?? null,
    latitude: latNum,
    longitude: lngNum,
    endereco_aproximado: dados.endereco_aproximado,
    bairro: dados.bairro,
    status: dados.status,
    resposta_prefeitura: dados.resposta_prefeitura ?? null,
    total_apoios: Number(dados.total_apoios),
    distancia_km: distanciaKm,
    apoiado_pelo_usuario: apoiadoPeloUsuario,
    is_autor: isAutor,
    pode_editar_excluir: podeEditarExcluir,
    created_at: dados.created_at,
    updated_at: dados.updated_at,
    categoria: dados.categoria
      ? {
          id: dados.categoria.id,
          nome: dados.categoria.nome,
          icone: dados.categoria.icone,
          cor_hex: dados.categoria.cor_hex,
        }
      : null,
    autor: dados.autor
      ? {
          id: dados.autor.id,
          nome: dados.autor.nome,
        }
      : null,
  };
}

/**
 * Busca no banco o conjunto de IDs de denúncias apoiadas por um determinado usuário.
 * @param {number|null} usuarioId
 * @returns {Promise<Set<number>>}
 */
async function obterIdsApoiadosPeloUsuario(usuarioId) {
  if (!usuarioId) return new Set();

  const apoios = await ApoioDenuncia.findAll({
    where: { usuario_id: usuarioId },
    attributes: ['denuncia_id'],
    raw: true,
  });

  return new Set(apoios.map((item) => Number(item.denuncia_id)));
}

const denunciaController = {
  /**
   * 1. GET /api/denuncias/verificar-duplicidade?lat=X&lng=Y&categoria_id=Z
   * Busca denúncias ativas da mesma categoria num raio <= 40 metros (0.04 km).
   */
  async verificarDuplicidade(req, res) {
    try {
      const { lat, lng, categoria_id } = req.query;

      const latNum = Number(lat);
      const lngNum = Number(lng);
      const categoriaIdNum = Number(categoria_id);

      if (
        lat === undefined ||
        lng === undefined ||
        categoria_id === undefined ||
        !Number.isFinite(latNum) ||
        !Number.isFinite(lngNum) ||
        !Number.isInteger(categoriaIdNum)
      ) {
        return res.status(400).json({
          erro: 'Informe parâmetros válidos: lat, lng e categoria_id.',
        });
      }

      const raioMetros = Number(process.env.RAIO_DUPLICIDADE_METROS) || 40;
      const raioKm = converterMetrosParaKm(raioMetros);
      const literalDistancia = gerarLiteralHaversineKm(latNum, lngNum, 'Denuncia');

      const denunciasEncontradas = await Denuncia.findAll({
        attributes: {
          include: [[literalDistancia, 'distancia_km']],
        },
        where: {
          [Op.and]: [
            { categoria_id: categoriaIdNum },
            {
              status: {
                [Op.notIn]: ['RESOLVIDO', 'REJEITADO'],
              },
            },
            Sequelize.where(literalDistancia, {
              [Op.lte]: raioKm,
            }),
          ],
        },
        include: [
          {
            model: Categoria,
            as: 'categoria',
            attributes: ['id', 'nome', 'icone', 'cor_hex'],
          },
          {
            model: Usuario,
            as: 'autor',
            attributes: ['id', 'nome'],
          },
        ],
        order: [[literalDistancia, 'ASC']],
      });

      const usuarioLogadoId = req.usuario ? req.usuario.id : null;
      const idsApoiadosSet = await obterIdsApoiadosPeloUsuario(usuarioLogadoId);

      const denunciasProximas = denunciasEncontradas.map((denuncia) =>
        formatarCardDenuncia(denuncia, usuarioLogadoId, idsApoiadosSet, {
          lat: latNum,
          lng: lngNum,
        })
      );

      return res.status(200).json({
        possui_duplicata: denunciasProximas.length > 0,
        raio_metros: raioMetros,
        denuncias_proximas: denunciasProximas,
      });
    } catch (err) {
      console.error('Erro em denunciaController.verificarDuplicidade:', err);
      return res.status(500).json({
        erro: 'Erro interno ao verificar duplicidade de denúncias.',
      });
    }
  },

  /**
   * 2. POST /api/denuncias
   * Cria uma nova denúncia com Transaction do Sequelize e registra automaticamente o 1º apoio do autor.
   */
  async criar(req, res) {
    let uploadRealizado = null;
    let transacao = null;

    try {
      const usuarioLogado = await Usuario.findByPk(req.usuario.id);

      if (!usuarioLogado) {
        return res.status(404).json({
          erro: 'Usuário não encontrado.',
        });
      }

      // RF01: Exige que o usuário possua CPF cadastrado antes de registrar denúncia
      if (!usuarioLogado.cpf) {
        return res.status(403).json({
          erro: 'É necessário completar o cadastro do seu CPF antes de registrar uma denúncia.',
          precisa_completar_cpf: true,
        });
      }

      const {
        categoria_id,
        observacao,
        latitude,
        longitude,
        endereco_aproximado,
        bairro,
        imagem_url: imagemUrlBody,
        imagem_public_id: imagemPublicIdBody,
      } = req.body;

      const categoriaIdNum = Number(categoria_id);
      const latNum = Number(latitude);
      const lngNum = Number(longitude);
      const enderecoLimpo = endereco_aproximado ? String(endereco_aproximado).trim() : '';
      const bairroLimpo = bairro ? String(bairro).trim() : '';

      if (
        !Number.isInteger(categoriaIdNum) ||
        !Number.isFinite(latNum) ||
        !Number.isFinite(lngNum) ||
        !enderecoLimpo ||
        !bairroLimpo
      ) {
        return res.status(400).json({
          erro: 'Campos obrigatórios: categoria_id, latitude, longitude, endereco_aproximado e bairro.',
        });
      }

      const categoriaExiste = await Categoria.findByPk(categoriaIdNum);
      if (!categoriaExiste || !categoriaExiste.ativo) {
        return res.status(400).json({
          erro: 'Categoria inválida ou inativa.',
        });
      }

      let imagem_url = imagemUrlBody ? String(imagemUrlBody).trim() : null;
      let imagem_public_id = imagemPublicIdBody ? String(imagemPublicIdBody).trim() : null;

      if (req.file && req.file.buffer) {
        uploadRealizado = await uploadImagemBuffer(req.file.buffer, 'voz_urbana/denuncias');
        imagem_url = uploadRealizado.imagem_url;
        imagem_public_id = uploadRealizado.imagem_public_id;
      }

      transacao = await sequelize.transaction();

      const novaDenuncia = await Denuncia.create(
        {
          usuario_id: usuarioLogado.id,
          categoria_id: categoriaIdNum,
          observacao: observacao ? String(observacao).trim() : null,
          imagem_url,
          imagem_public_id,
          latitude: latNum,
          longitude: lngNum,
          endereco_aproximado: enderecoLimpo,
          bairro: bairroLimpo,
          status: 'PENDENTE',
          total_apoios: 1,
        },
        { transaction: transacao }
      );

      // Registra automaticamente o 1º apoio do autor na tabela apoios_denuncia
      await ApoioDenuncia.create(
        {
          usuario_id: usuarioLogado.id,
          denuncia_id: novaDenuncia.id,
        },
        { transaction: transacao }
      );

      await transacao.commit();
      transacao = null;

      const denunciaCompleta = await Denuncia.findByPk(novaDenuncia.id, {
        include: [
          {
            model: Categoria,
            as: 'categoria',
            attributes: ['id', 'nome', 'icone', 'cor_hex'],
          },
          {
            model: Usuario,
            as: 'autor',
            attributes: ['id', 'nome'],
          },
        ],
      });

      const cardFormatado = formatarCardDenuncia(
        denunciaCompleta || novaDenuncia,
        usuarioLogado.id,
        new Set([novaDenuncia.id]),
        { lat: latNum, lng: lngNum }
      );

      return res.status(201).json(cardFormatado);
    } catch (err) {
      if (transacao) {
        try {
          await transacao.rollback();
        } catch (_rbErr) {
          // Ignora erro de rollback secundário
        }
      }

      if (uploadRealizado && uploadRealizado.imagem_public_id) {
        await deletarImagemCloudinary(uploadRealizado.imagem_public_id);
      }

      console.error('Erro em denunciaController.criar:', err);
      return res.status(500).json({
        erro: 'Erro interno ao criar a denúncia.',
      });
    }
  },

  /**
   * 3. GET /api/denuncias
   * Lista o Feed Geral com filtros combináveis (lat, lng, categoria_id, bairro, status, busca) e ordenação.
   */
  async listarFeed(req, res) {
    try {
      const {
        lat,
        lng,
        categoria_id,
        bairro,
        status,
        busca,
        ordenar = 'mais_recentes',
      } = req.query;

      const latNum = lat !== undefined && lat !== '' ? Number(lat) : NaN;
      const lngNum = lng !== undefined && lng !== '' ? Number(lng) : NaN;
      const possuiCoordenadas = Number.isFinite(latNum) && Number.isFinite(lngNum);

      const condicoesWhere = {};

      if (categoria_id !== undefined && categoria_id !== '') {
        condicoesWhere.categoria_id = Number(categoria_id);
      }

      if (status !== undefined && status !== '' && status !== 'TODOS') {
        condicoesWhere.status = String(status).trim().toUpperCase();
      }

      if (bairro !== undefined && bairro !== '' && bairro !== 'TODOS') {
        condicoesWhere.bairro = {
          [Op.iLike]: String(bairro).trim(),
        };
      }

      if (busca !== undefined && String(busca).trim() !== '') {
        const termoBusca = `%${String(busca).trim()}%`;
        condicoesWhere[Op.or] = [
          { endereco_aproximado: { [Op.iLike]: termoBusca } },
          { observacao: { [Op.iLike]: termoBusca } },
          { bairro: { [Op.iLike]: termoBusca } },
        ];
      }

      const attributes = {};
      let literalDistancia = null;

      if (possuiCoordenadas) {
        literalDistancia = gerarLiteralHaversineKm(latNum, lngNum, 'Denuncia');
        attributes.include = [[literalDistancia, 'distancia_km']];
      }

      let order = [['created_at', 'DESC']];
      if (ordenar === 'menor_distancia' && literalDistancia) {
        order = [
          [literalDistancia, 'ASC'],
          ['created_at', 'DESC'],
        ];
      } else if (ordenar === 'maior_distancia' && literalDistancia) {
        order = [
          [literalDistancia, 'DESC'],
          ['created_at', 'DESC'],
        ];
      } else if (ordenar === 'mais_curtidas') {
        order = [
          ['total_apoios', 'DESC'],
          ['created_at', 'DESC'],
        ];
      }

      const denuncias = await Denuncia.findAll({
        ...(attributes.include ? { attributes } : {}),
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
            attributes: ['id', 'nome'],
          },
        ],
        order,
      });

      const usuarioLogadoId = req.usuario ? req.usuario.id : null;
      const idsApoiadosSet = await obterIdsApoiadosPeloUsuario(usuarioLogadoId);

      const resultado = denuncias.map((denuncia) =>
        formatarCardDenuncia(
          denuncia,
          usuarioLogadoId,
          idsApoiadosSet,
          possuiCoordenadas ? { lat: latNum, lng: lngNum } : {}
        )
      );

      return res.status(200).json(resultado);
    } catch (err) {
      console.error('Erro em denunciaController.listarFeed:', err);
      return res.status(500).json({
        erro: 'Erro interno ao listar o feed de denúncias.',
      });
    }
  },

  /**
   * 4. GET /api/denuncias/minhas
   * Lista todas as denúncias criadas ou apoiadas pelo usuário logado,
   * adicionando as flags is_autor e pode_editar_excluir.
   */
  async listarMinhas(req, res) {
    try {
      const meuId = Number(req.usuario.id);
      const { lat, lng } = req.query;

      const latNum = lat !== undefined && lat !== '' ? Number(lat) : NaN;
      const lngNum = lng !== undefined && lng !== '' ? Number(lng) : NaN;
      const possuiCoordenadas = Number.isFinite(latNum) && Number.isFinite(lngNum);

      const idsApoiadosSet = await obterIdsApoiadosPeloUsuario(meuId);
      const listaIdsApoiados = Array.from(idsApoiadosSet);

      const condicoesOu = [{ usuario_id: meuId }];
      if (listaIdsApoiados.length > 0) {
        condicoesOu.push({ id: { [Op.in]: listaIdsApoiados } });
      }

      const attributes = {};
      if (possuiCoordenadas) {
        const literalDistancia = gerarLiteralHaversineKm(latNum, lngNum, 'Denuncia');
        attributes.include = [[literalDistancia, 'distancia_km']];
      }

      const denuncias = await Denuncia.findAll({
        ...(attributes.include ? { attributes } : {}),
        where: {
          [Op.or]: condicoesOu,
        },
        include: [
          {
            model: Categoria,
            as: 'categoria',
            attributes: ['id', 'nome', 'icone', 'cor_hex'],
          },
          {
            model: Usuario,
            as: 'autor',
            attributes: ['id', 'nome'],
          },
        ],
        order: [['created_at', 'DESC']],
      });

      const resultado = denuncias.map((denuncia) =>
        formatarCardDenuncia(
          denuncia,
          meuId,
          idsApoiadosSet,
          possuiCoordenadas ? { lat: latNum, lng: lngNum } : {}
        )
      );

      return res.status(200).json(resultado);
    } catch (err) {
      console.error('Erro em denunciaController.listarMinhas:', err);
      return res.status(500).json({
        erro: 'Erro interno ao buscar suas denúncias.',
      });
    }
  },

  /**
   * 5A. PUT /api/denuncias/:id
   * Edita uma denúncia aplicando a trava dupla:
   * 1) Apenas o autor original (usuario_id === req.usuario.id)
   * 2) Apenas se status === 'PENDENTE'
   */
  async atualizar(req, res) {
    let novoUpload = null;

    try {
      const denunciaId = Number(req.params.id);
      const denuncia = await Denuncia.findByPk(denunciaId);

      if (!denuncia) {
        return res.status(404).json({
          erro: 'Denúncia não encontrada.',
        });
      }

      // Trava 1: Validação de Autoria (Ownership)
      if (Number(denuncia.usuario_id) !== Number(req.usuario.id)) {
        return res.status(403).json({
          erro: 'Apenas o autor original pode alterar ou excluir esta denúncia.',
        });
      }

      // Trava 2: Validação de Status (Imutabilidade Pós-Triagem)
      if (denuncia.status !== 'PENDENTE') {
        return res.status(400).json({
          erro: 'Não é possível alterar ou excluir uma denúncia que já entrou em análise pela prefeitura.',
        });
      }

      const {
        categoria_id,
        observacao,
        latitude,
        longitude,
        endereco_aproximado,
        bairro,
      } = req.body;

      if (categoria_id !== undefined) {
        const catIdNum = Number(categoria_id);
        const categoriaExiste = await Categoria.findByPk(catIdNum);
        if (!categoriaExiste || !categoriaExiste.ativo) {
          return res.status(400).json({
            erro: 'Categoria inválida ou inativa.',
          });
        }
        denuncia.categoria_id = catIdNum;
      }

      if (observacao !== undefined) {
        denuncia.observacao = observacao !== null ? String(observacao).trim() : null;
      }

      if (latitude !== undefined) {
        const latNum = Number(latitude);
        if (!Number.isFinite(latNum)) {
          return res.status(400).json({ erro: 'Latitude inválida.' });
        }
        denuncia.latitude = latNum;
      }

      if (longitude !== undefined) {
        const lngNum = Number(longitude);
        if (!Number.isFinite(lngNum)) {
          return res.status(400).json({ erro: 'Longitude inválida.' });
        }
        denuncia.longitude = lngNum;
      }

      if (endereco_aproximado !== undefined) {
        const endLimpo = String(endereco_aproximado).trim();
        if (!endLimpo) {
          return res.status(400).json({ erro: 'O endereço aproximado não pode ficar vazio.' });
        }
        denuncia.endereco_aproximado = endLimpo;
      }

      if (bairro !== undefined) {
        const bairroLimpo = String(bairro).trim();
        if (!bairroLimpo) {
          return res.status(400).json({ erro: 'O bairro não pode ficar vazio.' });
        }
        denuncia.bairro = bairroLimpo;
      }

      if (req.file && req.file.buffer) {
        const publicIdAntigo = denuncia.imagem_public_id;
        novoUpload = await uploadImagemBuffer(req.file.buffer, 'voz_urbana/denuncias');
        denuncia.imagem_url = novoUpload.imagem_url;
        denuncia.imagem_public_id = novoUpload.imagem_public_id;

        if (publicIdAntigo) {
          await deletarImagemCloudinary(publicIdAntigo);
        }
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
            attributes: ['id', 'nome'],
          },
        ],
      });

      const idsApoiadosSet = await obterIdsApoiadosPeloUsuario(req.usuario.id);

      return res.status(200).json(
        formatarCardDenuncia(denunciaAtualizada || denuncia, req.usuario.id, idsApoiadosSet)
      );
    } catch (err) {
      if (novoUpload && novoUpload.imagem_public_id) {
        await deletarImagemCloudinary(novoUpload.imagem_public_id);
      }

      console.error('Erro em denunciaController.atualizar:', err);
      return res.status(500).json({
        erro: 'Erro interno ao atualizar a denúncia.',
      });
    }
  },

  /**
   * 5B. DELETE /api/denuncias/:id
   * Exclui uma denúncia no banco e sua respectiva imagem no Cloudinary,
   * respeitando a trava dupla (apenas autor original + status === 'PENDENTE').
   */
  async excluir(req, res) {
    try {
      const denunciaId = Number(req.params.id);
      const denuncia = await Denuncia.findByPk(denunciaId);

      if (!denuncia) {
        return res.status(404).json({
          erro: 'Denúncia não encontrada.',
        });
      }

      // Trava 1: Validação de Autoria (Ownership)
      if (Number(denuncia.usuario_id) !== Number(req.usuario.id)) {
        return res.status(403).json({
          erro: 'Apenas o autor original pode alterar ou excluir esta denúncia.',
        });
      }

      // Trava 2: Validação de Status (Imutabilidade Pós-Triagem)
      if (denuncia.status !== 'PENDENTE') {
        return res.status(400).json({
          erro: 'Não é possível alterar ou excluir uma denúncia que já entrou em análise pela prefeitura.',
        });
      }

      if (denuncia.imagem_public_id) {
        await deletarImagemCloudinary(denuncia.imagem_public_id);
      }

      await denuncia.destroy();

      return res.status(200).json({
        mensagem: 'Denúncia excluída com sucesso.',
      });
    } catch (err) {
      console.error('Erro em denunciaController.excluir:', err);
      return res.status(500).json({
        erro: 'Erro interno ao excluir a denúncia.',
      });
    }
  },

  /**
   * 6. POST /api/denuncias/:id/apoiar
   * Alterna apoio (like/unlike) em transação, atualiza total_apoios e vincula a "Minhas Denúncias".
   */
  async alternarApoio(req, res) {
    let transacao = null;

    try {
      const denunciaId = Number(req.params.id);
      const usuarioId = Number(req.usuario.id);

      transacao = await sequelize.transaction();

      const denuncia = await Denuncia.findByPk(denunciaId, {
        transaction: transacao,
      });

      if (!denuncia) {
        await transacao.rollback();
        return res.status(404).json({
          erro: 'Denúncia não encontrada.',
        });
      }

      const apoioExistente = await ApoioDenuncia.findOne({
        where: {
          usuario_id: usuarioId,
          denuncia_id: denunciaId,
        },
        transaction: transacao,
      });

      const totalAnterior = Number(denuncia.total_apoios) || 0;
      let apoiado;
      let novoTotal;

      if (!apoioExistente) {
        await ApoioDenuncia.create(
          {
            usuario_id: usuarioId,
            denuncia_id: denunciaId,
          },
          { transaction: transacao }
        );

        await denuncia.increment('total_apoios', { by: 1, transaction: transacao });
        apoiado = true;
        novoTotal = totalAnterior + 1;
      } else {
        await apoioExistente.destroy({ transaction: transacao });

        if (totalAnterior > 0) {
          await denuncia.decrement('total_apoios', { by: 1, transaction: transacao });
        }
        apoiado = false;
        novoTotal = Math.max(0, totalAnterior - 1);
      }

      await transacao.commit();
      transacao = null;

      return res.status(200).json({
        apoiado,
        total_apoios: novoTotal,
      });
    } catch (err) {
      if (transacao) {
        try {
          await transacao.rollback();
        } catch (_rbErr) {
          // Ignora erro secundário de rollback
        }
      }

      console.error('Erro em denunciaController.alternarApoio:', err);
      return res.status(500).json({
        erro: 'Erro interno ao processar apoio na denúncia.',
      });
    }
  },
};

module.exports = denunciaController;
