import { getTradePricing } from '../../../config/pricingConfig.js';

export async function computeTradeBonusMonths(planType, user) {
  const pricing = getTradePricing();

  if (planType === 'sixMonth') {
    return user.bonusEligibility?.sixMonthBonusUsed ? 0 : pricing.sixMonth.bonusMonths;
  }
  if (planType === 'yearly') {
    return user.bonusEligibility?.yearlyBonusUsed ? 0 : pricing.yearly.bonusMonths;
  }
  return 0;
}

export async function getUserSubscriptionState(user) {
  return {
    chat:  user.subscription?.chat  ?? null,
    trade: user.subscription?.trade ?? null,
    bonusEligibility: user.bonusEligibility ?? null,
  };
}
