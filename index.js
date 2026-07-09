import 'dotenv/config';
import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import connectDB from './src/config/db.js';
import { errorMiddleware } from './src/middleware/errorMiddleware.js';
import authRoutes            from './src/modules/auth/routes/authRoutes.js';
import chatRoutes            from './src/modules/chat/routes/chatRoutes.js';
import userRoutes            from './src/modules/user/routes/userRoutes.js';
import subscriptionRoutes    from './src/modules/subscription/routes/subscriptionRoutes.js';
import erpSubscriptionRoutes from './src/modules/subscription/routes/erpSubscriptionRoutes.js';
import organizationRoutes    from './src/modules/trade/organization/routes/organizationRoutes.js';
import purchaseOrderRoutes   from './src/modules/trade/purchaseOrder/routes/purchaseOrderRoutes.js';
import creditNoteRoutes      from './src/modules/trade/credit-note/routes/creditNoteRoutes.js';
import debitNoteRoutes       from './src/modules/trade/debit-note/routes/debitNoteRoutes.js';
import contractRoutes        from './src/modules/trade/contracts/routes/contractRoutes.js';
import proformaInvoiceRoutes from './src/modules/trade/proforma-invoice/routes/proformaInvoiceRoutes.js';
import packingListRoutes     from './src/modules/trade/packing-list/routes/packingListRoutes.js';
import commercialInvoiceRoutes from './src/modules/trade/commercial-invoice/routes/commercialInvoiceRoutes.js';
import tradeDraftsRoutes       from './src/modules/trade/drafts/routes/draftsRoutes.js';
import tradeHistoryRoutes      from './src/modules/trade/history/routes/tradeHistoryRoutes.js';
import auditRoutes             from './src/modules/audit/routes/auditRoutes.js';
import paymentRoutes           from './src/modules/payment/routes/paymentRoutes.js';
import webhookRoutes           from './src/modules/payment/routes/webhookRoutes.js';
import billingRoutes           from './src/modules/payment/routes/billingRoutes.js';

const app  = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1);

app.use(helmet());
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

app.use('/api/payment/webhook', express.raw({ type: '*/*' }), webhookRoutes);

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      200,
  message:  { success: false, message: 'Too many requests, please try again later' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      50,
  message:  { success: false, message: 'Too many auth attempts, please try again later' },
});

app.use('/api', limiter);
app.use('/api/auth', authLimiter);

app.use('/api/auth',             authRoutes);
app.use('/api/chat',             chatRoutes);
app.use('/api/user',             userRoutes);
app.use('/api/subscription',     subscriptionRoutes);
app.use('/api/erp/subscription', erpSubscriptionRoutes);
// app.use('/api/erp/organization',    organizationRoutes);
app.use('/api/trade/organization',   organizationRoutes);
app.use('/api/trade/purchase-orders', purchaseOrderRoutes);
app.use('/api/trade/credit-notes',    creditNoteRoutes);
app.use('/api/trade/debit-notes',     debitNoteRoutes);
app.use('/api/trade/contracts',       contractRoutes);
app.use('/api/trade/proforma-invoices', proformaInvoiceRoutes);
app.use('/api/trade/packing-lists',     packingListRoutes);
app.use('/api/trade/commercial-invoices', commercialInvoiceRoutes);
app.use('/api/trade/drafts',              tradeDraftsRoutes);
app.use('/api/trade/history',             tradeHistoryRoutes);
app.use('/api/audit',                  auditRoutes);
app.use('/api/payment',                paymentRoutes);
app.use('/api/payment/billing',        billingRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use(errorMiddleware);

connectDB()
  .then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
  .catch((err) => { console.error('DB connection failed:', err); process.exit(1); });
