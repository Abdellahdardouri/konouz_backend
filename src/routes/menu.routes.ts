import { Router, Request, Response } from 'express';
import prisma from '../config/db';
import { success } from '../utils/response';

const router = Router();

router.get('/:handle', async (_req: Request, res: Response) => {
  const categories = await prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });

  const menu = [
    { title: 'كل المنتجات', path: '/search', items: [] },
    ...categories.map((cat) => ({
      title: cat.title,
      path: `/search/${cat.handle}`,
      items: [],
    })),
    { title: 'وصل حديثاً', path: '/search/new-arrivals', items: [] },
    { title: 'المنتجات الرائجة', path: '/search/trending', items: [] },
    { title: 'من نحن', path: '/about-us', items: [] },
  ];

  success(res, menu);
});

export default router;
