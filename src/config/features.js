export const features = {
  SUBSCRIPTIONS:    process.env.ENABLE_SUBSCRIPTIONS    === 'true',
  USAGE_LIMITS:     process.env.ENABLE_USAGE_LIMITS     === 'true',
  PLAN_ENFORCEMENT: process.env.ENABLE_PLAN_ENFORCEMENT === 'true',
  // Streaming responses — when true, chat route will stream tokens instead of waiting for full response
  STREAM_RESPONSES: process.env.ENABLE_STREAM_RESPONSES === 'true',
};
