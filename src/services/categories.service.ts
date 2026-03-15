import prisma from '../config/db';

function formatCollection(cat: any) {
  return {
    handle: cat.handle,
    title: cat.title,
    description: cat.description,
    seo: { title: cat.title, description: cat.description },
    path: `/search/${cat.handle}`,
    updatedAt: cat.updatedAt?.toISOString() || new Date().toISOString(),
  };
}

export async function getCollections() {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: 'asc' },
  });

  return [
    {
      handle: '',
      title: 'الكل',
      description: 'جميع المنتجات',
      seo: { title: 'الكل', description: 'جميع المنتجات' },
      path: '/search',
      updatedAt: new Date().toISOString(),
    },
    ...categories.map(formatCollection),
  ];
}

export async function getCollection(handle: string) {
  const cat = await prisma.category.findUnique({ where: { handle } });
  if (!cat) return undefined;
  return formatCollection(cat);
}

export async function getCollectionProducts(options: {
  collection: string;
  sortKey?: string;
  reverse?: boolean;
  first?: number;
}) {
  const { collection, sortKey, reverse, first = 100 } = options;

  const category = await prisma.category.findUnique({ where: { handle: collection } });
  if (!category) return [];

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
  }

  const products = await prisma.product.findMany({
    where: { categoryId: category.id },
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      variants: true,
      category: true,
    },
    orderBy,
    take: first,
  });

  // Reuse the formatter from products service
  const { getProducts } = await import('./products.service');
  return products.map((p: any) => {
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
    return {
      id: p.id,
      handle: p.handle,
      availableForSale: p.availableForSale,
      title: p.title,
      description: p.description,
      descriptionHtml: p.descriptionHtml || `<p>${p.description}</p>`,
      options: [{ id: 'option-1', name: p.variants[0]?.optionName || 'Title', values: p.variants.map((v: any) => v.optionValue) }],
      priceRange: {
        maxVariantPrice: { amount: priceAmount, currencyCode: 'MAD' },
        minVariantPrice: { amount: priceAmount, currencyCode: 'MAD' },
      },
      variants,
      featuredImage: images[0] || { url: '', altText: '', width: 800, height: 1000 },
      images,
      seo: { title: p.seoTitle || p.title, description: p.seoDescription || p.description },
      tags: p.tags,
      updatedAt: p.updatedAt.toISOString(),
    };
  });
}
