import UsageLog from '../models/UsageLog.js';
import { getUsagePeriodKey } from '../utils/aiUsageUtils.js';
import { FREE_AI_LIMIT_PERIOD } from '../../../config/aiUsageConfig.js';

function currentPeriodKey() {
  return getUsagePeriodKey(FREE_AI_LIMIT_PERIOD);
}

export async function getTodayUsage(userId) {
  const log = await UsageLog.findOne({ userId, date: currentPeriodKey() }).lean();
  return log?.aiQuestionsCount ?? 0;
}

export async function incrementAiUsage(userId) {
  const date = currentPeriodKey();
  await UsageLog.findOneAndUpdate(
    { userId, date },
    { $inc: { aiQuestionsCount: 1 } },
    { upsert: true }
  );
}
