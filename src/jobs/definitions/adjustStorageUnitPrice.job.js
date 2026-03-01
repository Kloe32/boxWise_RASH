import { sequelize } from "../../db/sequelize.js";
import { calculateUnitPrice } from "../../pricing/pricing.engine.js";
import { supplyMultiplier } from "../../utils/helper.js";
import { seasonalPricingRepo } from "../../repositories/seasonalPricing.repo.js";
import { storageUnitRepo } from "../../repositories/storage_unit.repo.js";
import { unitTypeRepo } from "../../repositories/unitType.repo.js";

export async function adjustStorageUnitPrice() {
  const now = new Date();
  const monthLabel = now.toLocaleString("en-US", { month: "long" });

  return sequelize.transaction(async (transaction) => {
    const [unitTypes, unitCounts, occupiedCounts] = await Promise.all([
      unitTypeRepo.getAllTypes({}, { transaction }),
      storageUnitRepo.getUnitCountsByType({ transaction }),
      storageUnitRepo.getCurrentOccupiedCountsByType({ transaction }),
    ]);

    let updatedTypes = 0;

    for (const unitType of unitTypes) {
      const seasonalRow = await seasonalPricingRepo.getMultiplierById(
        unitType.id,
        monthLabel,
        { transaction },
      );
      const seasonalFactor = Number(seasonalRow?.multiplier ?? 1);

      const totalUnits = unitCounts.get(unitType.id) ?? 0;
      const occupiedUnits = occupiedCounts.get(unitType.id) ?? 0;
      const occRate = totalUnits === 0 ? 0 : occupiedUnits / totalUnits;
      const supplyFactor = supplyMultiplier(occRate).multiplier;

      const nextUnitPrice = calculateUnitPrice({
        basePrice: Number(unitType.base_price ?? 0),
        seasonalMultiplier: seasonalFactor,
        supplyMultiplier: supplyFactor,
      });
      const currentUnitPrice = Number(unitType.adjusted_price ?? 0);

      // If occupancy (and other factors) produce the same price, skip update.
      if (nextUnitPrice === currentUnitPrice) {
        continue;
      }

      const [affected] = await unitTypeRepo.updateTypeById(
        unitType.id,
        { adjusted_price: nextUnitPrice },
        { transaction },
      );

      if (affected > 0) {
        updatedTypes += 1;
      }
    }
    return {
      month: monthLabel,
      updatedTypes,
    };
  });
}
