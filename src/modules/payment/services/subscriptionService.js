import Subscription from '../models/Subscription.js';
import {
  SUBSCRIPTION_STATUSES,
  PLAN_NAMES,
} from '../../../config/paymentConfig.js';
import { calculateExpiryDate } from '../utils/planUtils.js';

export async function createPendingSubscription({ userId, planName, billingCycle }) {
  return Subscription.create({
    userId,
    planName,
    billingCycle,
    status: SUBSCRIPTION_STATUSES.PENDING_PAYMENT,
  });
}

export async function createFreeSubscription({ userId }) {
  return Subscription.create({
    userId,
    planName:     PLAN_NAMES.FREE,
    billingCycle: PLAN_NAMES.FREE,
    status:       SUBSCRIPTION_STATUSES.FREE,
    startDate:    new Date(),
    expiryDate:   null,
  });
}

export async function activateSubscription(subscriptionId, paymentDate = new Date()) {
  const subscription = await Subscription.findById(subscriptionId);
  if (!subscription) throw new Error('Subscription not found');

  const expiryDate = calculateExpiryDate(paymentDate, subscription.planName);

  subscription.status     = SUBSCRIPTION_STATUSES.ACTIVE;
  subscription.startDate  = paymentDate;
  subscription.expiryDate = expiryDate;

  return subscription.save();
}

export async function cancelSubscription(subscriptionId, { cancelReason } = {}) {
  return Subscription.findByIdAndUpdate(
    subscriptionId,
    {
      status:       SUBSCRIPTION_STATUSES.CANCELLED,
      cancelledAt:  new Date(),
      cancelReason: cancelReason ?? null,
      autoRenew:    false,
    },
    { new: true }
  );
}

export async function markSubscriptionExpired(subscriptionId) {
  return Subscription.findByIdAndUpdate(
    subscriptionId,
    { status: SUBSCRIPTION_STATUSES.EXPIRED },
    { new: true }
  );
}

export async function markSubscriptionPaymentFailed(subscriptionId) {
  return Subscription.findByIdAndUpdate(
    subscriptionId,
    { status: SUBSCRIPTION_STATUSES.PAYMENT_FAILED },
    { new: true }
  );
}

export async function markSubscriptionRefunded(subscriptionId) {
  return Subscription.findByIdAndUpdate(
    subscriptionId,
    { status: SUBSCRIPTION_STATUSES.REFUNDED, autoRenew: false },
    { new: true }
  );
}

export async function attachOrganization(subscriptionId, organizationId) {
  return Subscription.findByIdAndUpdate(
    subscriptionId,
    { organizationId },
    { new: true }
  );
}

export async function getActiveSubscription(userId) {
  return Subscription.findOne({
    userId,
    status: SUBSCRIPTION_STATUSES.ACTIVE,
  }).sort({ createdAt: -1 });
}

export async function getValidActiveSubscription(userId) {
  return Subscription.findOne({
    userId,
    status:     SUBSCRIPTION_STATUSES.ACTIVE,
    expiryDate: { $gt: new Date() },
  }).sort({ createdAt: -1 });
}

export async function getSubscriptionById(subscriptionId) {
  return Subscription.findById(subscriptionId);
}
