import { Router } from 'express';
import { listingController } from '../../controllers/listing.controller';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth } from '../../middleware/auth';
import { writeLimiter } from '../../middleware/rateLimit';

const router = Router();

router.get('/', asyncHandler(listingController.explore));
router.get('/:id', asyncHandler(listingController.getById));
router.post('/', requireAuth, writeLimiter, asyncHandler(listingController.create));
router.patch('/:id', requireAuth, writeLimiter, asyncHandler(listingController.update));
router.post('/:id/cancel', requireAuth, asyncHandler(listingController.cancel));
router.post('/:id/sold', requireAuth, asyncHandler(listingController.markSold));

export default router;
