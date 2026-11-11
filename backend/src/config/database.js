const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

const isSslAtivo = process.env.DB_SSL === 'true';

if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(/^url:\s*/i, '').trim();
}

const baseConfig = {
  url: process.env.DATABASE_URL,
  use_env_variable: 'DATABASE_URL',
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  dialectOptions: isSslAtivo
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      }
    : {},
  define: {
    timestamps: true,
    underscored: true,
    underscoredAll: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
};

module.exports = {
  ...baseConfig,
  development: {
    ...baseConfig,
  },
  test: {
    ...baseConfig,
    logging: false,
  },
  production: {
    ...baseConfig,
    logging: false,
    dialectOptions:
      process.env.DB_SSL === 'false'
        ? {}
        : {
            ssl: {
              require: true,
              rejectUnauthorized: false,
            },
          },
  },
};
