import { AI_USAGE_PERIODS } from '../../../config/aiUsageConfig.js';

function pad(value) {
  return String(value).padStart(2, '0');
}

function isoWeekKey(date) {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  target.setUTCDate(target.getUTCDate() + 4 - (target.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
  return `${target.getUTCFullYear()}-W${pad(week)}`;
}

export function getUsagePeriodKey(period, date = new Date()) {
  const iso = date.toISOString();
  switch (period) {
    case AI_USAGE_PERIODS.WEEK:
      return isoWeekKey(date);
    case AI_USAGE_PERIODS.MONTH:
      return iso.slice(0, 7);
    case AI_USAGE_PERIODS.DAY:
    default:
      return iso.slice(0, 10);
  }
}

export function getUsagePeriodLabel(period) {
  switch (period) {
    case AI_USAGE_PERIODS.WEEK:
      return 'week';
    case AI_USAGE_PERIODS.MONTH:
      return 'month';
    case AI_USAGE_PERIODS.DAY:
    default:
      return 'day';
  }
}

export function getNextResetDate(period, date = new Date()) {
  switch (period) {
    case AI_USAGE_PERIODS.WEEK: {
      const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
      const day = target.getUTCDay() || 7;
      target.setUTCDate(target.getUTCDate() + (8 - day));
      return target;
    }
    case AI_USAGE_PERIODS.MONTH:
      return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
    case AI_USAGE_PERIODS.DAY:
    default:
      return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));
  }
}
