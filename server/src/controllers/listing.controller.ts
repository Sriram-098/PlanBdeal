import { Request, Response } from 'express';
import { listingService } from '../services/listing.service';
import { createListingSchema, updateListingSchema, listingQuerySchema } from '../validators/listing.validators';
import { ApiError } from '../utils/ApiError';

export const listingController = {
  async create(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const input = createListingSchema.parse(req.body);
    const listing = await listingService.create(req.user.id, input);
    res.status(201).json({ listing });
  },

  async explore(req: Request, res: Response) {
    const query = listingQuerySchema.parse(req.query);
    const result = await listingService.explore(query);
    res.status(200).json(result);
  },

  async getById(req: Request, res: Response) {
    const listing = await listingService.getById(req.params.id);
    res.status(200).json({ listing });
  },

  async mine(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const listings = await listingService.getMine(req.user.id);
    res.status(200).json({ listings });
  },

  async update(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const input = updateListingSchema.parse(req.body);
    const listing = await listingService.update(req.params.id, req.user.id, input);
    res.status(200).json({ listing });
  },

  async cancel(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const listing = await listingService.cancel(req.params.id, req.user.id);
    res.status(200).json({ listing });
  },

  async markSold(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const listing = await listingService.markSold(req.params.id, req.user.id);
    res.status(200).json({ listing });
  },
};
