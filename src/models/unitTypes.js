import _sequelize from "sequelize";
const { Model, Sequelize } = _sequelize;

export default class UnitTypes extends Model {
  static init(sequelize, DataTypes) {
    return super.init(
      {
        id: {
          autoIncrement: true,
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
        },
        type_name: {
          type: DataTypes.STRING(50),
          allowNull: false,
        },
        sqft: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: true,
        },
        base_price: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true,
        },
        adjusted_price: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true,
        },
        dimensions: {
          type: DataTypes.STRING(20),
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: "unit_types",
        timestamps: true,
        underscored: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
        ],
      },
    );
  }
}
