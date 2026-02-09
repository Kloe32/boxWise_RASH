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

  const monthlyCharge = Number(unitPrice);

  return {
    subtotal: Number(subtotal.toFixed(2)),
    gst,
    total,
    breakdown: {
      initial_payment: initialPayment,
      recurring_months: recurringMonths,
      monthly_charge: monthlyCharge,
    },
  };
}

//calculate early return
