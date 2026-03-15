import { Router } from 'express';
import { requireAdmin } from '../../middleware/auth';
import productsRouter from './products.routes';
import categoriesRouter from './categories.routes';
import ordersRouter from './orders.routes';
import customersRouter from './customers.routes';
import promoRouter from './promo.routes';
import analyticsRouter from './analytics.routes';

const router = Router();

// All admin routes require admin auth
router.use(requireAdmin);

router.use('/products', productsRouter);
router.use('/categories', categoriesRouter);
router.use('/orders', ordersRouter);
router.use('/customers', customersRouter);
router.use('/promo', promoRouter);
router.use('/analytics', analyticsRouter);

export default router;
