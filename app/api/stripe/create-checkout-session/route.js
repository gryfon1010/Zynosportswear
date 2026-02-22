import { NextResponse } from 'next/server';
import { getStripe } from '../../../../lib/stripe/server';
import { checkRateLimit } from '../../../../lib/security/rateLimit';
import { getAdminDb } from '../../../../lib/firebase/admin';

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

    // Optional safety check: make sure products in the cart still exist and
    // are active. This avoids confusing Stripe errors if an admin removed a
    // product after it was added to the cart.
    try {
      const adminDb = getAdminDb();
      if (adminDb) {
        const uniqueIds = Array.from(
          new Set(
            items
              .map((it) => String(it?.productId || '').trim())
              .filter((id) => id)
          )
        );

        if (uniqueIds.length) {
          const productSnaps = await Promise.all(
            uniqueIds.map((id) => adminDb.collection('products').doc(id).get())
          );
          const existingById = new Map();
          productSnaps.forEach((snap, idx) => {
            if (snap.exists) existingById.set(uniqueIds[idx], snap.data());
          });

          const unavailableNames = [];
          const unavailableIds = [];
          for (const it of items) {
            const pid = String(it?.productId || '').trim();
            if (!pid) continue;
            const prod = existingById.get(pid);
            if (!prod || prod.active === false) {
              const name = String(it?.name || prod?.name || 'Item').slice(0, 80);
              unavailableNames.push(name);
              if (pid) unavailableIds.push(pid);
            }
          }

          if (unavailableNames.length) {
            const list = Array.from(new Set(unavailableNames)).join(', ');
            return NextResponse.json(
              {
                error:
                  'Some items in your cart are no longer available and were removed from the store. ' +
                  `Please remove these products from your cart and try again: ${list}.`,
                unavailableProductIds: Array.from(new Set(unavailableIds)),
                unavailableProductNames: Array.from(new Set(unavailableNames)),
              },
              { status: 400 }
            );
          }
        }
      }
    } catch {
      // If this validation fails for any reason, continue; Stripe will still
      // perform its own checks. We prefer to avoid blocking checkout on
      // transient read errors.
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

    const compactCustomer = {
      email,
      name: customer?.name ? String(customer.name).slice(0, 120) : undefined,
      phone: customer?.phone ? String(customer.phone).slice(0, 40) : undefined,
      // Include addresses so the order document can show shipping/billing details in admin.
      shippingAddress: customer?.shippingAddress || null,
      billingAddress: customer?.billingAddress || null,
    };

    const compactItems = items.map((it) => ({
      productId: it?.productId || null,
      sku: it?.sku || null,
      name: String(it?.name || 'Item').slice(0, 80),
      qty: Number(it?.qty || 1),
      unitAmount: Number(it?.unitAmount || 0),
      // imageUrl can be very long; keep a shorter version or drop if too long
      imageUrl: it?.imageUrl ? String(it.imageUrl).slice(0, 160) : null,
    }));

    let cartJson = JSON.stringify(compactItems);
    if (cartJson.length > 450) {
      // If still too long, drop imageUrl to keep within Stripe's 500-char limit.
      const moreCompact = compactItems.map((it) => ({
        productId: it.productId,
        sku: it.sku,
        name: it.name,
        qty: it.qty,
        unitAmount: it.unitAmount,
      }));
      cartJson = JSON.stringify(moreCompact);
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      customer_email: email,
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart`,
      metadata: {
        customer_json: JSON.stringify(compactCustomer),
        cart_json: cartJson,
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
