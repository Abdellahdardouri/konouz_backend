import prisma from '../config/db';

export async function getOverview() {
  const [totalOrders, totalCustomers, revenueResult, pendingOrders] = await Promise.all([
    prisma.order.count(),
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.order.aggregate({
      _sum: { totalMAD: true },
      where: { status: { not: 'CANCELLED' } },
    }),
    prisma.order.count({ where: { status: 'PENDING' } }),
  ]);

  const totalRevenue = Number(revenueResult._sum.totalMAD || 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return {
    totalOrders,
    totalRevenue,
    totalCustomers,
    avgOrderValue,
    pendingOrders,
  };
}

export async function getRevenueByPeriod(days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: since }, status: { not: 'CANCELLED' } },
    select: { totalMAD: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  return orders.map((o) => ({
    date: o.createdAt.toISOString().split('T')[0],
    revenue: Number(o.totalMAD),
  }));
}

export async function getBestSellers(limit = 10) {
  const items = await prisma.orderItem.groupBy({
    by: ['productId'],
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: limit,
  });

  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { images: { where: { isPrimary: true }, take: 1 } },
  });

  return items.map((item) => {
    const product = products.find((p) => p.id === item.productId);
    return {
      productId: item.productId,
      title: product?.title || '',
      imageUrl: product?.images[0]?.url || '',
      totalSold: item._sum.quantity || 0,
    };
  });
}

export async function getOrdersByStatus() {
  const result = await prisma.order.groupBy({
    by: ['status'],
    _count: true,
  });
  return result.map((r) => ({ status: r.status, count: r._count }));
}

export async function getLowStockProducts(threshold = 5) {
  return prisma.product.findMany({
    where: { stockQuantity: { lte: threshold } },
    select: { id: true, title: true, handle: true, stockQuantity: true },
    orderBy: { stockQuantity: 'asc' },
  });
}
