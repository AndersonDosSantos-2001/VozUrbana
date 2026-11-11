const Sequelize = require('sequelize');
const databaseConfig = require('../config/database');

const Usuario = require('./Usuario');
const Categoria = require('./Categoria');
const Denuncia = require('./Denuncia');
const ApoioDenuncia = require('./ApoioDenuncia');

const env = process.env.NODE_ENV || 'development';
const config = databaseConfig[env] || databaseConfig;

const databaseUrl =
  (config.use_env_variable && process.env[config.use_env_variable]) ||
  config.url ||
  'postgresql://postgres:postgres@localhost:5432/voz_urbana';

const sequelize = new Sequelize(databaseUrl, config);

const models = {
  Usuario: Usuario.init(sequelize),
  Categoria: Categoria.init(sequelize),
  Denuncia: Denuncia.init(sequelize),
  ApoioDenuncia: ApoioDenuncia.init(sequelize),
};

Object.values(models)
  .filter((model) => typeof model.associate === 'function')
  .forEach((model) => model.associate(models));

module.exports = {
  sequelize,
  Sequelize,
  ...models,
};
