export const PLAN_DEFS = {
  free: {
    label:             'Free',
    price:             0,
    durationMonths:    null,
    aiQuestionsPerDay: 20,
    bonusMonths:       0,
    features:          ['aiChat'],
  },
  monthly: {
    label:             'Monthly',
    price:             55,
    durationMonths:    1,
    aiQuestionsPerDay: Infinity,
    bonusMonths:       0,
    features:          ['aiChat', 'erpWorkflow', 'analytics', 'tradeReports', 'shipmentTracking'],
  },
  biannual: {
    label:             '6-Month',
    price:             285,
    durationMonths:    6,
    aiQuestionsPerDay: Infinity,
    bonusMonths:       1,
    features:          ['aiChat', 'erpWorkflow', 'analytics', 'tradeReports', 'shipmentTracking'],
  },
  yearly: {
    label:             'Yearly',
    price:             500,
    durationMonths:    12,
    aiQuestionsPerDay: Infinity,
    bonusMonths:       2,
    features:          ['aiChat', 'erpWorkflow', 'analytics', 'tradeReports', 'shipmentTracking'],
  },
};

export const ALL_FEATURES = ['aiChat', 'erpWorkflow', 'analytics', 'tradeReports', 'shipmentTracking'];
