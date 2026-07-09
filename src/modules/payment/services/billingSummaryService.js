import { PLAN_PRICES, PLAN_NAMES } from '../../../config/paymentConfig.js';
import { getLatestUsdToInrRate } from '../utils/currency.js';
import { getBillingAddressById } from './billingService.js';
import { errorHandler } from '../../../utils/errorHandler.js';

const PAID_PLANS = [PLAN_NAMES.MONTHLY, PLAN_NAMES.SIX_MONTHS, PLAN_NAMES.YEARLY];
const INDIA_COUNTRY_NAMES = ['india', 'in'];
const GST_RATE = 0.18;

function isIndianCountry(country) {
  return INDIA_COUNTRY_NAMES.includes(country.trim().toLowerCase());
}

export async function calculateBillingSummary({ planType, billingAddressId, userId }) {
  if (!PAID_PLANS.includes(planType)) {
    throw errorHandler(400, `Plan type must be one of: ${PAID_PLANS.join(', ')}`);
  }

  const address = await getBillingAddressById(billingAddressId, userId);

  const usdPlanAmount = PLAN_PRICES[planType];

  if (isIndianCountry(address.country)) {
    const exchangeRate  = await getLatestUsdToInrRate();
    const inrPlanAmount = Math.round(usdPlanAmount * exchangeRate * 100) / 100;
    const gstAmount     = Math.round(inrPlanAmount * GST_RATE * 100) / 100;
    const totalAmount   = Math.round((inrPlanAmount + gstAmount) * 100) / 100;

    return {
      planType,
      currency:      'INR',
      planAmount:    inrPlanAmount,
      exchangeRate,
      gstRate:       GST_RATE,
      gstAmount,
      totalAmount,
      billingAddress: address,
    };
  }

  return {
    planType,
    currency:      'USD',
    planAmount:    usdPlanAmount,
    exchangeRate:  null,
    gstRate:       0,
    gstAmount:     0,
    totalAmount:   usdPlanAmount,
    billingAddress: address,
  };
}
