# API Key Retrieval Guide

Follow these steps to get the API keys required for your `.env` file.

## 1. Stripe (For Chicago Payments)
**Website:** [dashboard.stripe.com](https://dashboard.stripe.com/)

1.  **Log in** to your Stripe Dashboard.
2.  **Secret Key (`STRIPE_SECRET_KEY`):**
    *   Go to **Developers** (top right) > **API Keys** (left menu).
    *   Look for **Secret key**. Click "Reveal test key" (or live key).
    *   Copy the key starting with `sk_...`.
3.  **Webhook Secret (`STRIPE_WEBHOOK_SECRET`):**
    *   Go to **Developers** > **Webhooks**.
    *   Click **Add endpoint**.
    *   Enter your backend URL (e.g., `https://your-api.com/api/webhooks/stripe`).
    *   Select events to listen for (e.g., `payment_intent.succeeded`, `charge.succeeded`).
    *   Click **Add endpoint**.
    *   On the next screen, look for **Signing secret** (top right) and click "Reveal".
    *   Copy the key starting with `whsec_...`.

## 2. Paystack (For Nigeria Payments)
**Website:** [dashboard.paystack.com](https://dashboard.paystack.com/)

1.  **Log in** to your Paystack Dashboard.
2.  Go to **Settings** (gear icon, bottom left) > **API Keys & Webhooks**.
3.  **Secret Key (`PAYSTACK_SECRET_KEY`):**
    *   Under **API Configuration**, find **Secret Key**.
    *   Copy the key starting with `sk_...`.
4.  **Public Key (Optional for Frontend):**
    *   Copy the **Public Key** (`pk_...`) if needed for your Flutterflow app.

## 3. Flutterwave (For Nigeria Payments)
**Website:** [dashboard.flutterwave.com](https://dashboard.flutterwave.com/)

1.  **Log in** to your Flutterwave Dashboard.
2.  Go to **Settings** > **API Keys**.
3.  **Secret Key (`FLUTTERWAVE_SECRET_KEY`):**
    *   Find **Secret Key** and click "Copy".
    *   It usually starts with `FLWSECK_...`.
4.  **Encryption Key (Optional):**
    *   You might also see an Encryption Key; keep it safe if your integration requires it.

## 4. Google Maps (For Location & Tracking)
**Website:** [console.cloud.google.com](https://console.cloud.google.com/)

1.  **Log in** to Google Cloud Console.
2.  Select your project (or create a new one).
3.  Go to **APIs & Services** > **Credentials**.
4.  Click **+ CREATE CREDENTIALS** > **API key**.
5.  **Copy the generated key** (`GOOGLE_MAPS_API_KEY`).
6.  **Important:** You must enable the following APIs for this key to work:
    *   Maps JavaScript API
    *   Places API
    *   Geocoding API
    *   Directions API
    *   Distance Matrix API

## 5. OpenWeatherMap (For Weather Incentives)
**Website:** [home.openweathermap.org](https://home.openweathermap.org/)

1.  **Log in** or Sign up.
2.  Go to the **API Keys** tab.
3.  **Create a key** (e.g., name it "Blacklivery Backend").
4.  **Copy the Key** (`OPENWEATHER_API_KEY`).

---

### Summary of Keys to Add to `.env`
```env
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYSTACK_SECRET_KEY=sk_...
FLUTTERWAVE_SECRET_KEY=FLWSECK_...
GOOGLE_MAPS_API_KEY=AIza...
OPENWEATHER_API_KEY=...
```
