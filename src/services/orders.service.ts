import prisma from '../config/db';
import { PaymentMethod, PaymentStatus, OrderStatus } from '@prisma/client';

export async function createOrder(data: {
  cartId: string;
  userId?: string;
  customerName: string;
  customerPhone: string;
  customerCity: string;
  customerAddress: string;
  paymentMethod: 'STRIPE' | 'CASH_ON_DELIVERY';
  promoCode?: string;
  notes?: string;
}) {
  const cart = await prisma.cart.findUnique({
    where: { id: data.cartId },
    include: {
      items: {
        include: {
          product: true,
          variant: true,
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    throw new Error('السلة فارغة');
  }

  // Calculate subtotal
  let subtotal = 0;
  const orderItems = cart.items.map((item) => {
    const price = Number(item.variant.priceMAD);
    subtotal += price * item.quantity;
    return {
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      priceMAD: item.variant.priceMAD,
      title: item.product.title,
    };
  });

  // Apply promo code if provided
  let discount = 0;
  let promoCodeId: string | undefined;
  if (data.promoCode) {
    const promo = await prisma.promoCode.findUnique({ where: { code: data.promoCode } });
    if (promo && promo.isActive) {
      const now = new Date();
      if (now >= promo.validFrom && now <= promo.validUntil) {
        if (!promo.maxUsageCount || promo.usedCount < promo.maxUsageCount) {
          if (!promo.minOrderMAD || subtotal >= Number(promo.minOrderMAD)) {
            if (promo.type === 'PERCENTAGE') {
              discount = subtotal * Number(promo.value) / 100;
            } else {
              discount = Number(promo.value);
            }
            promoCodeId = promo.id;
            await prisma.promoCode.update({
              where: { id: promo.id },
              data: { usedCount: { increment: 1 } },
            });
          }
        }
      }
    }
  }

  const total = Math.max(0, subtotal - discount);

  // Create order
  const order = await prisma.order.create({
    data: {
      userId: data.userId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerCity: data.customerCity,
      customerAddress: data.customerAddress,
      status: data.paymentMethod === 'CASH_ON_DELIVERY' ? 'CONFIRMED' : 'PENDING',
      subtotalMAD: subtotal,
      discountMAD: discount,
      shippingMAD: 0,
      totalMAD: total,
      promoCodeId,
      notes: data.notes,
      items: { create: orderItems },
      payment: {
        create: {
          method: data.paymentMethod as PaymentMethod,
          status: data.paymentMethod === 'CASH_ON_DELIVERY' ? 'PENDING' : 'PENDING',
          amountMAD: total,
        },
      },
    },
    include: {
      items: { include: { product: true } },
      payment: true,
    },
  });

  // Clear cart after order
  await prisma.cartItem.deleteMany({ where: { cartId: data.cartId } });

  return order;
}

export async function getOrder(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { product: { include: { images: { where: { isPrimary: true } } } } } },
      payment: true,
    },
  });
}

export async function getUserOrders(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    include: {
      items: { include: { product: { include: { images: { where: { isPrimary: true } } } } } },
      payment: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  return prisma.order.update({
    where: { id: orderId },
    data: { status },
    include: { items: true, payment: true },
  });
}

export async function getAllOrders(options: { status?: string; page?: number; limit?: number }) {
  const { status, page = 1, limit = 20 } = options;
  const where: any = {};
  if (status) where.status = status;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        items: { include: { product: true } },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  return { orders, total };
}
