import { NextResponse } from 'next/server';
import { getStripe } from '../../../../lib/stripe/server';
import { getAdminDb } from '../../../../lib/firebase/admin';
import { checkRateLimit } from '../../../../lib/security/rateLimit';

export const runtime = 'nodejs';

export async function POST(req) {
  const rl = await checkRateLimit(req, { keyPrefix: 'stripe_webhook', limit: 120, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe is not configured. Add STRIPE_SECRET_KEY in .env.local.' },
      { status: 500 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'Missing STRIPE_WEBHOOK_SECRET in .env.local.' },
      { status: 500 }
    );
  }

  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });

  const rawBody = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Invalid signature' },
      { status: 400 }
    );
  }

  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json(
      { error: 'Firebase Admin is not configured.' },
      { status: 500 }
    );
  }

  // Idempotency: store processed event IDs
  const eventRef = adminDb.collection('stripe_events').doc(event.id);
  const existing = await eventRef.get();
  if (existing.exists) {
    return NextResponse.json({ received: true, deduped: true });
  }
  await eventRef.set({ type: event.type, createdAt: new Date() });

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const paymentIntentId = session?.payment_intent || null;
      if (paymentIntentId) {
        const q = await adminDb
          .collection('orders')
          .where('payment.paymentIntentId', '==', paymentIntentId)
          .limit(1)
          .get();

        if (!q.empty) {
          const doc = q.docs[0];
          await doc.ref.update({
            'payment.status': session?.payment_status || 'paid',
            'totals.subtotal': session?.amount_subtotal || 0,
            'totals.total': session?.amount_total || 0,
            'totals.currency': session?.currency || 'usd',
            updatedAt: new Date(),
          });
        }
      }
    }

    if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object;
      const paymentIntentId = pi?.id || null;
      if (paymentIntentId) {
        const q = await adminDb
          .collection('orders')
          .where('payment.paymentIntentId', '==', paymentIntentId)
          .limit(1)
          .get();

        if (!q.empty) {
          const doc = q.docs[0];
          await doc.ref.update({
            'payment.status': 'failed',
            updatedAt: new Date(),
          });
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
