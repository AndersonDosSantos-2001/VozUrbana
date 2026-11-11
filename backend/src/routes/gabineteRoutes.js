const { Router } = require('express');
const gabineteController = require('../controllers/gabineteController');
const authMiddleware = require('../middlewares/authMiddleware');
const gestorMiddleware = require('../middlewares/gestorMiddleware');

const router = Router();

// Todas as rotas do Gabinete exigem autenticação JWT válida + perfil === 'GESTOR'
router.use(authMiddleware, gestorMiddleware);

// Fila de triagem de denúncias (/api/gabinete/denuncias)
router.get('/denuncias', gabineteController.listarDenuncias);

// Atualização de status e resposta oficial da prefeitura (/api/gabinete/denuncias/:id/status)
router.patch('/denuncias/:id/status', gabineteController.atualizarStatus);

module.exports = router;
