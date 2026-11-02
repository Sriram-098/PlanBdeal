import { Router } from 'express';
import authRoutes from './auth.routes';
import listingRoutes from './listing.routes';
import requestRoutes from './request.routes';
import chatRoutes from './chat.routes';
import notificationRoutes from './notification.routes';
import userRoutes from './user.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/listings', listingRoutes);
router.use('/', requestRoutes);
router.use('/chats', chatRoutes);
router.use('/notifications', notificationRoutes);
router.use('/users', userRoutes);

export default router;
