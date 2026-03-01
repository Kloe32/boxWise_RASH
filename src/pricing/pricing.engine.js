import { env } from "../config/env.js";
export function calculateUnitPrice({
  basePrice,
  seasonalMultiplier,
  supplyMultiplier,
}) {
  const raw = basePrice * seasonalMultiplier * supplyMultiplier;
  return Number(raw.toFixed(2));
}

export function calculateFinalPrice(unitPrice, durationMonths) {
  const duration = Math.max(durationMonths, 0);
  const adminFee = Number(env.ADMIN_FEE || 0);
  const gstRate = Number(env.GST_RATE || 0);

  const prepaidMonths = duration > 0 ? 1 : 0;
  const recurringMonths = Math.max(duration - prepaidMonths, 0);

  const subtotal = unitPrice * duration;
  const gst = Number((subtotal * gstRate).toFixed(2));
  const total = Number((subtotal + gst + adminFee).toFixed(2));

  const initialPayment = unitPrice * prepaidMonths + adminFee + gst;

  const monthlyCharge = Number(unitPrice).toFixed(2);

  return {
    subtotal: Number(subtotal.toFixed(2)),
    gst_rate: `${gstRate * 100}%`,
    gst,
    total,
    adminFee,
    breakdown: {
      initial_payment: initialPayment.toFixed(2),
      recurring_months: recurringMonths,
      monthly_charge: monthlyCharge,
    },
  };
}

//calculate early return
