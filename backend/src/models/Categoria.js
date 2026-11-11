const { Model, DataTypes } = require('sequelize');

class Categoria extends Model {
  static init(sequelize) {
    return super.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        nome: {
          type: DataTypes.STRING(80),
          allowNull: false,
        },
        icone: {
          type: DataTypes.STRING(50),
          allowNull: false,
        },
        cor_hex: {
          type: DataTypes.STRING(7),
          allowNull: false,
        },
        ativo: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
      },
      {
        sequelize,
        modelName: 'Categoria',
        tableName: 'categorias',
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      }
    );
  }

  static associate(models) {
    this.hasMany(models.Denuncia, {
      as: 'denuncias',
      foreignKey: 'categoria_id',
    });
  }
}

module.exports = Categoria;
