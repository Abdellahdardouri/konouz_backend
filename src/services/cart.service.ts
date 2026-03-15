import prisma from '../config/db';
import { env } from '../config/env';

const cartItemInclude = {
  product: {
    include: {
      images: { orderBy: { sortOrder: 'asc' as const } },
      variants: true,
    },
  },
  variant: true,
};

function formatCart(cart: any) {
  const lines = cart.items.map((item: any) => {
    const product = item.product;
    const images = product.images.map((img: any) => ({
      url: img.url,
      altText: img.altText || product.title,
      width: img.width,
      height: img.height,
    }));

    const lineTotal = Number(item.variant.priceMAD) * item.quantity;

    return {
      id: item.id,
      quantity: item.quantity,
      cost: {
        totalAmount: { amount: String(lineTotal.toFixed(2)), currencyCode: 'MAD' },
      },
      merchandise: {
        id: item.variantId,
        title: item.variant.title,
        selectedOptions: [{ name: item.variant.optionName, value: item.variant.optionValue }],
        product: {
          id: product.id,
          handle: product.handle,
          availableForSale: product.availableForSale,
          title: product.title,
          description: product.description,
          descriptionHtml: product.descriptionHtml,
          options: [{ id: 'option-1', name: item.variant.optionName, values: product.variants.map((v: any) => v.optionValue) }],
          priceRange: {
            maxVariantPrice: { amount: String(product.priceMAD), currencyCode: 'MAD' },
            minVariantPrice: { amount: String(product.priceMAD), currencyCode: 'MAD' },
          },
          variants: product.variants.map((v: any) => ({
            id: v.id,
            title: v.title,
            availableForSale: v.availableForSale,
            selectedOptions: [{ name: v.optionName, value: v.optionValue }],
            price: { amount: String(v.priceMAD), currencyCode: 'MAD' },
          })),
          featuredImage: images[0] || { url: '', altText: '', width: 800, height: 1000 },
          images,
          seo: { title: product.title, description: product.description },
          tags: product.tags,
          updatedAt: product.updatedAt.toISOString(),
        },
      },
    };
  });

  const subtotal = lines.reduce((sum: number, line: any) => sum + Number(line.cost.totalAmount.amount), 0);
  const totalQuantity = lines.reduce((sum: number, line: any) => sum + line.quantity, 0);

  return {
    id: cart.id,
    checkoutUrl: `${env.FRONTEND_URL}/checkout`,
    cost: {
      subtotalAmount: { amount: String(subtotal.toFixed(2)), currencyCode: 'MAD' },
      totalTaxAmount: { amount: '0.00', currencyCode: 'MAD' },
      totalAmount: { amount: String(subtotal.toFixed(2)), currencyCode: 'MAD' },
    },
    lines,
    totalQuantity,
  };
}

export async function createCart() {
  const cart = await prisma.cart.create({
    data: {},
    include: { items: { include: cartItemInclude } },
  });
  return formatCart(cart);
}

export async function getCart(cartId: string) {
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: { items: { include: cartItemInclude } },
  });
  if (!cart) return undefined;
  return formatCart(cart);
}

export async function addToCart(cartId: string, lines: { merchandiseId: string; quantity: number }[]) {
  for (const line of lines) {
    const variant = await prisma.productVariant.findUnique({ where: { id: line.merchandiseId } });
    if (!variant) continue;

    await prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId, variantId: line.merchandiseId } },
      create: {
        cartId,
        productId: variant.productId,
        variantId: line.merchandiseId,
        quantity: line.quantity,
      },
      update: {
        quantity: { increment: line.quantity },
      },
    });
  }

  return getCart(cartId);
}

export async function removeFromCart(cartId: string, lineIds: string[]) {
  await prisma.cartItem.deleteMany({
    where: { id: { in: lineIds }, cartId },
  });
  return getCart(cartId);
}

export async function updateCart(cartId: string, lines: { id: string; merchandiseId: string; quantity: number }[]) {
  for (const line of lines) {
    if (line.quantity <= 0) {
      await prisma.cartItem.deleteMany({ where: { id: line.id, cartId } });
    } else {
      await prisma.cartItem.updateMany({
        where: { id: line.id, cartId },
        data: { quantity: line.quantity },
      });
    }
  }
  return getCart(cartId);
}
