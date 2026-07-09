import { getTodayUsage } from '../../chat/services/usageService.js';
import { getAiDailyLimit } from '../services/subscriptionService.js';
import { PLAN_DEFS } from '../../../config/plans.js';
import Subscription from '../models/Subscription.js';

export const getCurrentPlan = async (req, res, next) => {
  try {
    const [todayUsage, subscriptionHistory] = await Promise.all([
      getTodayUsage(req.user._id),
      Subscription.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    const limit = getAiDailyLimit(req.user);

    return res.json({ success: true, message: 'Success', data: {
      plan:               req.user.plan,
      planStatus:         req.user.planStatus,
      isPremium:          req.user.isPremium,
      subscriptionEndsAt: req.user.subscriptionEndsAt,
      permissions:        req.user.permissions,
      bonusUsed:          req.user.bonusUsed,
      usage: {
        aiQuestionsToday: todayUsage,
        aiQuestionsLimit: limit === Infinity ? null : limit,
      },
      planDetails:         PLAN_DEFS[req.user.plan] ?? PLAN_DEFS.free,
      subscriptionHistory,
    }});
  } catch (error) {
    return next(error);
  }
};
