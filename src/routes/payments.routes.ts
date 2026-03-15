import { Router, Request, Response } from 'express';
import stripe from '../config/stripe';
import prisma from '../config/db';
import { optionalAuth, AuthRequest } from '../middleware/auth';
import { success, error } from '../utils/response';

const router = Router();

router.post('/stripe/create-intent', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return error(res, 'معرف الطلب مطلوب');

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });
    if (!order) return error(res, 'الطلب غير موجود', 404);
    if (order.payment?.method !== 'STRIPE') return error(res, 'طريقة الدفع غير صحيحة');

    const amountInCents = Math.round(Number(order.totalMAD) * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'mad',
      metadata: { orderId: order.id, orderNumber: String(order.orderNumber) },
    });

    await prisma.payment.update({
      where: { orderId: order.id },
      data: { stripePaymentId: paymentIntent.id },
    });

    success(res, { clientSecret: paymentIntent.client_secret });
  } catch (e: any) {
    error(res, e.message, 500);
  }
});

router.post('/stripe/webhook', async (req: Request, res: Response) => {
  try {
    const event = req.body;

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      await prisma.payment.updateMany({
        where: { stripePaymentId: paymentIntent.id },
        data: { status: 'SUCCEEDED', paidAt: new Date() },
      });
      if (paymentIntent.metadata?.orderId) {
        await prisma.order.update({
          where: { id: paymentIntent.metadata.orderId },
          data: { status: 'CONFIRMED' },
        });
      }
    }

    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object;
      await prisma.payment.updateMany({
        where: { stripePaymentId: paymentIntent.id },
        data: { status: 'FAILED' },
      });
    }

    res.json({ received: true });
  } catch (e: any) {
    error(res, e.message, 500);
  }
});

export default router;
