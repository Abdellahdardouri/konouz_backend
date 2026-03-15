import { Router, Request, Response } from 'express';
import * as analyticsService from '../../services/analytics.service';
import { success, error } from '../../utils/response';

const router = Router();

router.get('/overview', async (_req: Request, res: Response) => {
  try {
    const data = await analyticsService.getOverview();
    success(res, data);
  } catch (e: any) {
    error(res, e.message, 500);
  }
});

router.get('/revenue', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const data = await analyticsService.getRevenueByPeriod(days);
    success(res, data);
  } catch (e: any) {
    error(res, e.message, 500);
  }
});

router.get('/best-sellers', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const data = await analyticsService.getBestSellers(limit);
    success(res, data);
  } catch (e: any) {
    error(res, e.message, 500);
  }
});

router.get('/orders', async (_req: Request, res: Response) => {
  try {
    const data = await analyticsService.getOrdersByStatus();
    success(res, data);
  } catch (e: any) {
    error(res, e.message, 500);
  }
});

router.get('/low-stock', async (req: Request, res: Response) => {
  try {
    const threshold = parseInt(req.query.threshold as string) || 5;
    const data = await analyticsService.getLowStockProducts(threshold);
    success(res, data);
  } catch (e: any) {
    error(res, e.message, 500);
  }
});

export default router;
