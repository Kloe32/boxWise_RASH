import _sequelize from "sequelize";
const DataTypes = _sequelize.DataTypes;
import _Bookings from  "./bookings.js";
import _Payments from  "./payments.js";
import _SeasonalPricing from  "./seasonalPricing.js";
import _StorageUnits from  "./storageUnits.js";
import _UnitTypes from  "./unitTypes.js";
import _Users from  "./users.js";

export default function initModels(sequelize) {
  const Bookings = _Bookings.init(sequelize, DataTypes);
  const Payments = _Payments.init(sequelize, DataTypes);
  const SeasonalPricing = _SeasonalPricing.init(sequelize, DataTypes);
  const StorageUnits = _StorageUnits.init(sequelize, DataTypes);
  const UnitTypes = _UnitTypes.init(sequelize, DataTypes);
  const Users = _Users.init(sequelize, DataTypes);

  Payments.belongsTo(Bookings, { as: "booking", foreignKey: "booking_id"});
  Bookings.hasMany(Payments, { as: "payments", foreignKey: "booking_id"});
  Bookings.belongsTo(StorageUnits, { as: "unit", foreignKey: "unit_id"});
  StorageUnits.hasMany(Bookings, { as: "bookings", foreignKey: "unit_id"});
  SeasonalPricing.belongsTo(UnitTypes, { as: "type", foreignKey: "type_id"});
  UnitTypes.hasMany(SeasonalPricing, { as: "seasonal_pricings", foreignKey: "type_id"});
  StorageUnits.belongsTo(UnitTypes, { as: "type", foreignKey: "type_id"});
  UnitTypes.hasMany(StorageUnits, { as: "storage_units", foreignKey: "type_id"});
  Bookings.belongsTo(Users, { as: "user", foreignKey: "user_id"});
  Users.hasMany(Bookings, { as: "bookings", foreignKey: "user_id"});

  return {
    Bookings,
    Payments,
    SeasonalPricing,
    StorageUnits,
    UnitTypes,
    Users,
  };
}
