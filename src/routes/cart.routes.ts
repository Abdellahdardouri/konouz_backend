import { Router, Request, Response } from 'express';
import * as cartService from '../services/cart.service';
import { success, error } from '../utils/response';

const router = Router();

router.post('/', async (_req: Request, res: Response) => {
  try {
    const cart = await cartService.createCart();
    success(res, cart, 201);
  } catch (e: any) {
    error(res, e.message, 500);
  }
});

router.get('/:cartId', async (req: Request, res: Response) => {
  try {
    const cart = await cartService.getCart(req.params.cartId);
    if (!cart) return error(res, 'السلة غير موجودة', 404);
    success(res, cart);
  } catch (e: any) {
    error(res, e.message, 500);
  }
});

router.post('/:cartId/items', async (req: Request, res: Response) => {
  try {
    const { lines } = req.body;
    if (!lines || !Array.isArray(lines)) return error(res, 'بيانات غير صالحة');
    const cart = await cartService.addToCart(req.params.cartId, lines);
    success(res, cart);
  } catch (e: any) {
    error(res, e.message, 500);
  }
});

router.patch('/:cartId/items', async (req: Request, res: Response) => {
  try {
    const { lines } = req.body;
    if (!lines || !Array.isArray(lines)) return error(res, 'بيانات غير صالحة');
    const cart = await cartService.updateCart(req.params.cartId, lines);
    success(res, cart);
  } catch (e: any) {
    error(res, e.message, 500);
  }
});

router.delete('/:cartId/items', async (req: Request, res: Response) => {
  try {
    const { lineIds } = req.body;
    if (!lineIds || !Array.isArray(lineIds)) return error(res, 'بيانات غير صالحة');
    const cart = await cartService.removeFromCart(req.params.cartId, lineIds);
    success(res, cart);
  } catch (e: any) {
    error(res, e.message, 500);
  }
});

export default router;
