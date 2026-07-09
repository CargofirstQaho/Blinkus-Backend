import { PLAN_PRICES } from '../../../config/paymentConfig.js';
import {
  getOrRefreshRate,
  forceRefreshRate,
  getCachedRate,
} from '../services/exchangeRateService.js';

const SUPPORTED_CURRENCIES = Object.freeze(['USD', 'INR']);

export function getUsdToInrRate() {
  const rate = Number(process.env.USD_TO_INR_RATE);
  return Number.isFinite(rate) && rate > 0 ? rate : 86;
}

export function getPlanPrice(planName) {
  const amount = PLAN_PRICES[planName] ?? 0;
  return { amount, currency: 'USD' };
}

export function convertUsdToInr(usdAmount, rate) {
  const appliedRate = rate && rate > 0 ? rate : getUsdToInrRate();
  return Math.round(usdAmount * appliedRate);
}

export function validateCurrency(currency) {
  if (!currency || typeof currency !== 'string') return false;
  return SUPPORTED_CURRENCIES.includes(currency.toUpperCase());
}

export async function getLatestUsdToInrRate() {
  return getOrRefreshRate('USD', 'INR');
}

export async function refreshExchangeRate() {
  return forceRefreshRate('USD', 'INR');
}

export async function getCachedExchangeRate() {
  const cached = await getCachedRate('USD', 'INR');
  return cached ? cached.rate : null;
}
