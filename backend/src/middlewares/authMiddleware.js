const jwt = require('jsonwebtoken');

/**
 * Middleware obrigatório de autenticação JWT.
 * Valida o header Authorization: Bearer <token> e injeta req.usuario = { id, perfil }.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      erro: 'Token de autenticação não fornecido.',
    });
  }

  const partes = authHeader.split(' ');

  if (partes.length !== 2) {
    return res.status(401).json({
      erro: 'Formato de token inválido.',
    });
  }

  const [esquema, token] = partes;

  if (!/^Bearer$/i.test(esquema) || !token) {
    return res.status(401).json({
      erro: 'Token malformatado. Utilize o padrão Bearer <token>.',
    });
  }

  try {
    const segredo = process.env.JWT_SECRET || 'chave_secreta_academica_voz_urbana_2026';
    const decoded = jwt.verify(token, segredo);

    req.usuario = {
      id: decoded.id,
      perfil: decoded.perfil,
    };

    return next();
  } catch (err) {
    return res.status(401).json({
      erro: 'Token inválido ou expirado.',
    });
  }
}

/**
 * Middleware opcional de autenticação JWT (usado na rota pública do Feed).
 * Se o cidadão enviar um token válido, injeta req.usuario = { id, perfil };
 * caso seja visitante anônimo ou o token esteja ausente/inválido, define req.usuario = null e segue o fluxo.
 */
function authOpcionalMiddleware(req, _res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    req.usuario = null;
    return next();
  }

  const partes = authHeader.split(' ');

  if (partes.length !== 2 || !/^Bearer$/i.test(partes[0]) || !partes[1]) {
    req.usuario = null;
    return next();
  }

  try {
    const segredo = process.env.JWT_SECRET || 'chave_secreta_academica_voz_urbana_2026';
    const decoded = jwt.verify(partes[1], segredo);

    req.usuario = {
      id: decoded.id,
      perfil: decoded.perfil,
    };
  } catch (_err) {
    req.usuario = null;
  }

  return next();
}

authMiddleware.authMiddleware = authMiddleware;
authMiddleware.authOpcionalMiddleware = authOpcionalMiddleware;

module.exports = authMiddleware;
