import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class SeasonalPricing extends Model {
  static init(sequelize, DataTypes) {
  return super.init({
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    year_reference: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: "uq_month_year"
    },
    multiplier: {
      type: DataTypes.DECIMAL(3,2),
      allowNull: false
    },
    demand_label: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    type_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'unit_types',
        key: 'id'
      }
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'seasonal_pricing',
    timestamps: true,
    underscored: true,
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
        name: "uq_month_year",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "year_reference" },
        ]
      },
      {
        name: "fk_type_pricing",
        using: "BTREE",
        fields: [
          { name: "type_id" },
        ]
      },
    ]
  });
  }
}
