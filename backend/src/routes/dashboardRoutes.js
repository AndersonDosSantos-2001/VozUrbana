const { Router } = require('express');
const dashboardController = require('../controllers/dashboardController');

const router = Router();

// Rota pública de estatísticas agregadas para gráficos de Pizza e Colunas (/api/dashboard/estatisticas)
router.get('/estatisticas', dashboardController.obterEstatisticas);

// Rota pública auxiliar com lista de bairros para filtros (/api/dashboard/bairros)
router.get('/bairros', dashboardController.listarBairros);

module.exports = router;
