function num(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getTradePricing() {
  return {
    monthly: {
      planType:     'monthly',
      price:        num(process.env.TRADE_MONTHLY_PRICE, 999),
      displayPrice: process.env.TRADE_MONTHLY_DISPLAY_PRICE || '₹999',
      durationMonths: 1,
      bonusMonths:    0,
    },
    sixMonth: {
      planType:     'sixMonth',
      price:        num(process.env.TRADE_SIX_MONTH_PRICE, 4999),
      displayPrice: process.env.TRADE_SIX_MONTH_DISPLAY_PRICE || '₹4,999',
      durationMonths: 6,
      bonusMonths:    1,
    },
    yearly: {
      planType:     'yearly',
      price:        num(process.env.TRADE_YEARLY_PRICE, 8999),
      displayPrice: process.env.TRADE_YEARLY_DISPLAY_PRICE || '₹8,999',
      durationMonths: 12,
      bonusMonths:    2,
    },
  };
}

export function getChatPricing() {
  return {
    monthly: {
      planType:       'monthly',
      price:          num(process.env.CHAT_MONTHLY_PRICE, 199),
      durationMonths: 1,
      bonusMonths:    0,
    },
    sixMonth: {
      planType:       'sixMonth',
      price:          num(process.env.CHAT_SIX_MONTH_PRICE, 999),
      durationMonths: 6,
      bonusMonths:    1,
    },
    yearly: {
      planType:       'yearly',
      price:          num(process.env.CHAT_YEARLY_PRICE, 1799),
      durationMonths: 12,
      bonusMonths:    2,
    },
  };
}

export function getPricing() {
  return {
    trade: getTradePricing(),
    chat:  getChatPricing(),
  };
}
