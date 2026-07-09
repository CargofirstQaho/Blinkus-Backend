import { createOrder } from '../services/orderService.js';
import { verifyPayment } from '../services/verificationService.js';
import { getPaymentHistoryPaginated } from '../services/paymentService.js';
import { getValidActiveSubscription } from '../services/subscriptionService.js';
import { errorHandler } from '../../../utils/errorHandler.js';

export const createOrderController = async (req, res, next) => {
  try {
    if (!req.user.isVerified) {
      return next(errorHandler(403, 'Please verify your email before making a payment'));
    }

    const userId           = req.user._id;
    const planType         = req.body.planType;
    const billingAddressId = req.body.billingAddressId;
    const ipAddress        = req.ip || req.socket?.remoteAddress || null;
    const userAgent        = req.headers['user-agent'] || null;

    const result = await createOrder({ userId, planType, billingAddressId, ipAddress, userAgent });

    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
};

export const verifyPaymentController = async (req, res, next) => {
  try {
    if (!req.user.isVerified) {
      return next(errorHandler(403, 'Please verify your email before making a payment'));
    }

    const userId    = req.user._id;
    const orderId   = req.body.razorpay_order_id;
    const paymentId = req.body.razorpay_payment_id;
    const signature = req.body.razorpay_signature;
    const ipAddress = req.ip || req.socket?.remoteAddress || null;
    const userAgent = req.headers['user-agent'] || null;

    const result = await verifyPayment({ userId, orderId, paymentId, signature, ipAddress, userAgent });

    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
};

export const getPaymentHistoryController = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const page   = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit  = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip   = (page - 1) * limit;

    const { payments, total } = await getPaymentHistoryPaginated(userId, skip, limit);

    return res.status(200).json({
      success: true,
      data: {
        payments,
        total,
        page,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    return next(err);
  }
};

export const getCurrentSubscriptionController = async (req, res, next) => {
  try {
    const subscription = await getValidActiveSubscription(req.user._id);
    return res.status(200).json({
      success: true,
      data: { subscription: subscription ?? null },
    });
  } catch (err) {
    return next(err);
  }
};
