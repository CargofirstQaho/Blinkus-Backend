function num(val, fallback) {
  const parsed = Number(val);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const AI_USAGE_PERIODS = Object.freeze({
  DAY:   'DAY',
  WEEK:  'WEEK',
  MONTH: 'MONTH',
});

export const FREE_AI_LIMIT = num(process.env.FREE_AI_LIMIT, 10);

export const FREE_AI_LIMIT_PERIOD = AI_USAGE_PERIODS[process.env.FREE_AI_LIMIT_PERIOD] ?? AI_USAGE_PERIODS.DAY;
