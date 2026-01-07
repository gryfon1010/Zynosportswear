import { NextResponse } from 'next/server';
import { getStripe } from '../../../../lib/stripe/server';
import { getAdminDb } from '../../../../lib/firebase/admin';
import { generateRandomToken, sha256Hex } from '../../../../lib/crypto';
import { tryGetUser } from '../../../../lib/user/auth';

export async function POST(req) {
  try {
    const userResult = await tryGetUser(req);
    const user = userResult?.user || null;

    const body = await req.json();
    const { sessionId } = body || {};

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Add STRIPE_SECRET_KEY (test mode) in .env.local and restart the dev server.' },
        { status: 500 }
      );
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return NextResponse.json({ error: 'Checkout session not found' }, { status: 404 });
    }

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json(
        {
          error:
            'Firebase Admin is not configured. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY in .env.local and restart the dev server.',
        },
        { status: 500 }
      );
    }

    const existing = await adminDb
      .collection('orders')
      .where('payment.paymentIntentId', '==', session.payment_intent)
      .limit(1)
      .get();

    if (!existing.empty) {
      const doc = existing.docs[0];

      const accessToken = generateRandomToken(32);
      const accessTokenHash = sha256Hex(accessToken);
      await doc.ref.update({
        accessTokenHash,
        accessTokenCreatedAt: new Date(),
        accessTokenLastUsedAt: null,
        updatedAt: new Date(),
      });

      const origin = req.headers.get('origin') || '';
      const orderLink = `${origin}/order/${doc.id}?token=${accessToken}`;

      console.log('[MVP] Guest order link (reissued token):', orderLink);

      return NextResponse.json({
        orderId: doc.id,
        alreadyCreated: true,
        orderLink,
      });
    }

    const customer = safeJsonParse(session.metadata?.customer_json) || {};
    const cartItems = safeJsonParse(session.metadata?.cart_json) || [];

    const accessToken = generateRandomToken(32);
    const accessTokenHash = sha256Hex(accessToken);

    const now = new Date();

    const orderDoc = {
      customerType: user ? 'user' : 'guest',
      userId: user?.uid || null,
      email: session.customer_details?.email || user?.email || customer?.email || null,
      phone: session.customer_details?.phone || customer?.phone || null,
      items: Array.isArray(cartItems)
        ? cartItems.map((it) => ({
            productId: it?.productId || null,
            sku: it?.sku || null,
            name: it?.name || null,
            qty: Number(it?.qty || 1),
            unitAmount: Number(it?.unitAmount || 0),
            imageUrl: it?.imageUrl || null,
          }))
        : [],
      totals: {
        subtotal: session.amount_subtotal || 0,
        total: session.amount_total || 0,
        currency: session.currency || 'usd',
      },
      shippingAddress: customer?.shippingAddress || null,
      billingAddress: customer?.billingAddress || null,
      payment: {
        provider: 'stripe',
        paymentIntentId: session.payment_intent || null,
        status: session.payment_status,
      },
      fulfillment: {
        status: 'unfulfilled',
      },
      accessTokenHash,
      accessTokenCreatedAt: now,
      accessTokenLastUsedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const createdRef = await adminDb.collection('orders').add(orderDoc);

    const origin = req.headers.get('origin') || '';
    const orderLink = `${origin}/order/${createdRef.id}?token=${accessToken}`;

    console.log('[MVP] Guest order link:', orderLink);

    return NextResponse.json({
      orderId: createdRef.id,
      accessToken,
      orderLink,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create order' },
      { status: 500 }
    );
  }
}

function safeJsonParse(str) {
  if (!str || typeof str !== 'string') return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}
