# Blacklivery Backend Testing Guide

This guide provides step-by-step instructions to test the Blacklivery backend API using a tool like **Postman** or **curl**.

## 1. Prerequisites

*   **Node.js** installed (v16+ recommended).
*   **Postman** (or similar API client) installed.
*   **Firebase Project** set up with a service account key.
*   **MongoDB/Firestore** accessible.

## 2. Environment Setup

1.  Ensure your `.env` file is configured in `backend/.env`:
    ```env
    PORT=3000
    GOOGLE_APPLICATION_CREDENTIALS="./serviceAccountKey.json"
    FIREBASE_DATABASE_URL="https://your-project.firebaseio.com"
    GOOGLE_MAPS_API_KEY="YOUR_GOOGLE_MAPS_KEY"
    OPENWEATHER_API_KEY="YOUR_OPENWEATHER_KEY"
    ```
2.  Start the server:
    ```bash
    npm run dev
    ```

---

## 3. Authentication Flow

### A. Register a User (Rider)
*   **Endpoint:** `POST http://localhost:3000/api/v1/auth/register`
*   **Body:**
    ```json
    {
      "email": "rider@test.com",
      "password": "password123",
      "firstName": "John",
      "lastName": "Doe",
      "role": "rider",
      "phone": "+2348012345678"
    }
    ```
*   **Response:** Returns user object and Firebase UID.

### B. Login (Get Token)
*   *Note: In a real app, Firebase Client SDK handles login and gives you a token. For testing backend only, you might need a script or use the frontend to get an ID Token.*
*   **Alternative:** If you implemented a backend login (not standard for Firebase but possible for testing), use that. Otherwise, use the Firebase Console or a client app to generate an ID token for the user `rider@test.com`.
*   **Header for all subsequent requests:**
    *   `Authorization`: `Bearer <YOUR_FIREBASE_ID_TOKEN>`

---

## 4. Ride Booking Flow (Nigeria)

### A. Get a Price Estimate (Quote)
*   **Endpoint:** `POST http://localhost:3000/api/v1/rides/quote`
*   **Body:**
    ```json
    {
      "pickup": { "lat": 6.5244, "lng": 3.3792 }, // Lagos Mainland
      "dropoff": { "lat": 6.4281, "lng": 3.4219 }, // Victoria Island
      "vehicleCategory": "sedan",
      "region": "nigeria"
    }
    ```

### B. Request a Ride
*   **Endpoint:** `POST http://localhost:3000/api/v1/rides/request`
*   **Body:**
    ```json
    {
      "pickup": { "lat": 6.5244, "lng": 3.3792, "address": "Yaba" },
      "dropoff": { "lat": 6.4281, "lng": 3.4219, "address": "VI" },
      "vehicleCategory": "sedan",
      "region": "nigeria"
    }
    ```

---

## 5. Delivery Flow

### A. Create Delivery Request
*   **Endpoint:** `POST http://localhost:3000/api/v1/deliveries`
*   **Body:**
    ```json
    {
      "pickup": { "lat": 6.5244, "lng": 3.3792, "address": "Pickup Loc" },
      "dropoff": { "lat": 6.4281, "lng": 3.4219, "address": "Dropoff Loc" },
      "vehicleCategory": "motorbike",
      "region": "nigeria",
      "deliveryDetails": {
        "recipientName": "Jane Doe",
        "recipientPhone": "+234...",
        "packageDescription": "Documents",
        "serviceType": "instant",
        "isFragile": false
      }
    }
    ```

---

## 6. Chicago Premium Flow

### A. Airport Transfer Quote
*   **Endpoint:** `POST http://localhost:3000/api/v1/rides/quote`
*   **Body:**
    ```json
    {
      "pickup": { "lat": 41.8781, "lng": -87.6298 }, // Chicago Loop
      "dropoff": { "lat": 41.9742, "lng": -87.9073 }, // O'Hare (ORD)
      "vehicleCategory": "business_suv",
      "region": "chicago",
      "isAirport": true,
      "airportCode": "ORD"
    }
    ```

### B. Hourly Booking Quote
*   **Endpoint:** `POST http://localhost:3000/api/v1/rides/quote`
*   **Body:**
    ```json
    {
      "pickup": { "lat": 41.8781, "lng": -87.6298 },
      "dropoff": { "lat": 41.8781, "lng": -87.6298 }, // Same as pickup (hourly)
      "vehicleCategory": "first_class",
      "region": "chicago",
      "bookingType": "hourly",
      "hoursBooked": 4
    }
    ```

---

## 7. Admin Configuration (Admin Only)

*   *Requires a user with `role: "admin"` in Firestore.*

### A. Update Pricing Config (Nigeria)
*   **Endpoint:** `PUT http://localhost:3000/api/v1/admin/pricing/nigeria`
*   **Body:**
    ```json
    {
      "baseFare": 1600,
      "costPerKm": 260
    }
    ```

### B. Update Surge Config (Trigger Rain Surge)
*   **Endpoint:** `PUT http://localhost:3000/api/v1/admin/surge/nigeria`
*   **Body:**
    ```json
    {
      "manualOverride": true,
      "manualMultiplier": 2.0
    }
    ```

---

## 8. Payouts (Driver & Admin)

### A. Request Payout (As Driver)
*   **Endpoint:** `POST http://localhost:3000/api/v1/payouts/request`
*   **Body:**
    ```json
    {
      "amount": 5000,
      "currency": "NGN",
      "accountNumber": "1234567890",
      "bankCode": "044"
    }
    ```
*   **Response:** Returns a `requestId`.

### B. Approve Payout (As Admin)
*   **Endpoint:** `POST http://localhost:3000/api/v1/payouts/{requestId}/approve`
*   **Body:**
    ```json
    {
      "approved": true
    }
    ```

---

## Troubleshooting

*   **401 Unauthorized:** Check your Bearer token. It expires after 1 hour.
*   **403 Forbidden:** Check your user role in Firestore (`users/{uid}`).
*   **500 Error:** Check the server console logs for details.
