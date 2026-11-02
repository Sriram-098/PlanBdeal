import { Router } from 'express';
import { notificationController } from '../../controllers/notification.controller';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth } from '../../middleware/auth';

const router = Router();

router.get('/', requireAuth, asyncHandler(notificationController.list));
router.patch('/:id/read', requireAuth, asyncHandler(notificationController.markRead));

export default router;
