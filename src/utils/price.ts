import { env } from '../config/env';

export function usdToMad(usd: number): number {
  return Math.round(usd * env.USD_TO_MAD_RATE * env.MARKUP_MULTIPLIER);
}
