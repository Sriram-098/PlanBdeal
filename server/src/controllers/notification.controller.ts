import { Request, Response } from 'express';
import { notificationService } from '../services/notification.service';
import { ApiError } from '../utils/ApiError';

export const notificationController = {
  async list(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const [notifications, unreadCount] = await Promise.all([
      notificationService.listForUser(req.user.id),
      notificationService.unreadCount(req.user.id),
    ]);
    res.status(200).json({ notifications, unreadCount });
  },

  async markRead(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const notification = await notificationService.markRead(req.params.id, req.user.id);
    if (!notification) throw ApiError.notFound('Notification not found');
    res.status(200).json({ notification });
  },
};
