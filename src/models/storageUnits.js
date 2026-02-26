import _sequelize from "sequelize";
const { Model, Sequelize } = _sequelize;

export default class StorageUnits extends Model {
  static init(sequelize, DataTypes) {
    return super.init(
      {
        id: {
          autoIncrement: true,
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
        },
        unit_number: {
          type: DataTypes.STRING(10),
          allowNull: false,
        },
        status: {
          type: DataTypes.ENUM(
            "AVAILABLE",
            "RESERVED",
            "OCCUPIED",
            "MAINTENANCE",
          ),
          allowNull: false,
        },
        is_active: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          defaultValue: 1,
        },
        type_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: "unit_types",
            key: "id",
          },
        },
      },
      {
        sequelize,
        tableName: "storage_units",
        timestamps: true,
        underscored: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "fk_unit_type",
            using: "BTREE",
            fields: [{ name: "type_id" }],
          },
        ],
      },
    );
  }
}
