// Pricing config for app A. Must match the App Store Connect subscriptions (group "Quoivo Pro"):
// Pro Monthly 1.99 USD, Pro Yearly 9.99 USD. Plan limits are NOT final yet (waiting for Planning & Finance).

export type PlanId = 'free' | 'pro';
export type Period = 'month' | 'year';

export type PlanPrice = { period: Period; usd: number };

export type Plan = {
  id: PlanId;
  name: string;
  prices: PlanPrice[];
  hasAds: boolean;
};

export const PLANS: Plan[] = [
  { id: 'free', name: 'Free', prices: [], hasAds: true },
  {
    id: 'pro',
    name: 'Pro',
    prices: [
      { period: 'month', usd: 1.99 },
      { period: 'year', usd: 9.99 },
    ],
    hasAds: false,
  },
];

export function formatPrice(price: PlanPrice): string {
  return `${price.usd.toFixed(2)} USD/${price.period === 'month' ? 'tháng' : 'năm'}`;
}

// Lines to show for a plan; Free has no price.
export function formatPlanPrices(plan: Plan): string[] {
  if (plan.prices.length === 0) return ['0 USD'];
  return plan.prices.map(formatPrice);
}
