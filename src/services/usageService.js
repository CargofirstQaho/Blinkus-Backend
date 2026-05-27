import UsageLog from '../models/UsageLog.js';

function todayUTC() {
  return new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

export async function getTodayUsage(userId) {
  const log = await UsageLog.findOne({ userId, date: todayUTC() }).lean();
  return log?.aiQuestionsCount ?? 0;
}

// Atomically increments the daily AI question counter. Upserts if no record exists.
export async function incrementAiUsage(userId) {
  const date = todayUTC();
  await UsageLog.findOneAndUpdate(
    { userId, date },
    { $inc: { aiQuestionsCount: 1 } },
    { upsert: true }
  );
}
