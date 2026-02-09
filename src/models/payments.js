import _sequelize from "sequelize";
const { Model, Sequelize } = _sequelize;

export default class Payments extends Model {
  static init(sequelize, DataTypes) {
    return super.init(
      {
        id: {
          autoIncrement: true,
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
        },
        booking_id: {
          type: DataTypes.STRING(20),
          allowNull: false,
          references: {
            model: "bookings",
            key: "id",
          },
        },
        amount: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
        },
        description: {
          type: DataTypes.STRING(30),
          allowNull: true,
        },
        due_date: {
          type: DataTypes.DATEONLY,
          allowNull: false,
        },
        paid_date: {
          type: DataTypes.DATEONLY,
          allowNull: true,
        },
        payment_status: {
          type: DataTypes.ENUM("PENDING", "PAID", "OVERDUE", "FAILED"),
          allowNull: true,
        },
        payment_proof: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        payment_method: {
          type: DataTypes.STRING(20),
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: "payments",
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
            name: "idx_payments_booking_id",
            using: "BTREE",
            fields: [{ name: "booking_id" }],
          },
        ],
      },
    );
  }
}
