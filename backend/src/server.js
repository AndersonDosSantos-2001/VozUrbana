const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const app = require('./app');
const { sequelize } = require('./models');

const PORT = Number(process.env.PORT) || 3333;

async function iniciarServidor() {
  try {
    if (
      process.env.DATABASE_URL &&
      !process.env.DATABASE_URL.includes('[SUA_SENHA]') &&
      !process.env.DATABASE_URL.includes('[SEU_PROJETO]')
    ) {
      await sequelize.authenticate();
      console.log('[Banco de Dados] Conexão com o PostgreSQL (Supabase) estabelecida com sucesso.');
    } else {
      console.warn(
        '[Banco de Dados] Aviso: DATABASE_URL ainda não configurada com credenciais reais no arquivo .env.'
      );
    }
  } catch (err) {
    console.error('[Banco de Dados] Falha ao conectar ao PostgreSQL:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`[Servidor] vozUrbana API rodando na porta ${PORT} (http://localhost:${PORT})`);
  });
}

iniciarServidor();
