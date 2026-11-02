import { Router } from 'express';
import { listingController } from '../../controllers/listing.controller';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth } from '../../middleware/auth';

const router = Router();

router.get('/me/listings', requireAuth, asyncHandler(listingController.mine));

export default router;
