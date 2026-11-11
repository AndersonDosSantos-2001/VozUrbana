const { Model, DataTypes } = require('sequelize');

class ApoioDenuncia extends Model {
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
        denuncia_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
      },
      {
        sequelize,
        modelName: 'ApoioDenuncia',
        tableName: 'apoios_denuncia',
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
          {
            unique: true,
            fields: ['usuario_id', 'denuncia_id'],
            name: 'idx_apoios_denuncia_usuario_denuncia_unique',
          },
        ],
      }
    );
  }

  static associate(models) {
    this.belongsTo(models.Usuario, {
      as: 'usuario',
      foreignKey: 'usuario_id',
    });

    this.belongsTo(models.Denuncia, {
      as: 'denuncia',
      foreignKey: 'denuncia_id',
    });
  }
}

module.exports = ApoioDenuncia;
