import { Router, Request, Response } from 'express';
import * as ordersService from '../../services/orders.service';
import { success, error, paginated } from '../../utils/response';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const { orders, total } = await ordersService.getAllOrders({ status, page, limit });
    paginated(res, orders, total, page, limit);
  } catch (e: any) {
    error(res, e.message, 500);
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const order = await ordersService.getOrder(req.params.id);
    if (!order) return error(res, 'الطلب غير موجود', 404);
    success(res, order);
  } catch (e: any) {
    error(res, e.message, 500);
  }
});

router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!status) return error(res, 'حالة الطلب مطلوبة');
    const order = await ordersService.updateOrderStatus(req.params.id, status);
    success(res, order);
  } catch (e: any) {
    error(res, e.message);
  }
});

export default router;
