import { Router, Request, Response } from 'express';
import prisma from '../../config/db';
import { success, error } from '../../utils/response';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const promos = await prisma.promoCode.findMany({ orderBy: { createdAt: 'desc' } });
  success(res, promos);
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { code, type, value, minOrderMAD, maxUsageCount, validFrom, validUntil } = req.body;
    const promo = await prisma.promoCode.create({
      data: {
        code: code.toUpperCase(),
        type,
        value,
        minOrderMAD,
        maxUsageCount,
        validFrom: new Date(validFrom),
        validUntil: new Date(validUntil),
      },
    });
    success(res, promo, 201);
  } catch (e: any) {
    error(res, e.message);
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const promo = await prisma.promoCode.update({
      where: { id: req.params.id },
      data: req.body,
    });
    success(res, promo);
  } catch (e: any) {
    error(res, e.message);
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.promoCode.delete({ where: { id: req.params.id } });
    success(res, { deleted: true });
  } catch (e: any) {
    error(res, e.message);
  }
});

export default router;
