const { Router } = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = Router();

// Rotas públicas de autenticação
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/google', authController.loginGoogle);

// Rotas autenticadas
router.get('/me', authMiddleware, authController.me);
router.patch('/completar-cpf', authMiddleware, authController.completarCpf);

module.exports = router;
