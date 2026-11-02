import { Request, Response } from 'express';
import { requestService } from '../services/request.service';
import { createRequestSchema } from '../validators/request.validators';
import { ApiError } from '../utils/ApiError';

export const requestController = {
  async create(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const input = createRequestSchema.parse(req.body);
    const request = await requestService.create(req.params.id, req.user.id, input);
    res.status(201).json({ request });
  },

  async listSent(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const requests = await requestService.listSent(req.user.id);
    res.status(200).json({ requests });
  },

  async listReceived(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const requests = await requestService.listReceived(req.user.id);
    res.status(200).json({ requests });
  },

  async accept(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const result = await requestService.accept(req.params.id, req.user.id);
    res.status(200).json(result);
  },

  async reject(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const request = await requestService.reject(req.params.id, req.user.id);
    res.status(200).json({ request });
  },

  async withdraw(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const request = await requestService.withdraw(req.params.id, req.user.id);
    res.status(200).json({ request });
  },
};
