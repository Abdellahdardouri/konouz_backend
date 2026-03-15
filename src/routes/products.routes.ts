import { Router, Request, Response } from 'express';
import * as productsService from '../services/products.service';
import { success, error } from '../utils/response';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { q, sortKey, reverse, first, categoryId, tag } = req.query;
    const products = await productsService.getProducts({
      query: q as string,
      sortKey: sortKey as string,
      reverse: reverse === 'true',
      first: first ? parseInt(first as string) : undefined,
      categoryId: categoryId as string,
      tag: tag as string,
    });
    success(res, products);
  } catch (e: any) {
    error(res, e.message, 500);
  }
});

router.get('/:handle', async (req: Request, res: Response) => {
  try {
    const product = await productsService.getProductByHandle(req.params.handle as string);
    if (!product) return error(res, 'المنتج غير موجود', 404);
    success(res, product);
  } catch (e: any) {
    error(res, e.message, 500);
  }
});

router.get('/:handle/recommendations', async (req: Request, res: Response) => {
  try {
    const first = req.query.first ? parseInt(req.query.first as string) : 4;
    const products = await productsService.getRecommendationsByHandle(req.params.handle as string, first);
    success(res, products);
  } catch (e: any) {
    error(res, e.message, 500);
  }
});

export default router;
