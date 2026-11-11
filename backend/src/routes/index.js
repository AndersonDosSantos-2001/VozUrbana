const { Router } = require('express');
const authRoutes = require('./authRoutes');
const denunciaRoutes = require('./denunciaRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const gabineteRoutes = require('./gabineteRoutes');
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const { Categoria } = require('../models');

const router = Router();

// Rota de verificação de saúde da API
router.get('/health', (_req, res) => {
  return res.status(200).json({
    status: 'ok',
    servico: 'vozUrbana API',
    timestamp: new Date().toISOString(),
  });
});

// Rotas de autenticação (/api/auth/*)
router.use('/auth', authRoutes);

// Rota de complemento de CPF (/api/usuarios/completar-cpf)
router.patch('/usuarios/completar-cpf', authMiddleware, authController.completarCpf);

// Rotas de denúncias (/api/denuncias/*)
router.use('/denuncias', denunciaRoutes);

// Rotas do Dashboard público de gráficos (/api/dashboard/*)
router.use('/dashboard', dashboardRoutes);

// Rotas restritas ao Gabinete da Prefeitura - Perfil GESTOR (/api/gabinete/*)
router.use('/gabinete', gabineteRoutes);

// Rota pública de categorias ativas (/api/categorias)
router.get('/categorias', async (_req, res) => {
  try {
    const categorias = await Categoria.findAll({
      where: { ativo: true },
      attributes: ['id', 'nome', 'icone', 'cor_hex', 'ativo'],
      order: [['id', 'ASC']],
    });
    return res.status(200).json(categorias);
  } catch (err) {
    console.error('Erro ao listar categorias:', err);
    return res.status(500).json({
      erro: 'Erro interno ao listar categorias.',
    });
  }
});

module.exports = router;
