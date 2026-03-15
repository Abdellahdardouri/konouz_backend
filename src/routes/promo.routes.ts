import { Router, Request, Response } from 'express';
import prisma from '../config/db';
import { success, error } from '../utils/response';

const router = Router();

// Public: validate a promo code and preview the discount
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { code, subtotal } = req.body;
    if (!code) return error(res, 'كود الخصم مطلوب');

    const promo = await prisma.promoCode.findUnique({ where: { code } });

    if (!promo || !promo.isActive) {
      return error(res, 'كود الخصم غير صالح', 400);
    }

    const now = new Date();
    if (now < promo.validFrom || now > promo.validUntil) {
      return error(res, 'كود الخصم منتهي الصلاحية', 400);
    }

    if (promo.maxUsageCount && promo.usedCount >= promo.maxUsageCount) {
      return error(res, 'تم استنفاد عدد مرات استخدام هذا الكود', 400);
    }

    const orderSubtotal = Number(subtotal) || 0;
    if (promo.minOrderMAD && orderSubtotal < Number(promo.minOrderMAD)) {
      return error(res, `الحد الأدنى للطلب هو ${Number(promo.minOrderMAD).toFixed(0)} د.م.`, 400);
    }

    let discount = 0;
    if (promo.type === 'PERCENTAGE') {
      discount = orderSubtotal * Number(promo.value) / 100;
    } else {
      discount = Number(promo.value);
    }

    success(res, {
      code: promo.code,
      type: promo.type,
      value: Number(promo.value),
      discount: Math.min(discount, orderSubtotal),
    });
  } catch (e: any) {
    error(res, e.message, 500);
  }
});

export default router;
