import { getValidActiveSubscription } from '../../payment/services/subscriptionService.js';
import { canAccessChat } from '../services/entitlementService.js';
import { computeTradeBonusMonths } from '../services/erpSubscriptionService.js';
import { getTradePricing } from '../../../config/pricingConfig.js';
import { PLAN_NAMES } from '../../../config/paymentConfig.js';
import { features } from '../../../config/features.js';
import PlanHistory from '../models/PlanHistory.js';

const PLAN_TYPE_MAP = {
  [PLAN_NAMES.MONTHLY]:    'monthly',
  [PLAN_NAMES.SIX_MONTHS]: 'sixMonth',
  [PLAN_NAMES.YEARLY]:     'yearly',
  [PLAN_NAMES.FREE]:       'none',
};

function buildTradeState(paymentSub) {
  if (!paymentSub) {
    return { planType: 'none', status: 'Inactive', unlimitedAccess: false, startDate: null, endDate: null };
  }
  return {
    planType:        PLAN_TYPE_MAP[paymentSub.planName] ?? 'none',
    status:          'active',
    unlimitedAccess: true,
    startDate:       paymentSub.startDate ?? null,
    endDate:         paymentSub.expiryDate ?? null,
  };
}

export const getErpSubscriptionStatus = async (req, res, next) => {
  try {
    const [paymentSub, chatAccess] = await Promise.all([
      getValidActiveSubscription(req.user._id),
      canAccessChat(req.user),
    ]);

    const hasTradeAccess = !!paymentSub;

    const subscription = {
      chat:             req.user.subscription?.chat ?? null,
      trade:            buildTradeState(paymentSub),
      bonusEligibility: req.user.bonusEligibility ?? null,
    };

    const entitlements = {
      chat: chatAccess,
      erp:  hasTradeAccess,
      erpModules: {
        addOrganization: hasTradeAccess,
        domestic:        hasTradeAccess,
        international:   hasTradeAccess,
        tradeHistory:    hasTradeAccess,
      },
      featureFlags: {
        erpPaymentEnabled:  true,
        chatPaymentEnabled: features.CHAT_PAYMENT_ENABLED,
        chatLimitsEnabled:  features.CHAT_LIMITS_ENABLED,
      },
    };

    return res.json({ success: true, message: 'Success', data: { subscription, entitlements } });
  } catch (error) {
    return next(error);
  }
};

export const getErpPlans = async (req, res, next) => {
  try {
    const pricing = getTradePricing();
    const plans = await Promise.all(
      Object.values(pricing).map(async (plan) => ({
        ...plan,
        bonusMonthsAvailable: await computeTradeBonusMonths(plan.planType, req.user),
      }))
    );

    return res.json({ success: true, message: 'Success', data: { plans } });
  } catch (error) {
    return next(error);
  }
};

export const getPlanHistory = async (req, res, next) => {
  try {
    const history = await PlanHistory.find({ userId: req.user._id, subscriptionType: 'trade' })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return res.json({ success: true, message: 'Success', data: { history } });
  } catch (error) {
    return next(error);
  }
};
