import ExchangeRate from '../models/ExchangeRate.js';

export async function getCachedRate(base = 'USD', target = 'INR') {
  return ExchangeRate.findOne({ baseCurrency: base, targetCurrency: target });
}

export async function saveRate({ base, target, rate, lastUpdatedAt, nextUpdateAt }) {
  return ExchangeRate.findOneAndUpdate(
    { baseCurrency: base, targetCurrency: target },
    { rate, lastUpdatedAt, nextUpdateAt },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

export async function fetchRateFromApi() {
  const domain = process.env.EXCHANGE_RATE_DOMAIN;
  const apiKey = process.env.EXCHANGERATE_API_KEY;

  if (!domain || !apiKey) {
    throw new Error('Exchange rate API credentials are not configured');
  }

  const url = `https://${domain}/v6/${apiKey}/latest/USD`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);

  let response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new Error(`Exchange rate API responded with ${response.status}`);
  }

  const data = await response.json().catch(() => { throw new Error('Exchange rate API returned invalid JSON'); });

  if (data.result !== 'success') {
    throw new Error(data['error-type'] || 'Exchange rate API request failed');
  }

  const inrRate = data.conversion_rates?.INR;
  if (!inrRate || typeof inrRate !== 'number' || inrRate <= 0) {
    throw new Error('Invalid INR rate in exchange rate API response');
  }

  return {
    rate:          inrRate,
    lastUpdatedAt: new Date(data.time_last_update_unix * 1000),
    nextUpdateAt:  new Date(data.time_next_update_unix * 1000),
  };
}

export async function getOrRefreshRate(base = 'USD', target = 'INR') {
  const cached = await getCachedRate(base, target);

  if (cached && cached.nextUpdateAt > new Date()) {
    return cached.rate;
  }

  const fresh = await fetchRateFromApi();

  await saveRate({
    base,
    target,
    rate:          fresh.rate,
    lastUpdatedAt: fresh.lastUpdatedAt,
    nextUpdateAt:  fresh.nextUpdateAt,
  });

  return fresh.rate;
}

export async function forceRefreshRate(base = 'USD', target = 'INR') {
  const fresh = await fetchRateFromApi();

  await saveRate({
    base,
    target,
    rate:          fresh.rate,
    lastUpdatedAt: fresh.lastUpdatedAt,
    nextUpdateAt:  fresh.nextUpdateAt,
  });

  return fresh.rate;
}
