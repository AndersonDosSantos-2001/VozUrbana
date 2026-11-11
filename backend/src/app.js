const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const routes = require('./routes');

const app = express();

// Middlewares globais
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rota raiz informativa
app.get('/', (_req, res) => {
  return res.status(200).json({
    projeto: 'vozUrbana API',
    status: 'online',
    documentacao: '/api/health',
  });
});

// Agrupador principal de rotas (/api/*)
app.use('/api', routes);

// Tratamento para rotas inexistentes (404)
app.use((_req, res) => {
  return res.status(404).json({
    erro: 'Rota não encontrada.',
  });
});

// Middleware global de tratamento de erros
app.use((err, _req, res, _next) => {
  console.error('Erro não tratado na aplicação:', err);
  return res.status(err.status || 500).json({
    erro: err.message || 'Erro interno no servidor.',
  });
});

module.exports = app;
