import { Router, Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { success, error } from '../utils/response';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;
    if (!email || !password || !firstName || !lastName) {
      return error(res, 'جميع الحقول مطلوبة');
    }
    const result = await authService.register({ email, password, firstName, lastName, phone });
    success(res, result, 201);
  } catch (e: any) {
    error(res, e.message);
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return error(res, 'البريد وكلمة المرور مطلوبان');
    const result = await authService.login(email, password);
    success(res, result);
  } catch (e: any) {
    error(res, e.message, 401);
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return error(res, 'رمز التحديث مطلوب');
    const result = await authService.refreshAccessToken(refreshToken);
    success(res, result);
  } catch (e: any) {
    error(res, e.message, 401);
  }
});

router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await authService.getProfile(req.user!.id);
    success(res, user);
  } catch (e: any) {
    error(res, e.message);
  }
});

router.patch('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await authService.updateProfile(req.user!.id, req.body);
    success(res, user);
  } catch (e: any) {
    error(res, e.message);
  }
});

export default router;
