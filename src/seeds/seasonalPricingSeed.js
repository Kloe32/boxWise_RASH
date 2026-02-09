import { pricingService } from "../pricing/pricing.service.js";

const res = await pricingService.generateSeasonalPricingPreviousYear();
console.log("Done:", res);
process.exit(0);
