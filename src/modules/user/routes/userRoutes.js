import { Router } from 'express';
import { getProfile, updateProfile, changePassword, setPassword } from '../controllers/userController.js';
import { protect } from '../../../middleware/auth.js';

const router = Router();
router.use(protect);

router.get('/',            getProfile);
router.patch('/',          updateProfile);
router.patch('/password',  changePassword);
router.post('/set-password', setPassword);

export default router;
