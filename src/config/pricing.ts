// Pricing config for app A. Prices set by the CEO (giao ban 2026-11-05): yearly only, no monthly price.
// Plan limits are NOT final yet (waiting for Planning & Finance), so they are not listed here.

export type PlanId = 'free' | 'pro' | 'business';

export type Plan = {
  id: PlanId;
  name: string;
  priceUsdPerYear: number;
  hasAds: boolean;
};

export const PLANS: Plan[] = [
  { id: 'free', name: 'Free', priceUsdPerYear: 0, hasAds: true },
  { id: 'pro', name: 'Pro', priceUsdPerYear: 1.99, hasAds: false },
  { id: 'business', name: 'Business', priceUsdPerYear: 4.99, hasAds: false },
];

export function formatUsdPerYear(plan: Plan): string {
  if (plan.priceUsdPerYear === 0) return '0 USD';
  return `${plan.priceUsdPerYear.toFixed(2)} USD/năm`;
}
