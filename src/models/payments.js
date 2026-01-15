import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class Payments extends Model {
  static init(sequelize, DataTypes) {
  return super.init({
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    booking_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'bookings',
        key: 'id'
      }
    },
    method_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'payment_methods',
        key: 'id'
      }
    },
    amount: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('Deposit','Rental','EarlyReturn'),
      allowNull: false
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    payment_status: {
      type: DataTypes.ENUM('Pending','Paid','Failed'),
      allowNull: false,
      defaultValue: "Pending"
    }
  }, {
    sequelize,
    tableName: 'payments',
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "idx_payments_booking_id",
        using: "BTREE",
        fields: [
          { name: "booking_id" },
        ]
      },
      {
        name: "idx_payments_method_id",
        using: "BTREE",
        fields: [
          { name: "method_id" },
        ]
      },
    ]
  });
  }
}
