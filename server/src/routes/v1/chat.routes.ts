import { Router } from 'express';
import { chatController } from '../../controllers/chat.controller';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth } from '../../middleware/auth';

const router = Router();

router.get('/', requireAuth, asyncHandler(chatController.listMine));
router.get('/:id', requireAuth, asyncHandler(chatController.getById));
router.get('/:id/messages', requireAuth, asyncHandler(chatController.getMessages));

export default router;
