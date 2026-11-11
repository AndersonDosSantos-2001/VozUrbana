/**
 * Middleware de controle de acesso baseado em função (RBAC).
 * Deve ser executado sempre após o authMiddleware.
 * Garante que apenas usuários com perfil === 'GESTOR' acessem as rotas do Gabinete.
 */
function gestorMiddleware(req, res, next) {
  if (!req.usuario) {
    return res.status(401).json({
      erro: 'Usuário não autenticado.',
    });
  }

  if (req.usuario.perfil !== 'GESTOR') {
    return res.status(403).json({
      erro: 'Acesso restrito ao Gabinete da Prefeitura.',
    });
  }

  return next();
}

gestorMiddleware.gestorMiddleware = gestorMiddleware;
gestorMiddleware.verificarGestor = gestorMiddleware;

module.exports = gestorMiddleware;
