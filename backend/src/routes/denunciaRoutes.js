const { Router } = require('express');
const denunciaController = require('../controllers/denunciaController');
const authMiddleware = require('../middlewares/authMiddleware');
const { authOpcionalMiddleware } = require('../middlewares/authMiddleware');
const { upload } = require('../config/cloudinary');

const router = Router();

/**
 * Middleware auxiliar para capturar erros de upload do Multer (ex: arquivo > 5MB ou formato inválido)
 * e retornar 400 Bad Request em JSON.
 */
function uploadImagemOpcional(req, res, next) {
  const middlewareSingle = upload.single('imagem');
  middlewareSingle(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        erro: err.message || 'Erro no envio da imagem.',
      });
    }
    return next();
  });
}

// 1. Verificação de duplicidade em raio de 40m (rota estática antes de /:id)
router.get('/verificar-duplicidade', authMiddleware, denunciaController.verificarDuplicidade);

// 2. Listagem de "Minhas Denúncias" - Criadas + Apoiadas (rota estática antes de /:id)
router.get('/minhas', authMiddleware, denunciaController.listarMinhas);

// 3. Feed Geral de Denúncias (Público ou Autenticado com flag apoiado_pelo_usuario)
router.get('/', authOpcionalMiddleware, denunciaController.listarFeed);

// 4. Criação de nova denúncia (com upload opcional de imagem e 1º apoio transacional)
router.post('/', authMiddleware, uploadImagemOpcional, denunciaController.criar);

// 5. Toggle de apoio / curtida em denúncia existente
router.post('/:id/apoiar', authMiddleware, denunciaController.alternarApoio);

// 6. Edição e Exclusão de denúncia (com trava dupla: apenas Autor + status PENDENTE)
router.put('/:id', authMiddleware, uploadImagemOpcional, denunciaController.atualizar);
router.delete('/:id', authMiddleware, denunciaController.excluir);

module.exports = router;
