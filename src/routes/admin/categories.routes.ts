import { Router, Request, Response } from 'express';
import prisma from '../../config/db';
import { success, error } from '../../utils/response';
import { slugify } from '../../utils/slug';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { products: true } } },
  });
  success(res, categories);
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, titleEn, description, imageUrl, sortOrder } = req.body;
    const handle = slugify(titleEn || title);
    const category = await prisma.category.create({
      data: { handle, title, titleEn, description, imageUrl, sortOrder: sortOrder || 0 },
    });
    success(res, category, 201);
  } catch (e: any) {
    error(res, e.message);
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: req.body,
    });
    success(res, category);
  } catch (e: any) {
    error(res, e.message);
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const count = await prisma.product.count({ where: { categoryId: req.params.id } });
    if (count > 0) return error(res, `لا يمكن حذف التصنيف - يحتوي على ${count} منتج`);
    await prisma.category.delete({ where: { id: req.params.id } });
    success(res, { deleted: true });
  } catch (e: any) {
    error(res, e.message);
  }
});

export default router;
