# How to Add Google Search Console Verification

Once you sign up for Google Search Console, you'll get a verification meta tag. Here's how to add it:

## Step 1: Get Your Verification Code
1. Go to https://search.google.com/search-console
2. Add your property: `https://www.cgrsports.com`
3. Choose "HTML tag" verification method
4. Copy the meta tag (looks like: `<meta name="google-site-verification" content="YOUR_CODE_HERE" />`)

## Step 2: Update Your Code

Open `app/layout.js` and replace this line:

```javascript
google: 'your-google-verification-code', // Add your Google Search Console verification code here
```

With your actual verification code (just the content part):

```javascript
google: 'abc123xyz456', // Your actual code from Google Search Console
```

## Step 3: Deploy and Verify
1. Commit and push the changes
2. Wait for deployment to complete
3. Go back to Google Search Console
4. Click "Verify"

## Alternative: Add Meta Tag Directly

If you prefer, you can add the full meta tag to the layout. In `app/layout.js`, modify the metadata export:

```javascript
export const metadata = {
  // ... other metadata ...
  other: {
    'google-site-verification': 'YOUR_VERIFICATION_CODE_HERE',
  },
};
```

---

**Important**: You MUST verify your site in Google Search Console for it to appear in Google search results!
