import { NextResponse } from 'next/server';
import { getStripe } from '../../../../lib/stripe/server';
import { checkRateLimit } from '../../../../lib/security/rateLimit';

export async function POST(req) {
  try {
    const rl = await checkRateLimit(req, { keyPrefix: 'stripe_checkout', limit: 30, windowMs: 60_000 });
    if (!rl.ok) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

    const body = await req.json();
    const { items, customer } = body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty.' }, { status: 400 });
    }

    if (items.length > 50) {
      return NextResponse.json({ error: 'Too many items.' }, { status: 400 });
    }

    const email = customer?.email ? String(customer.email).trim() : '';
    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const origin = req.headers.get('origin');
    if (!origin) {
      return NextResponse.json({ error: 'Missing origin.' }, { status: 400 });
    }

    const line_items = items.map((it) => {
      const name = String(it?.name || 'Item');
      const quantity = Number(it?.qty || 1);
      const unitAmount = Number(it?.unitAmount || 0);
      const currency = it?.currency ? String(it.currency).toLowerCase() : 'usd';

      if (!Number.isFinite(quantity) || quantity < 1) throw new Error('Invalid quantity');
      if (!Number.isFinite(unitAmount) || unitAmount < 0) throw new Error('Invalid unit amount');
      if (name.length > 200) throw new Error('Invalid name');
      if (!/^[a-z]{3}$/i.test(currency)) throw new Error('Invalid currency');

      return {
        price_data: {
          currency,
          product_data: {
            name,
          },
          unit_amount: Math.round(unitAmount),
        },
        quantity,
      };
    });

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Add STRIPE_SECRET_KEY (test mode) in .env.local and restart the dev server.' },
        { status: 500 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      customer_email: email,
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart`,
      metadata: {
        customer_json: JSON.stringify(customer || {}),
        cart_json: JSON.stringify(items),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create checkout session.' },
      { status: 500 }
    );
  }
}
