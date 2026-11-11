const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { Op } = require('sequelize');
const { Usuario } = require('../models');
const {
  validarCpf,
  formatarCpfPadrao,
  formatarCpfMascara,
} = require('../utils/validadorCpf');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Gera o token JWT assinado contendo id e perfil do usuário.
 * @param {object} usuario
 * @returns {string}
 */
function gerarTokenJwt(usuario) {
  const segredo = process.env.JWT_SECRET || 'chave_secreta_academica_voz_urbana_2026';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign(
    {
      id: usuario.id,
      perfil: usuario.perfil,
    },
    segredo,
    { expiresIn }
  );
}

const authController = {
  /**
   * POST /api/auth/register
   * Cadastro tradicional de cidadão (Prevenção contra Mass Assignment: força perfil = 'CIDADAO').
   */
  async register(req, res) {
    try {
      // Desestrutura apenas os campos permitidos (ignora qualquer campo 'perfil' enviado no body)
      const { nome, email, cpf, senha } = req.body;

      if (!nome || !email || !cpf || !senha) {
        return res.status(400).json({
          erro: 'Preencha todos os campos obrigatórios: nome, email, cpf e senha.',
        });
      }

      const nomeLimpo = String(nome).trim();
      const emailLimpo = String(email).trim().toLowerCase();
      const senhaTexto = String(senha);

      if (nomeLimpo.length < 3) {
        return res.status(400).json({
          erro: 'O nome deve ter pelo menos 3 caracteres.',
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailLimpo)) {
        return res.status(400).json({
          erro: 'Formato de e-mail inválido.',
        });
      }

      if (senhaTexto.length < 6) {
        return res.status(400).json({
          erro: 'A senha deve possuir no mínimo 6 caracteres.',
        });
      }

      if (!validarCpf(cpf)) {
        return res.status(400).json({
          erro: 'CPF inválido.',
        });
      }

      const cpfPadrao = formatarCpfPadrao(cpf);
      const cpfMascara = formatarCpfMascara(cpf);

      const usuarioExistente = await Usuario.findOne({
        where: {
          [Op.or]: [
            { email: emailLimpo },
            { cpf: { [Op.in]: [cpfPadrao, cpfMascara] } },
          ],
        },
      });

      if (usuarioExistente) {
        const conflitoEmail = usuarioExistente.email === emailLimpo;
        return res.status(409).json({
          erro: conflitoEmail
            ? 'Este e-mail já está cadastrado no sistema.'
            : 'Este CPF já está cadastrado no sistema.',
        });
      }

      const senha_hash = await bcrypt.hash(senhaTexto, 10);

      // RF04: Força sempre perfil = 'CIDADAO'
      const novoUsuario = await Usuario.create({
        nome: nomeLimpo,
        email: emailLimpo,
        cpf: cpfPadrao,
        senha_hash,
        perfil: 'CIDADAO',
      });

      const token = gerarTokenJwt(novoUsuario);

      return res.status(201).json({
        token,
        usuario: novoUsuario.toJSON(),
        precisa_completar_cpf: false,
      });
    } catch (err) {
      console.error('Erro em authController.register:', err);
      return res.status(500).json({
        erro: 'Erro interno ao realizar o cadastro.',
      });
    }
  },

  /**
   * POST /api/auth/login
   * Autenticação por E-mail ou CPF + Senha.
   */
  async login(req, res) {
    try {
      const { email, cpf, login, identificador, senha } = req.body;
      const credencial = identificador || login || email || cpf;

      if (!credencial || !senha) {
        return res.status(400).json({
          erro: 'Informe seu e-mail ou CPF e a senha.',
        });
      }

      const credencialTexto = String(credencial).trim();
      let condicaoBusca;

      if (credencialTexto.includes('@')) {
        condicaoBusca = { email: credencialTexto.toLowerCase() };
      } else {
        const cpfPadrao = formatarCpfPadrao(credencialTexto);
        const cpfMascara = formatarCpfMascara(credencialTexto);
        condicaoBusca = {
          cpf: {
            [Op.in]: [cpfPadrao, cpfMascara, credencialTexto],
          },
        };
      }

      const usuario = await Usuario.findOne({ where: condicaoBusca });

      if (!usuario) {
        return res.status(401).json({
          erro: 'E-mail/CPF ou senha inválidos.',
        });
      }

      if (!usuario.senha_hash) {
        return res.status(401).json({
          erro: 'Esta conta foi criada via Google. Utilize o botão Entrar com Google.',
        });
      }

      const senhaValida = await bcrypt.compare(String(senha), usuario.senha_hash);

      if (!senhaValida) {
        return res.status(401).json({
          erro: 'E-mail/CPF ou senha inválidos.',
        });
      }

      const token = gerarTokenJwt(usuario);

      return res.status(200).json({
        token,
        usuario: usuario.toJSON(),
        precisa_completar_cpf: !usuario.cpf,
      });
    } catch (err) {
      console.error('Erro em authController.login:', err);
      return res.status(500).json({
        erro: 'Erro interno ao realizar o login.',
      });
    }
  },

  /**
   * POST /api/auth/google
   * Login ou Cadastro automático via Google OAuth2 (idToken).
   */
  async loginGoogle(req, res) {
    try {
      const idToken = req.body.idToken || req.body.credential || req.body.token;

      if (!idToken) {
        return res.status(400).json({
          erro: 'Token de autenticação do Google (idToken) não fornecido.',
        });
      }

      let payload;
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: String(idToken),
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        payload = ticket.getPayload();
      } catch (_verifyErr) {
        return res.status(401).json({
          erro: 'Token do Google inválido ou expirado.',
        });
      }

      if (!payload || !payload.email || !payload.sub) {
        return res.status(400).json({
          erro: 'Não foi possível obter os dados de perfil da conta Google.',
        });
      }

      const google_id = String(payload.sub);
      const emailLimpo = String(payload.email).trim().toLowerCase();
      const nomeGoogle = payload.name ? String(payload.name).trim() : emailLimpo.split('@')[0];

      let usuario = await Usuario.findOne({
        where: {
          [Op.or]: [{ google_id }, { email: emailLimpo }],
        },
      });

      if (!usuario) {
        // RF04: Conta criada via Google sempre inicia com perfil = 'CIDADAO'
        usuario = await Usuario.create({
          nome: nomeGoogle,
          email: emailLimpo,
          google_id,
          cpf: null,
          senha_hash: null,
          perfil: 'CIDADAO',
        });
      } else if (!usuario.google_id) {
        usuario.google_id = google_id;
        await usuario.save();
      }

      const token = gerarTokenJwt(usuario);

      return res.status(200).json({
        token,
        usuario: usuario.toJSON(),
        precisa_completar_cpf: !usuario.cpf,
      });
    } catch (err) {
      console.error('Erro em authController.loginGoogle:', err);
      return res.status(500).json({
        erro: 'Erro interno ao autenticar com o Google.',
      });
    }
  },

  /**
   * PATCH /api/usuarios/completar-cpf
   * Salva o CPF de um usuário logado (especialmente contas criadas via Google antes da 1ª denúncia).
   */
  async completarCpf(req, res) {
    try {
      const { cpf } = req.body;

      if (!cpf) {
        return res.status(400).json({
          erro: 'O CPF é obrigatório.',
        });
      }

      if (!validarCpf(cpf)) {
        return res.status(400).json({
          erro: 'CPF inválido.',
        });
      }

      const usuario = await Usuario.findByPk(req.usuario.id);

      if (!usuario) {
        return res.status(404).json({
          erro: 'Usuário não encontrado.',
        });
      }

      const cpfPadrao = formatarCpfPadrao(cpf);
      const cpfMascara = formatarCpfMascara(cpf);

      const cpfEmUso = await Usuario.findOne({
        where: {
          cpf: { [Op.in]: [cpfPadrao, cpfMascara] },
          id: { [Op.ne]: usuario.id },
        },
      });

      if (cpfEmUso) {
        return res.status(409).json({
          erro: 'Este CPF já está vinculado a outro usuário.',
        });
      }

      usuario.cpf = cpfPadrao;
      await usuario.save();

      return res.status(200).json({
        mensagem: 'CPF cadastrado com sucesso.',
        usuario: usuario.toJSON(),
        precisa_completar_cpf: false,
      });
    } catch (err) {
      console.error('Erro em authController.completarCpf:', err);
      return res.status(500).json({
        erro: 'Erro interno ao salvar o CPF.',
      });
    }
  },

  /**
   * GET /api/auth/me
   * Retorna os dados atualizados do usuário autenticado.
   */
  async me(req, res) {
    try {
      const usuario = await Usuario.findByPk(req.usuario.id);

      if (!usuario) {
        return res.status(404).json({
          erro: 'Usuário não encontrado.',
        });
      }

      return res.status(200).json({
        usuario: usuario.toJSON(),
        precisa_completar_cpf: !usuario.cpf,
      });
    } catch (err) {
      console.error('Erro em authController.me:', err);
      return res.status(500).json({
        erro: 'Erro interno ao buscar perfil do usuário.',
      });
    }
  },
};

module.exports = authController;
