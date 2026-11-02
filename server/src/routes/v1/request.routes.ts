import { Router } from 'express';
import { requestController } from '../../controllers/request.controller';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth } from '../../middleware/auth';
import { writeLimiter } from '../../middleware/rateLimit';

const router = Router();

router.post('/listings/:id/requests', requireAuth, writeLimiter, asyncHandler(requestController.create));
router.get('/users/me/requests', requireAuth, asyncHandler(requestController.listSent));
router.get('/users/me/received-requests', requireAuth, asyncHandler(requestController.listReceived));
router.post('/requests/:id/accept', requireAuth, asyncHandler(requestController.accept));
router.post('/requests/:id/reject', requireAuth, asyncHandler(requestController.reject));
router.post('/requests/:id/withdraw', requireAuth, asyncHandler(requestController.withdraw));

export default router;
