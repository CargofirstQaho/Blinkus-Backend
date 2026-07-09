import { calculateBillingSummary } from '../services/billingSummaryService.js';

export const calculateBillingSummaryController = async (req, res, next) => {
  try {
    const userId           = req.user._id;
    const planType         = req.body.planType;
    const billingAddressId = req.body.billingAddressId;

    const summary = await calculateBillingSummary({ planType, billingAddressId, userId });

    return res.status(200).json({ success: true, data: summary });
  } catch (err) {
    return next(err);
  }
};
