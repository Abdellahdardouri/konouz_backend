import { Router, Request, Response } from 'express';
import * as categoriesService from '../services/categories.service';
import { success, error } from '../utils/response';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const collections = await categoriesService.getCollections();
    success(res, collections);
  } catch (e: any) {
    error(res, e.message, 500);
  }
});

router.get('/:handle', async (req: Request, res: Response) => {
  try {
    const collection = await categoriesService.getCollection(req.params.handle as string);
    if (!collection) return error(res, 'التصنيف غير موجود', 404);
    success(res, collection);
  } catch (e: any) {
    error(res, e.message, 500);
  }
});

router.get('/:handle/products', async (req: Request, res: Response) => {
  try {
    const { sortKey, reverse, first } = req.query;
    const products = await categoriesService.getCollectionProducts({
      collection: req.params.handle as string,
      sortKey: sortKey as string,
      reverse: reverse === 'true',
      first: first ? parseInt(first as string) : undefined,
    });
    success(res, products);
  } catch (e: any) {
    error(res, e.message, 500);
  }
});

export default router;
