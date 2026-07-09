import express from 'express';
import { protect } from '../../../../middleware/auth.js';
import { requireActiveTradeSubscription } from '../../../payment/middlewares/requireActiveTradeSubscription.js';
import { listShipments, listDomesticDocuments, listUnifiedHistory } from '../controllers/tradeHistoryController.js';

const router = express.Router();

router.use(protect);
router.use(requireActiveTradeSubscription);

router.get('/shipments', listShipments);
router.get('/domestic', listDomesticDocuments);
router.get('/documents', listUnifiedHistory);

export default router;
