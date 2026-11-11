'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('usuarios', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      nome: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING(150),
        unique: true,
        allowNull: false,
      },
      cpf: {
        type: Sequelize.STRING(14),
        unique: true,
        allowNull: true,
      },
      senha_hash: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      google_id: {
        type: Sequelize.STRING(100),
        unique: true,
        allowNull: true,
      },
      perfil: {
        type: Sequelize.ENUM('CIDADAO', 'GESTOR'),
        defaultValue: 'CIDADAO',
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('usuarios');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_usuarios_perfil";');
  },
};
