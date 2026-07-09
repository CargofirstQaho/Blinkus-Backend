import Razorpay from 'razorpay';
import { RAZORPAY_CONFIG } from '../../../config/paymentConfig.js';

const isProd = process.env.NODE_ENV === "production";

export function validateRazorpayConfiguration() {
  const missing = [];
  if (!RAZORPAY_CONFIG.keyId)         missing.push( isProd ? "RAZORPAY_KEY_ID" : "TEST_RAZORPAY_KEY_ID");
  if (!RAZORPAY_CONFIG.keySecret)     missing.push( isProd ? "RAZORPAY_KEY_SECRET" : "TEST_RAZORPAY_KEY_SECRET");
  if (!RAZORPAY_CONFIG.webhookSecret) missing.push( isProd ? "RAZORPAY_WEBHOOK_SECRET" : "TEST_RAZORPAY_WEBHOOK_SECRET");

  return {
    isValid: missing.length === 0,
    missing,
  };
} 

function createInstance() {
  if (!RAZORPAY_CONFIG.keyId || !RAZORPAY_CONFIG.keySecret) return null;

  return new Razorpay({
    key_id:     RAZORPAY_CONFIG.keyId,
    key_secret: RAZORPAY_CONFIG.keySecret,
  });
}

const razorpay = createInstance();

export { razorpay };
export default razorpay;
