import { features } from './features.js';

const erpMode  = features.ERP_PAYMENT_ENABLED  ? 'subscription' : 'free';
const chatMode = features.CHAT_PAYMENT_ENABLED ? 'subscription' : 'free';

export const ENTITLEMENT_RULES = {
  chat: {
    mode: chatMode,
  },
  erp: {
    mode: erpMode,
    modules: {
      addOrganization: { mode: erpMode },
      domestic:        { mode: erpMode },
      international:   { mode: erpMode },
      tradeHistory:    { mode: erpMode },
    },
  },
};
