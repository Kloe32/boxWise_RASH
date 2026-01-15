import _sequelize from "sequelize";
const { Model, Sequelize } = _sequelize;

export default class PaymentMethods extends Model {
  static init(sequelize, DataTypes) {
    return super.init(
      {
        id: {
          autoIncrement: true,
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
        },
        method_name: {
          type: DataTypes.STRING(50),
          allowNull: false,
          unique: "method_name",
        },
        is_active: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: 1,
        },
      },
      {
        sequelize,
        tableName: "payment_methods",
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
            name: "method_name",
            unique: true,
            using: "BTREE",
            fields: [{ name: "method_name" }],
          },
        ],
      }
    );
  }
}
