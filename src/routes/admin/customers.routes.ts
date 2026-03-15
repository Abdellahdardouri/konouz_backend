import { Router, Request, Response } from 'express';
import prisma from '../../config/db';
import { success, error, paginated } from '../../utils/response';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  try {
    // Get registered customers
    const [registeredCustomers, registeredTotal] = await Promise.all([
      prisma.user.findMany({
        where: { role: 'CUSTOMER' },
        select: {
          id: true, email: true, firstName: true, lastName: true,
          phone: true, createdAt: true,
          _count: { select: { orders: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
    ]);

    // Get guest customers (orders without userId, grouped by customerName+customerPhone)
    const guestOrders = await prisma.order.findMany({
      where: { userId: null },
      select: {
        id: true,
        customerName: true,
        customerPhone: true,
        customerCity: true,
        customerAddress: true,
        totalMAD: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group guest orders by phone (unique identifier for guests)
    const guestMap = new Map<string, {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      createdAt: string;
      orderCount: number;
      isGuest: boolean;
    }>();

    for (const order of guestOrders) {
      const key = order.customerPhone || order.customerName || order.id;
      if (!guestMap.has(key)) {
        const nameParts = (order.customerName || '').split(' ');
        guestMap.set(key, {
          id: `guest-${key}`,
          firstName: nameParts[0] || 'زائر',
          lastName: nameParts.slice(1).join(' ') || '',
          email: '',
          phone: order.customerPhone || '',
          createdAt: order.createdAt.toISOString(),
          orderCount: 1,
          isGuest: true,
        });
      } else {
        guestMap.get(key)!.orderCount++;
      }
    }

    const guestCustomers = Array.from(guestMap.values());

    // Merge registered + guest, sort by date
    const allCustomers = [
      ...registeredCustomers.map(c => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
        createdAt: c.createdAt.toISOString(),
        orderCount: c._count.orders,
        isGuest: false,
      })),
      ...guestCustomers,
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = allCustomers.length;
    const paged = allCustomers.slice((page - 1) * limit, page * limit);

    paginated(res, paged, total, page, limit);
  } catch (e: any) {
    error(res, e.message, 500);
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;

  // Check if it's a guest customer
  if (id.startsWith('guest-')) {
    const key = id.replace('guest-', '');
    const orders = await prisma.order.findMany({
      where: {
        userId: null,
        OR: [
          { customerPhone: key },
          { customerName: key },
        ],
      },
      select: {
        id: true, orderNumber: true, totalMAD: true, status: true,
        customerName: true, customerPhone: true, customerCity: true,
        customerAddress: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (orders.length === 0) return error(res, 'العميل غير موجود', 404);

    const first = orders[0];
    const nameParts = (first.customerName || '').split(' ');

    return success(res, {
      id,
      firstName: nameParts[0] || 'زائر',
      lastName: nameParts.slice(1).join(' ') || '',
      email: '',
      phone: first.customerPhone || '',
      createdAt: first.createdAt.toISOString(),
      isGuest: true,
      orders: orders.map(o => ({
        id: o.id,
        orderNumber: o.orderNumber,
        totalMAD: o.totalMAD,
        status: o.status,
        createdAt: o.createdAt.toISOString(),
      })),
      addresses: orders
        .filter(o => o.customerAddress || o.customerCity)
        .map((o, i) => ({
          id: `addr-${i}`,
          line1: o.customerAddress || '',
          city: o.customerCity || '',
          isDefault: i === 0,
        }))
        .filter((a, i, arr) => arr.findIndex(x => x.line1 === a.line1 && x.city === a.city) === i),
    });
  }

  // Regular registered customer
  const customer = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, email: true, firstName: true, lastName: true, phone: true, createdAt: true,
      orders: { include: { payment: true }, orderBy: { createdAt: 'desc' } },
      addresses: true,
    },
  });
  if (!customer) return error(res, 'العميل غير موجود', 404);
  success(res, customer);
});

export default router;
