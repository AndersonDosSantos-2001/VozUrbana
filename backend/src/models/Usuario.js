const { Model, DataTypes } = require('sequelize');

class Usuario extends Model {
  static init(sequelize) {
    return super.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        nome: {
          type: DataTypes.STRING(120),
          allowNull: false,
        },
        email: {
          type: DataTypes.STRING(150),
          allowNull: false,
          unique: true,
          validate: {
            isEmail: true,
          },
        },
        cpf: {
          type: DataTypes.STRING(14),
          allowNull: true,
          unique: true,
        },
        senha_hash: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        google_id: {
          type: DataTypes.STRING(100),
          allowNull: true,
          unique: true,
        },
        perfil: {
          type: DataTypes.ENUM('CIDADAO', 'GESTOR'),
          allowNull: false,
          defaultValue: 'CIDADAO',
        },
      },
      {
        sequelize,
        modelName: 'Usuario',
        tableName: 'usuarios',
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      }
    );
  }

  static associate(models) {
    this.hasMany(models.Denuncia, {
      as: 'denunciasCriadas',
      foreignKey: 'usuario_id',
    });

    this.belongsToMany(models.Denuncia, {
      through: models.ApoioDenuncia,
      as: 'denunciasApoiadas',
      foreignKey: 'usuario_id',
      otherKey: 'denuncia_id',
    });

    this.hasMany(models.ApoioDenuncia, {
      as: 'apoios',
      foreignKey: 'usuario_id',
    });
  }

  toJSON() {
    const valores = { ...this.get() };
    delete valores.senha_hash;
    return valores;
  }
}

module.exports = Usuario;
