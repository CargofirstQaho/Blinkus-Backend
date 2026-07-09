import { getPricing } from '../../../config/pricingConfig.js';

function monthlyEquivalent(plan) {
  return plan.price / (plan.durationMonths + plan.bonusMonths);
}

function withSavings(monthly, plan) {
  const baseline = monthlyEquivalent(monthly) * (plan.durationMonths + plan.bonusMonths);
  const savingsAmount  = Math.max(0, Math.round(baseline - plan.price));
  const savingsPercent = baseline > 0 ? Math.round((savingsAmount / baseline) * 100) : 0;
  return { ...plan, savingsAmount, savingsPercent, totalMonths: plan.durationMonths + plan.bonusMonths };
}

export async function getTradePlans() {
  const { trade } = getPricing();
  return {
    monthly:  withSavings(trade.monthly, trade.monthly),
    sixMonth: withSavings(trade.monthly, trade.sixMonth),
    yearly:   withSavings(trade.monthly, trade.yearly),
  };
}

export async function getChatPlans() {
  const { chat } = getPricing();
  return {
    monthly:  withSavings(chat.monthly, chat.monthly),
    sixMonth: withSavings(chat.monthly, chat.sixMonth),
    yearly:   withSavings(chat.monthly, chat.yearly),
  };
}

export async function getAllPlans() {
  const [trade, chat] = await Promise.all([getTradePlans(), getChatPlans()]);
  return { trade, chat };
}
