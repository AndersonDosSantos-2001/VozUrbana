'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('denuncias', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      usuario_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'usuarios',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      categoria_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'categorias',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      observacao: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      imagem_url: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      imagem_public_id: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },
      latitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: false,
      },
      longitude: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: false,
      },
      endereco_aproximado: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      bairro: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('PENDENTE', 'EM_ANALISE', 'EM_ANDAMENTO', 'RESOLVIDO', 'REJEITADO'),
        defaultValue: 'PENDENTE',
        allowNull: false,
      },
      resposta_prefeitura: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      total_apoios: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
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

    await queryInterface.addIndex('denuncias', ['categoria_id', 'status'], {
      name: 'idx_denuncias_categoria_status',
    });

    await queryInterface.addIndex('denuncias', ['bairro'], {
      name: 'idx_denuncias_bairro',
    });

    await queryInterface.addIndex('denuncias', [{ name: 'total_apoios', order: 'DESC' }], {
      name: 'idx_denuncias_total_apoios',
    });

    await queryInterface.addIndex('denuncias', [{ name: 'created_at', order: 'DESC' }], {
      name: 'idx_denuncias_created_at',
    });

    await queryInterface.addIndex('denuncias', ['latitude', 'longitude'], {
      name: 'idx_denuncias_coordenadas',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('denuncias');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_denuncias_status";');
  },
};
