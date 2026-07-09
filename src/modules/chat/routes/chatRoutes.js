import { Router } from 'express';
import { body } from 'express-validator';
import {
  getConversations, getConversation, createConversation,
  sendMessage, deleteConversation,
} from '../controllers/chatController.js';
import { protect }         from '../../../middleware/auth.js';
import { checkUsageLimit } from '../../../middleware/checkUsageLimit.js';
import { validate }        from '../../../middleware/validate.js';

const router = Router();
router.use(protect);

router.get('/conversations',        getConversations);
router.post('/conversations',       createConversation);
router.get('/conversations/:id',    getConversation);
router.delete('/conversations/:id', deleteConversation);
router.post(
  '/conversations/:id/messages',
  [body('content').trim().notEmpty().withMessage('Message cannot be empty')],
  validate,
  checkUsageLimit,
  sendMessage
);

export default router;
