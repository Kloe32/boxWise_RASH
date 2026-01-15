import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class Bookings extends Model {
  static init(sequelize, DataTypes) {
  return super.init({
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    room_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'storage_units',
        key: 'id'
      }
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    return_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    final_price: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: false,
      defaultValue: 0.00
    },
    status: {
      type: DataTypes.ENUM('PENDING','CONFIRMED','COMPLETED','CANCELLED'),
      allowNull: false,
      defaultValue: "PENDING"
    }
  }, {
    sequelize,
    tableName: 'bookings',
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
        name: "idx_bookings_user_id",
        using: "BTREE",
        fields: [
          { name: "user_id" },
        ]
      },
      {
        name: "idx_bookings_room_id",
        using: "BTREE",
        fields: [
          { name: "room_id" },
        ]
      },
      {
        name: "idx_bookings_dates",
        using: "BTREE",
        fields: [
          { name: "start_date" },
          { name: "end_date" },
        ]
      },
      {
        name: "idx_bookings_status",
        using: "BTREE",
        fields: [
          { name: "status" },
        ]
      },
    ]
  });
  }
}
