import { getAllPlans } from '../services/pricingService.js';

export const getPricingPlans = async (req, res, next) => {
  try {
    const plans = await getAllPlans();
    return res.json({ success: true, message: 'Success', data: plans });
  } catch (error) {
    return next(error);
  }
};
