import { Router } from 'express';
import authRoutes from './auth.routes';
import productsRoutes from './products.routes';
import categoriesRoutes from './categories.routes';
import cartRoutes from './cart.routes';
import ordersRoutes from './orders.routes';
import paymentsRoutes from './payments.routes';
import menuRoutes from './menu.routes';
import adminRoutes from './admin';

const router = Router();

router.use('/auth', authRoutes);
router.use('/products', productsRoutes);
router.use('/categories', categoriesRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', ordersRoutes);
router.use('/payments', paymentsRoutes);
router.use('/menu', menuRoutes);
router.use('/admin', adminRoutes);

export default router;
