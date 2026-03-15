import prisma from '../config/db';
import { Decimal } from '@prisma/client/runtime/library';

const productInclude = {
  images: { orderBy: { sortOrder: 'asc' as const } },
  variants: true,
  category: true,
};

function formatProduct(p: any) {
  const images = p.images.map((img: any) => ({
    url: img.url,
    altText: img.altText || p.title,
    width: img.width,
    height: img.height,
  }));

  const variants = p.variants.map((v: any) => ({
    id: v.id,
    title: v.title,
    availableForSale: v.availableForSale,
    selectedOptions: [{ name: v.optionName, value: v.optionValue }],
    price: { amount: String(v.priceMAD), currencyCode: 'MAD' },
    image: images[0] ? { originalSrc: images[0].url } : { originalSrc: '' },
  }));

  const priceAmount = String(p.priceMAD);
  const compareAmount = p.comparePriceMAD ? String(p.comparePriceMAD) : priceAmount;

  return {
    id: p.id,
    handle: p.handle,
    availableForSale: p.availableForSale,
    title: p.title,
    description: p.description,
    descriptionHtml: p.descriptionHtml || `<p>${p.description}</p>`,
    options: p.variants.length > 0
      ? [{ id: 'option-1', name: p.variants[0].optionName, values: p.variants.map((v: any) => v.optionValue) }]
      : [{ id: 'option-1', name: 'Title', values: ['Default Title'] }],
    priceRange: {
      maxVariantPrice: { amount: priceAmount, currencyCode: 'MAD' },
      minVariantPrice: { amount: priceAmount, currencyCode: 'MAD' },
    },
    variants,
    featuredImage: images[0] || { url: '', altText: '', width: 800, height: 1000 },
    images,
    seo: {
      title: p.seoTitle || p.title,
      description: p.seoDescription || p.description,
    },
    tags: p.tags,
    updatedAt: p.updatedAt.toISOString(),
  };
}

export async function getProducts(options: {
  query?: string;
  sortKey?: string;
  reverse?: boolean;
  first?: number;
  categoryId?: string;
  tag?: string;
}) {
  const { query, sortKey, reverse, first = 100, categoryId, tag } = options;

  const where: any = {};
  if (query) {
    where.OR = [
      { title: { contains: query, mode: 'insensitive' } },
      { titleEn: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
    ];
  }
  if (categoryId) where.categoryId = categoryId;
  if (tag) where.tags = { has: tag };

  let orderBy: any = { createdAt: 'desc' };
  switch (sortKey) {
    case 'BEST_SELLING':
      orderBy = { isBestSeller: 'desc' };
      break;
    case 'CREATED_AT':
      orderBy = { createdAt: reverse ? 'asc' : 'desc' };
      break;
    case 'PRICE':
      orderBy = { priceMAD: reverse ? 'desc' : 'asc' };
      break;
    case 'RELEVANCE':
    default:
      orderBy = { createdAt: 'desc' };
  }

  const products = await prisma.product.findMany({
    where,
    include: productInclude,
    orderBy,
    take: first,
  });

  return products.map(formatProduct);
}

export async function getProductByHandle(handle: string) {
  const product = await prisma.product.findUnique({
    where: { handle },
    include: productInclude,
  });
  if (!product) return undefined;
  return formatProduct(product);
}

export async function getProductRecommendations(productId: string, first = 4) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return [];

  const products = await prisma.product.findMany({
    where: {
      categoryId: product.categoryId,
      id: { not: productId },
    },
    include: productInclude,
    take: first,
  });

  return products.map(formatProduct);
}

export async function getRecommendationsByHandle(handle: string, first = 4) {
  const product = await prisma.product.findUnique({ where: { handle } });
  if (!product) return [];
  return getProductRecommendations(product.id, first);
}
