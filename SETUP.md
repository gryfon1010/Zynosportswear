# ZynoSportswear Setup (Dev Accounts Now → Client Accounts Later)

This project uses:
- Next.js (App Router)
- Firebase Auth + Firestore (data)
- Cloudinary (images)
- Stripe (payments; test mode first)

## 1) Firebase setup (Auth + Firestore)

### 1.1 Create Firebase project
1. Go to Firebase Console.
2. Create a new project (for development).
3. Add a Web App (</> icon).
4. Copy the web config values.

### 1.2 Enable Authentication
1. Firebase Console → Authentication → Get started.
2. Enable **Email/Password**.
3. Create your admin users in Authentication → Users.

### 1.3 Create Firestore
1. Firebase Console → Firestore Database → Create database.
2. Start in **production mode** (recommended). You will add rules later.

### 1.4 Service Account (for server)
1. Firebase Console → Project Settings → Service Accounts.
2. Click **Generate new private key**.
3. Use its values for the server env vars.

## 2) Stripe setup (Test mode)

### 2.1 Create Stripe account
1. Create a Stripe account.
2. Make sure you are in **Test mode**.

### 2.2 Get API keys
1. Stripe Dashboard → Developers → API keys.
2. Copy:
   - Publishable key (`pk_test_...`)
   - Secret key (`sk_test_...`)

## 3) Cloudinary setup

### 3.1 Create Cloudinary account
1. Create a Cloudinary account.
2. Go to Dashboard.
3. Copy:
   - Cloud name
   - API key
   - API secret

## 4) Add local environment variables

This repo cannot include `.env` files (gitignored). Use the template:
- `ENV_TEMPLATE.md`

Create `/.env.local` and paste the values.

## 5) Run the app

1. Install deps: already done.
2. Run: `npm run dev`

## 6) How the system works (end-to-end)

### 6.1 Storefront (public website)
- Reads categories/products from **Firestore**.
- Shows product images via **Cloudinary URLs** saved in Firestore.

### 6.2 Admin panel
- Admin logs in via **Firebase Auth**.
- Admin creates/edits categories + products in **Firestore**.
- For product images:
  - Admin UI asks your server for a **Cloudinary upload signature** (admin-only endpoint).
  - Browser uploads image directly to Cloudinary.
  - Returned `secure_url` + `public_id` are stored in Firestore product docs.

### 6.3 Cart + Checkout
- Cart is stored in browser (localStorage) for guests.
- Checkout creates a **Stripe Checkout Session** on your server.
- User pays on Stripe.
- On success, the app creates an **order** in Firestore.

### 6.4 Guest order access link (MVP)
- When creating an order, the server generates a random access token.
- The server stores only the **hash(token)** in Firestore.
- The success page shows:
  - `/order/{orderId}?token=...`
- Anyone with the link can view the order; without it they cannot.

### 6.5 Switching from dev accounts to client accounts
- All providers are configured via environment variables.
- When you finish development:
  - Replace `.env.local` keys with the client’s Firebase/Stripe/Cloudinary keys.
  - Run the same codebase.
  - Data will now write into the client’s Firestore and assets will upload to the client’s Cloudinary.

## Notes
- In production you’ll add:
  - Firestore Security Rules
  - Stripe webhook for robust payment confirmation
  - Email sending (SendGrid) for order link delivery
