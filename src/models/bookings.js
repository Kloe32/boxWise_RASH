import _sequelize from "sequelize";
const { Model, Sequelize } = _sequelize;

export default class Bookings extends Model {
  static init(sequelize, DataTypes) {
    return super.init(
      {
        id: {
          type: DataTypes.STRING(20),
          allowNull: false,
          primaryKey: true,
        },
        user_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: "users",
            key: "id",
          },
        },
        unit_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: "storage_units",
            key: "id",
          },
        },
        start_date: {
          type: DataTypes.DATEONLY,
          allowNull: false,
        },
        end_date: {
          type: DataTypes.DATEONLY,
          allowNull: false,
        },
        return_date: {
          type: DataTypes.DATEONLY,
          allowNull: true,
        },
        final_price: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0.0,
        },
        status: {
          type: DataTypes.ENUM(
            "PENDING",
            "CONFIRMED",
            "CANCELLED",
            "RENEWED",
            "ENDED",
          ),
          allowNull: true,
        },
        is_vacated: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          defaultValue: false,
        },
      },
      {
        sequelize,
        tableName: "bookings",
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
            name: "idx_bookings_user_id",
            using: "BTREE",
            fields: [{ name: "user_id" }],
          },
          {
            name: "idx_bookings_room_id",
            using: "BTREE",
            fields: [{ name: "unit_id" }],
          },
          {
            name: "idx_bookings_dates",
            using: "BTREE",
            fields: [{ name: "start_date" }, { name: "end_date" }],
          },
          {
            name: "idx_bookings_status",
            using: "BTREE",
            fields: [{ name: "status" }],
          },
        ],
      },
    );
  }
}
