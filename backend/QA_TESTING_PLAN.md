# QA Testing Plan: Blacklivery Backend Module 1

This plan outlines the step-by-step verification process for all Milestone 1 features.

## 1. Environment & Prerequisites
- [ ] **Tools**: Ensure Postman (or Curl) and Node.js are installed.
- [ ] **Configuration**: Verify `backend/.env` has all necessary keys (Firebase, Google Maps, OpenWeather, Payment Keys).
- [ ] **Server**: Start the backend server (`npm run dev`).

## 2. Authentication & User Management
- [ ] **Rider Signup**: Register a new rider.
- [ ] **Driver Signup**: Register a new driver.
- [ ] **Admin Setup**: Ensure an admin user exists (manually set role in DB if needed).
- [ ] **Login**: Verify login and token generation for all roles.

## 3. Driver Onboarding & Vehicle Approval
- [ ] **Add Vehicle**: Driver adds a vehicle (Sedan/SUV).
- [ ] **Admin Approval**: Admin approves the vehicle documents (Critical for matching).
- [ ] **Driver Online**: Driver connects via Socket.io and updates location.

## 4. Ride Booking (Nigeria Market)
- [ ] **Price Estimate**: Get a quote for a trip in Lagos.
- [ ] **Ride Request**: Rider requests a ride.
- [ ] **Driver Matching**: Verify driver receives the request.
- [ ] **Ride Acceptance**: Driver accepts the ride.
- [ ] **Ride Lifecycle**: Pickup -> Dropoff -> Completion.
- [ ] **Fare Calculation**: Verify final fare matches estimate (or logic).

## 5. Delivery Features (Nigeria Market)
- [ ] **Delivery Quote**: Get a quote for a motorbike delivery.
- [ ] **Delivery Request**: Create a delivery request with recipient details.
- [ ] **Matching**: Verify motorbike driver matching.

## 6. Chicago Market Features
- [ ] **Airport Transfer**: Request a quote for O'Hare (ORD) to Downtown. Verify fixed pricing.
- [ ] **Hourly Booking**: Request a quote for 4 hours. Verify hourly pricing.
- [ ] **Currency**: Verify quotes are in USD.

## 7. Payments & Wallet System
- [ ] **Wallet Funding**: Simulate funding a wallet (if endpoint exists) or check balance.
- [ ] **Commission**: Verify admin commission (25%) is calculated on ride completion.
- [ ] **Driver Payout**: Driver requests payout -> Admin approves.

## 8. Admin Configuration
- [ ] **Dynamic Pricing**: Admin updates base fare for Nigeria. Verify new quotes reflect change.
- [ ] **Surge Control**: Admin triggers manual surge. Verify price increase.

## 9. Automated Verification
- [ ] **Run Script**: Execute `npm run verify-flow` for a quick smoke test of the core flow.
