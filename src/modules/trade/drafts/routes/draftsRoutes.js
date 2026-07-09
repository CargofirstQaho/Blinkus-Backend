import express from 'express';
import { protect } from '../../../../middleware/auth.js';
import { requireActiveTradeSubscription } from '../../../payment/middlewares/requireActiveTradeSubscription.js';
import { listDrafts, deleteDraft, toggleFavorite } from '../controllers/draftsController.js';

const router = express.Router();

router.use(protect);
router.use(requireActiveTradeSubscription);

router.get('/', listDrafts);
router.delete('/:id', deleteDraft);
router.patch('/:id/favorite', toggleFavorite);

export default router;
