import UsageLog from '../models/UsageLog.js';

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

export async function getTodayUsage(userId) {
  const log = await UsageLog.findOne({ userId, date: todayUTC() }).lean();
  return log?.aiQuestionsCount ?? 0;
}

export async function incrementAiUsage(userId) {
  const date = todayUTC();
  await UsageLog.findOneAndUpdate(
    { userId, date },
    { $inc: { aiQuestionsCount: 1 } },
    { upsert: true }
  );
}
