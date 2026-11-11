const { Model, DataTypes } = require('sequelize');

class Denuncia extends Model {
  static init(sequelize) {
    return super.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        usuario_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        categoria_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        observacao: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        imagem_url: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        imagem_public_id: {
          type: DataTypes.STRING(150),
          allowNull: true,
        },
        latitude: {
          type: DataTypes.DECIMAL(10, 8),
          allowNull: false,
          get() {
            const valor = this.getDataValue('latitude');
            return valor === null || valor === undefined ? null : Number(valor);
          },
        },
        longitude: {
          type: DataTypes.DECIMAL(11, 8),
          allowNull: false,
          get() {
            const valor = this.getDataValue('longitude');
            return valor === null || valor === undefined ? null : Number(valor);
          },
        },
        endereco_aproximado: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        bairro: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        status: {
          type: DataTypes.ENUM('PENDENTE', 'EM_ANALISE', 'EM_ANDAMENTO', 'RESOLVIDO', 'REJEITADO'),
          allowNull: false,
          defaultValue: 'PENDENTE',
        },
        resposta_prefeitura: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        total_apoios: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 1,
        },
      },
      {
        sequelize,
        modelName: 'Denuncia',
        tableName: 'denuncias',
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      }
    );
  }

  static associate(models) {
    this.belongsTo(models.Usuario, {
      as: 'autor',
      foreignKey: 'usuario_id',
    });

    this.belongsTo(models.Categoria, {
      as: 'categoria',
      foreignKey: 'categoria_id',
    });

    this.belongsToMany(models.Usuario, {
      through: models.ApoioDenuncia,
      as: 'apoiadores',
      foreignKey: 'denuncia_id',
      otherKey: 'usuario_id',
    });

    this.hasMany(models.ApoioDenuncia, {
      as: 'apoios',
      foreignKey: 'denuncia_id',
    });
  }
}

module.exports = Denuncia;
