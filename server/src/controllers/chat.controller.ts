import { Request, Response } from 'express';
import { chatService } from '../services/chat.service';
import { paginationSchema } from '../validators/chat.validators';
import { ApiError } from '../utils/ApiError';

export const chatController = {
  async listMine(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const threads = await chatService.listMyThreads(req.user.id);
    res.status(200).json({ threads });
  },

  async getById(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const thread = await chatService.getById(req.params.id, req.user.id);
    res.status(200).json({ thread });
  },

  async getMessages(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const { page, pageSize } = paginationSchema.parse(req.query);
    const messages = await chatService.getMessages(req.params.id, req.user.id, page, pageSize);
    res.status(200).json({ messages, page, pageSize });
  },
};
