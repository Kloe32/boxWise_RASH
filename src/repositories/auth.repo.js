import { db } from "../db/db.js";
import { Op } from "sequelize";

export const authRepo = {
  createUser(data) {
    return db.Users.create(data);
  },

  findUserByEmailOrPhone({ email, phone }) {
    const where = [];
    if (email) where.push({ email });
    if (phone) where.push({ phone });
    if (!where.length) return null;
    return db.Users.findOne({
      where: {
        [Op.or]: where,
      },
    });
  },

  findUserById(id) {
    return db.Users.findByPk(id, {
      attributes: { exclude: ["password_hash"] },
    });
  },

  updateUserById(id, data, option = {}) {
    return db.Users.update(data, {
      where: { id },
      ...option,
    });
  },
};
