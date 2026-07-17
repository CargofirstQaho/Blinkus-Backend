import { ENTITLEMENT_RULES } from '../../../config/entitlementConfig.js';
import { features } from '../../../config/features.js';

export function isTradeActive(user) {
  const trade = user?.subscription?.trade;
  if (!trade) return false;
  if (trade.status !== 'active' || !trade.unlimitedAccess) return false;
  if (!trade.endDate) return false;
  return new Date(trade.endDate).getTime() > Date.now();
}

function isChatUnlimited(user) {
  const chat = user?.subscription?.chat;
  if (!chat) return false;
  if (!chat.unlimitedAccess) return false;
  if (chat.source === 'free') return true;
  if (!chat.endDate) return false;
  return new Date(chat.endDate).getTime() > Date.now();
}

export async function canAccessChat(user) {
  if (ENTITLEMENT_RULES.chat.mode === 'free') return true;
  return isChatUnlimited(user) || isTradeActive(user);
}

export async function canAccessERP(user) {
  if (ENTITLEMENT_RULES.erp.mode === 'free') return true;
  return isTradeActive(user);
}

async function canAccessErpModule(user, moduleKey) {
  const moduleRule = ENTITLEMENT_RULES.erp.modules[moduleKey];
  if (!moduleRule || moduleRule.mode === 'free') return true;
  return canAccessERP(user);
}

export async function canAccessTradeHistory(user) {
  return canAccessErpModule(user, 'tradeHistory');
}

export async function canAccessInternational(user) {
  return canAccessErpModule(user, 'international');
}

export async function canAccessDomestic(user) {
  return canAccessErpModule(user, 'domestic');
}

export async function canAccessAddOrganization(user) {
  return canAccessErpModule(user, 'addOrganization');
}

export async function getEntitlementSummary(user) {
  const [chat, erp, tradeHistory, international, domestic, addOrganization] = await Promise.all([
    canAccessChat(user),
    canAccessERP(user),
    canAccessTradeHistory(user),
    canAccessInternational(user),
    canAccessDomestic(user),
    canAccessAddOrganization(user),
  ]);

  return {
    chat,
    erp,
    erpModules: { tradeHistory, international, domestic, addOrganization },
    featureFlags: {
      erpPaymentEnabled:  features.ERP_PAYMENT_ENABLED,
      chatPaymentEnabled: features.CHAT_PAYMENT_ENABLED,
      chatLimitsEnabled:  features.CHAT_LIMITS_ENABLED,
    },
  };
}
