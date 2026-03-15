import { Router, Request, Response } from 'express';
import * as ordersService from '../services/orders.service';
import { requireAuth, optionalAuth, AuthRequest } from '../middleware/auth';
import { success, error } from '../utils/response';

const router = Router();

router.post('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { cartId, customerName, customerPhone, customerCity, customerAddress, paymentMethod, promoCode, notes } = req.body;
    if (!cartId || !customerName || !customerPhone || !customerCity || !customerAddress || !paymentMethod) {
      return error(res, 'جميع الحقول مطلوبة');
    }
    const order = await ordersService.createOrder({
      cartId,
      userId: req.user?.id,
      customerName,
      customerPhone,
      customerCity,
      customerAddress,
      paymentMethod,
      promoCode,
      notes,
    });
    success(res, order, 201);
  } catch (e: any) {
    error(res, e.message);
  }
});

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const orders = await ordersService.getUserOrders(req.user!.id);
    success(res, orders);
  } catch (e: any) {
    error(res, e.message, 500);
  }
});

router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const order = await ordersService.getOrder(req.params.id);
    if (!order) return error(res, 'الطلب غير موجود', 404);
    success(res, order);
  } catch (e: any) {
    error(res, e.message, 500);
  }
});

export default router;
