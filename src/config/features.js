export const features = {
  SUBSCRIPTIONS:    process.env.ENABLE_SUBSCRIPTIONS    === 'true',
  USAGE_LIMITS:     process.env.ENABLE_USAGE_LIMITS     === 'true',
  PLAN_ENFORCEMENT: process.env.ENABLE_PLAN_ENFORCEMENT === 'true',
  // Streaming responses — when true, chat route will stream tokens instead of waiting for full response
  STREAM_RESPONSES: process.env.ENABLE_STREAM_RESPONSES === 'true',
  ERP_PAYMENT_ENABLED:  process.env.ERP_PAYMENT_ENABLED  === 'true',
  CHAT_PAYMENT_ENABLED: process.env.CHAT_PAYMENT_ENABLED === 'true',
  CHAT_LIMITS_ENABLED:  process.env.CHAT_LIMITS_ENABLED  === 'true',
};
 