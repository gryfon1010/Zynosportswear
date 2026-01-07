import Stripe from 'stripe';

let stripeSingleton;

export function getStripe() {
  if (stripeSingleton) return stripeSingleton;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return null;
  }

  stripeSingleton = new Stripe(secretKey, {
    apiVersion: '2024-06-20',
  });

  return stripeSingleton;
}
