import { Router, Request, Response } from 'express';
import prisma from '../../config/db';
import cloudinary from '../../config/cloudinary';
import multer from 'multer';
import { success, error, paginated } from '../../utils/response';
import { slugify } from '../../utils/slug';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const q = req.query.q as string;
  const categoryId = req.query.categoryId as string;

  const where: any = {};
  if (q) where.OR = [{ title: { contains: q, mode: 'insensitive' } }, { titleEn: { contains: q, mode: 'insensitive' } }];
  if (categoryId) where.categoryId = categoryId;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { images: { where: { isPrimary: true }, take: 1 }, category: true, _count: { select: { orderItems: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  paginated(res, products, total, page, limit);
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        variants: true,
        category: true,
      },
    });
    if (!product) return error(res, 'المنتج غير موجود', 404);
    success(res, product);
  } catch (e: any) {
    error(res, e.message);
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, titleEn, description, categoryId, priceMAD, comparePriceMAD, tags, stockQuantity, isFeatured, isBestSeller, isNewArrival } = req.body;
    const handle = slugify(titleEn || title);

    const product = await prisma.product.create({
      data: {
        handle,
        title,
        titleEn,
        description: description || '',
        descriptionHtml: description ? `<p>${description}</p>` : '',
        categoryId,
        priceMAD,
        comparePriceMAD,
        tags: tags || [],
        stockQuantity: stockQuantity || 100,
        isFeatured: isFeatured || false,
        isBestSeller: isBestSeller || false,
        isNewArrival: isNewArrival || false,
        variants: {
          create: {
            title: 'Default Title',
            priceMAD,
            optionName: 'Title',
            optionValue: 'Default Title',
          },
        },
      },
      include: { images: true, variants: true, category: true },
    });
    success(res, product, 201);
  } catch (e: any) {
    error(res, e.message);
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: req.body,
      include: { images: true, variants: true, category: true },
    });
    // Also update variant price if product price changed
    if (req.body.priceMAD) {
      await prisma.productVariant.updateMany({
        where: { productId: req.params.id },
        data: { priceMAD: req.body.priceMAD },
      });
    }
    success(res, product);
  } catch (e: any) {
    error(res, e.message);
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    // Delete images from Cloudinary first
    const images = await prisma.productImage.findMany({ where: { productId: req.params.id } });
    for (const img of images) {
      try { await cloudinary.uploader.destroy(img.publicId); } catch {}
    }
    await prisma.product.delete({ where: { id: req.params.id } });
    success(res, { deleted: true });
  } catch (e: any) {
    error(res, e.message);
  }
});

router.post('/:id/images', upload.array('images', 10), async (req: Request, res: Response) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) return error(res, 'المنتج غير موجود', 404);

    const files = req.files as Express.Multer.File[];
    if (!files?.length) return error(res, 'لا توجد صور');

    const existingCount = await prisma.productImage.count({ where: { productId: product.id } });
    const createdImages = [];

    for (let i = 0; i < files.length; i++) {
      const b64 = files[i].buffer.toString('base64');
      const dataUri = `data:${files[i].mimetype};base64,${b64}`;
      const result = await cloudinary.uploader.upload(dataUri, {
        folder: `konouz/products/${product.handle}`,
      });

      const image = await prisma.productImage.create({
        data: {
          productId: product.id,
          url: result.secure_url,
          publicId: result.public_id,
          altText: product.title,
          width: result.width,
          height: result.height,
          sortOrder: existingCount + i,
          isPrimary: existingCount === 0 && i === 0,
        },
      });
      createdImages.push(image);
    }

    success(res, createdImages, 201);
  } catch (e: any) {
    error(res, e.message, 500);
  }
});

router.delete('/:id/images/:imageId', async (req: Request, res: Response) => {
  try {
    const image = await prisma.productImage.findUnique({ where: { id: req.params.imageId } });
    if (!image) return error(res, 'الصورة غير موجودة', 404);
    try { await cloudinary.uploader.destroy(image.publicId); } catch {}
    await prisma.productImage.delete({ where: { id: req.params.imageId } });
    success(res, { deleted: true });
  } catch (e: any) {
    error(res, e.message);
  }
});

export default router;
