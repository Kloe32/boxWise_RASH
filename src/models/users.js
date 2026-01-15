import _sequelize from "sequelize";
const { Model, Sequelize } = _sequelize;

export default class Users extends Model {
  static init(sequelize, DataTypes) {
    return super.init(
      {
        id: {
          autoIncrement: true,
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
        },
        full_name: {
          type: DataTypes.STRING(50),
          allowNull: false,
        },
        email: {
          type: DataTypes.STRING(50),
          allowNull: false,
          unique: "email",
        },
        phone: {
          type: DataTypes.STRING(20),
          allowNull: true,
        },
        role: {
          type: DataTypes.ENUM("ADMIN", "CUSTOMER"),
          allowNull: true,
          defaultValue: "CUSTOMER",
        },
        address: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        password_ecrypt: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
      },
      {
        sequelize,
        tableName: "users",
        timestamps: true,
        underscored: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "email",
            unique: true,
            using: "BTREE",
            fields: [{ name: "email" }],
          },
        ],
      }
    );
  }
}
