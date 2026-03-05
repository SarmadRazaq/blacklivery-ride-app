# BlackLivery Driver App — Comprehensive QA Test Scenarios

> **Total Test Cases: 248**
> Organized by feature area. Each test case includes ID, description, steps, expected behavior, and status.

---

## Table of Contents

1. [Authentication — Login (AUTH-L)](#1-authentication--login)
2. [Authentication — Registration (AUTH-R)](#2-authentication--registration)
3. [Authentication — OTP & 2FA (AUTH-OTP)](#3-authentication--otp--2fa)
4. [Authentication — Social & Biometric (AUTH-S)](#4-authentication--social--biometric)
5. [Authentication — Password Recovery (AUTH-P)](#5-authentication--password-recovery)
6. [Onboarding — Phone & OTP Flow (ONB-P)](#6-onboarding--phone--otp-flow)
7. [Onboarding — Account Creation (ONB-A)](#7-onboarding--account-creation)
8. [Onboarding — Email Verification (ONB-E)](#8-onboarding--email-verification)
9. [Onboarding — Emergency Contacts (ONB-EC)](#9-onboarding--emergency-contacts)
10. [Onboarding — Vehicle & Documents (ONB-V)](#10-onboarding--vehicle--documents)
11. [Onboarding — Account Setup & Approval (ONB-S)](#11-onboarding--account-setup--approval)
12. [Splash & Session Restore (SPL)](#12-splash--session-restore)
13. [Home — Driver Map / Going Online (HOME-M)](#13-home--driver-map--going-online)
14. [Home — Location Tracking & Socket (HOME-LOC)](#14-home--location-tracking--socket)
15. [Home — Heat Map (HOME-HM)](#15-home--heat-map)
16. [Home — Incentives (HOME-INC)](#16-home--incentives)
17. [Home — Loyalty Points (HOME-LP)](#17-home--loyalty-points)
18. [Home — Notifications (HOME-N)](#18-home--notifications)
19. [Home — Preferences (HOME-PR)](#19-home--preferences)
20. [Home — Destination Filter (HOME-D)](#20-home--destination-filter)
21. [Home — Rating Overview (HOME-R)](#21-home--rating-overview)
22. [Home — Support (HOME-SUP)](#22-home--support)
23. [Ride — Request & Timer (RIDE-REQ)](#23-ride--request--timer)
24. [Ride — Accept & Navigate to Pickup (RIDE-NAV)](#24-ride--accept--navigate-to-pickup)
25. [Ride — Arrival & Waiting (RIDE-ARR)](#25-ride--arrival--waiting)
26. [Ride — Trip In-Progress (RIDE-TRIP)](#26-ride--trip-in-progress)
27. [Ride — Trip Completion & Rating (RIDE-COMP)](#27-ride--trip-completion--rating)
28. [Ride — Cancellation (RIDE-CAN)](#28-ride--cancellation)
29. [Ride — Scheduled Rides (RIDE-SCH)](#29-ride--scheduled-rides)
30. [Delivery — Request (DEL-REQ)](#30-delivery--request)
31. [Delivery — Pickup Flow (DEL-PICK)](#31-delivery--pickup-flow)
32. [Delivery — Trip & Drop-off (DEL-TRIP)](#32-delivery--trip--drop-off)
33. [Delivery — Proof of Delivery (DEL-PROOF)](#33-delivery--proof-of-delivery)
34. [Delivery — Completion (DEL-COMP)](#34-delivery--completion)
35. [Earnings — Dashboard (EARN-D)](#35-earnings--dashboard)
36. [Earnings — Payouts (EARN-P)](#36-earnings--payouts)
37. [Earnings — Payout History (EARN-H)](#37-earnings--payout-history)
38. [History — Upcoming Bookings (HIST-U)](#38-history--upcoming-bookings)
39. [History — Ride History (HIST-R)](#39-history--ride-history)
40. [Settings — Personal Info (SET-PI)](#40-settings--personal-info)
41. [Settings — Password & Security (SET-SEC)](#41-settings--password--security)
42. [Settings — Emergency Contacts (SET-EC)](#42-settings--emergency-contacts)
43. [Settings — Ride Modes & Earnings Model (SET-RM)](#43-settings--ride-modes--earnings-model)
44. [Settings — General (SET-GEN)](#44-settings--general)
45. [Chat — In-Ride Chat (CHAT-R)](#45-chat--in-ride-chat)
46. [Chat — Support Chat (CHAT-S)](#46-chat--support-chat)
47. [Core — Connectivity & Offline (CORE-C)](#47-core--connectivity--offline)
48. [Core — Push Notifications (CORE-PN)](#48-core--push-notifications)

---

## 1. Authentication — Login

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| AUTH-L-01 | Login with valid email & password | Enter valid email + password → Tap "Login" | Successful login → navigates to splash → resolves to DriverMapScreen | ⬜ |
| AUTH-L-02 | Login with invalid email format | Enter "notanemail" → Tap "Login" | Validation error: "Enter a valid email" shown inline | ⬜ |
| AUTH-L-03 | Login with wrong password | Enter valid email + wrong password → Tap "Login" | SnackBar error: "Invalid credentials" or Firebase error message | ⬜ |
| AUTH-L-04 | Login with empty email | Leave email blank → Tap "Login" | Form validation: "Email is required" | ⬜ |
| AUTH-L-05 | Login with empty password | Enter email only → Leave password blank → Tap "Login" | Form validation: "Password is required" | ⬜ |
| AUTH-L-06 | Login with unregistered email | Enter non-existent email + any password | SnackBar error indicating user not found | ⬜ |
| AUTH-L-07 | Login triggers 2FA flow | Login with account that has 2FA enabled | After credentials verified → redirected to TwoFactorScreen instead of home | ⬜ |
| AUTH-L-08 | Password visibility toggle | Tap eye icon on password field | Password text toggles between obscured (•••) and visible | ⬜ |
| AUTH-L-09 | Navigate to registration | Tap "Don't have an account? Register" | Navigates to CreateAccountScreen | ⬜ |
| AUTH-L-10 | Navigate to forgot password | Tap "Forgot Password?" | Navigates to ForgotPasswordScreen | ⬜ |
| AUTH-L-11 | Login with pending driver status | Login with account in 'pending' status | After login → resolves to ApprovalScreen (not DriverMapScreen) | ⬜ |
| AUTH-L-12 | Login with rejected driver status | Login with account in 'rejected' status | After login → resolves to ApprovalScreen | ⬜ |

---

## 2. Authentication — Registration

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| AUTH-R-01 | Register with all valid fields | Fill name, email, phone, password, select region → Tap "Register" | Success → navigates to EmailVerificationScreen | ⬜ |
| AUTH-R-02 | Register with short password | Enter password < 8 chars | Orange warning text appears; form submits but API may reject | ⬜ |
| AUTH-R-03 | Register with invalid email | Enter "bademail" | Validation error: regex `^[^@]+@[^@]+\.[^@]+$` fails | ⬜ |
| AUTH-R-04 | Register with short name | Enter single character name | Validation error: min 2 chars required | ⬜ |
| AUTH-R-05 | Register with existing email | Enter already-registered email | 409 error → SnackBar "Email already registered" with "Login" action button | ⬜ |
| AUTH-R-06 | Region selector — Nigeria | Tap 🇳🇬 Nigeria chip | Country code changes to +234, max phone digits = 11 | ⬜ |
| AUTH-R-07 | Region selector — Chicago | Tap 🇺🇸 Chicago chip | Country code changes to +1, max phone digits = 10 | ⬜ |
| AUTH-R-08 | Register with network timeout | Trigger network timeout during registration | SnackBar "Network error. Check connection." | ⬜ |
| AUTH-R-09 | Full name split into first/last | Register with "John Doe" | API receives firstName="John", lastName="Doe" | ⬜ |
| AUTH-R-10 | Single-word name handling | Register with "John" (no space) | firstName="John", lastName="" (empty); registration still proceeds | ⬜ |

---

## 3. Authentication — OTP & 2FA

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| AUTH-OTP-01 | Enter valid 6-digit OTP | Receive OTP → Enter 6 digits in Pinput → Tap "Verify" | Verification succeeds → navigates forward | ⬜ |
| AUTH-OTP-02 | Enter less than 6 digits | Enter 4 digits → Tap "Verify" | SnackBar "Please enter the 6-digit code" | ⬜ |
| AUTH-OTP-03 | Enter wrong OTP | Enter incorrect 6-digit code → Tap "Verify" | SnackBar with API error (e.g., "Invalid OTP") | ⬜ |
| AUTH-OTP-04 | Resend OTP | Wait for 60s timer to expire → Tap "Resend code" | New OTP sent; timer resets to 60s | ⬜ |
| AUTH-OTP-05 | Resend timer countdown | After entering OTP screen | Timer counts down from 60 → 0; resend link disabled until 0 | ⬜ |
| AUTH-OTP-06 | 2FA screen 6-digit entry | On TwoFactorScreen → Enter 6-digit code → Tap "Verify" | 2FA verified → proceeds to home/profile resolution | ⬜ |
| AUTH-OTP-07 | 2FA with wrong code | Enter wrong 6-digit code on TwoFactorScreen | SnackBar error message | ⬜ |
| AUTH-OTP-08 | 2FA resend (60s timer) | Wait 60s → Tap resend | New code sent via SMS; timer resets | ⬜ |

---

## 4. Authentication — Social & Biometric

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| AUTH-S-01 | Google Sign-In | Tap Google sign-in button | Google OAuth flow → successful login → navigates to home | ⬜ |
| AUTH-S-02 | Google Sign-In cancelled | Start Google sign-in → Cancel on Google prompt | Returns to login screen, no error | ⬜ |
| AUTH-S-03 | Apple Sign-In (iOS) | Tap Apple sign-in button | Apple OAuth flow → successful login | ⬜ |
| AUTH-S-04 | Biometric login (Face ID / Fingerprint) | Tap biometric button on login screen | System biometric prompt → authenticates → auto-fills saved credentials → logs in | ⬜ |
| AUTH-S-05 | Biometric login when not set up | Tap biometric with no stored credentials | SnackBar "Biometric login not set up" or button hidden | ⬜ |
| AUTH-S-06 | Biometric fails (wrong finger/face) | Trigger biometric → fail authentication | Returns false; stays on login screen | ⬜ |
| AUTH-S-07 | Biometric device not supported | Device lacks biometric hardware | Biometric button hidden; toggle disabled in settings | ⬜ |

---

## 5. Authentication — Password Recovery

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| AUTH-P-01 | Request password reset | Enter valid email → Tap "Send Reset Link" | Firebase sends reset email → SnackBar "Password reset email sent" → pops back | ⬜ |
| AUTH-P-02 | Reset with empty email | Tap "Send" with empty email field | SnackBar "Please enter your email" | ⬜ |
| AUTH-P-03 | Reset with unregistered email | Enter non-existent email | Firebase error → SnackBar with error message | ⬜ |
| AUTH-P-04 | Navigate back to login | Tap back button on ForgotPasswordScreen | Returns to LoginScreen | ⬜ |

---

## 6. Onboarding — Phone & OTP Flow

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| ONB-P-01 | Enter NG phone number | Select Nigeria region → Enter up to 11 digits | Phone field accepts max 11 digits with +234 prefix | ⬜ |
| ONB-P-02 | Enter US phone number | Select Chicago region → Enter up to 10 digits | Phone field accepts max 10 digits with +1 prefix | ⬜ |
| ONB-P-03 | Send OTP with valid phone | Enter name + email + phone → Tap "Send OTP" | OTP sent → navigates to OtpVerificationScreen | ⬜ |
| ONB-P-04 | Send OTP with empty phone | Leave phone blank → Tap "Send OTP" | SnackBar "Please enter your phone number" | ⬜ |
| ONB-P-05 | Verify onboarding OTP | Enter 6-digit OTP → Tap "Verify" | Success → navigates to EmergencyContactsScreen | ⬜ |
| ONB-P-06 | Step indicator shows step 0 | On PhoneEntryScreen | 4 step-indicator dots visible; step 0 highlighted | ⬜ |

---

## 7. Onboarding — Account Creation

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| ONB-A-01 | Full registration flow | Complete CreateAccountScreen → EmailVerification → OTP | Full onboarding chain completes without errors | ⬜ |
| ONB-A-02 | Pre-filled fields from params | Navigate to CreateAccountScreen with initial values | Fields pre-filled with initialName, initialEmail, initialPhone | ⬜ |
| ONB-A-03 | Region affects country code | Switch region chip between NG and US | Phone field prefix and max length update accordingly | ⬜ |
| ONB-A-04 | 409 conflict redirects to login | Register duplicate email | SnackBar shows "Email already registered" with Login action | ⬜ |

---

## 8. Onboarding — Email Verification

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| ONB-E-01 | Verify email with valid code | Enter 6-digit verification code → Tap "Verify" | Email verified → sends phone OTP → navigates to OtpVerificationScreen | ⬜ |
| ONB-E-02 | Verify email with wrong code | Enter incorrect 6-digit code | SnackBar error "Verification failed" | ⬜ |
| ONB-E-03 | Resend email verification | Wait 60s → Tap "Resend code" | New verification email sent; timer resets to 60 | ⬜ |
| ONB-E-04 | Back to registration | Tap "Back to Registration" | Pops back to CreateAccountScreen | ⬜ |

---

## 9. Onboarding — Emergency Contacts

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| ONB-EC-01 | Add emergency contact (onboarding) | Fill name + select relationship + enter phone → Tap "Continue" | Contact saved → navigates to VerificationScreen | ⬜ |
| ONB-EC-02 | Missing relationship selection | Fill name + phone but skip relationship → Tap "Continue" | SnackBar "Please select a relationship" | ⬜ |
| ONB-EC-03 | Missing name | Leave name empty → Tap "Continue" | Form validation: name required | ⬜ |
| ONB-EC-04 | Missing phone | Leave phone empty → Tap "Continue" | Form validation: phone required | ⬜ |
| ONB-EC-05 | Relationship picker bottom sheet | Tap relationship field | Bottom sheet shows: Spouse, Parent, Sibling, Child, Friend, Other | ⬜ |
| ONB-EC-06 | Phone max 15 digits | Enter >15 digit number | Input capped at 15 characters | ⬜ |
| ONB-EC-07 | Step indicator shows step 1 | On EmergencyContactsScreen | Step dots show step 1 highlighted | ⬜ |

---

## 10. Onboarding — Vehicle & Documents

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| ONB-V-01 | Add vehicle with all fields | Fill make, plate, color, year, seats, category + take front/back photos → Submit | Vehicle added → navigates to EmergencyContactsScreen | ⬜ |
| ONB-V-02 | Missing front photo | Fill all text fields but skip front photo → Submit | SnackBar "Please take both front and back photos" | ⬜ |
| ONB-V-03 | Missing back photo | Fill all fields + take front only → Submit | SnackBar "Please take both front and back photos" | ⬜ |
| ONB-V-04 | Vehicle year out of range | Enter year < 2000 or > current year + 1 | Form validation error for year field | ⬜ |
| ONB-V-05 | Seats out of range | Enter seats = 0 or seats = 25 | Form validation: must be 1–20 | ⬜ |
| ONB-V-06 | Make too short | Enter make < 3 chars | Form validation: min 3 characters | ⬜ |
| ONB-V-07 | Vehicle category dropdown | Tap category dropdown | Shows 8 options: motorbike, sedan, suv, xl, first_class, business_sedan, business_suv, cargo_van | ⬜ |
| ONB-V-08 | Image picker — Camera option | Tap front photo → Select Camera | Camera opens, capture photo → preview shown | ⬜ |
| ONB-V-09 | Image picker — Gallery option | Tap front photo → Select Gallery | Gallery opens, select image → preview shown | ⬜ |
| ONB-V-10 | Image upload to Firebase Storage | Submit vehicle with photos | Photos uploaded to `vehicles/$uid/front_$ts.jpg` and `vehicles/$uid/back_$ts.jpg` | ⬜ |
| ONB-V-11 | Upload all 5 document types | Upload chauffeur_license, vehicle_insurance, vehicle_inspection, vehicle_photo_front, vehicle_photo_back | All 5 doc tiles show uploaded status (green checkmark) | ⬜ |
| ONB-V-12 | Missing one document | Upload 4 of 5 documents → Tap "Continue" | SnackBar indicating the missing document type | ⬜ |
| ONB-V-13 | Document file types | Attempt to upload .pdf, .jpg, .jpeg, .png files | All accepted by FilePicker | ⬜ |
| ONB-V-14 | Car selection via bottom sheet | Tap car selection → Pick "Lincoln Town Car" | Car selection shows selected value on tile | ⬜ |
| ONB-V-15 | Missing car selection | Upload all docs, enter plate, but skip car selection → Continue | SnackBar about missing car selection | ⬜ |
| ONB-V-16 | Missing plate number | Upload all docs, select car, leave plate empty → Continue | SnackBar about missing plate number | ⬜ |
| ONB-V-17 | Step indicator shows step 2 | On VerificationScreen | Step dots show step 2 highlighted | ⬜ |

---

## 11. Onboarding — Account Setup & Approval

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| ONB-S-01 | Select scheduled payout | On AccountSetupScreen → Select "Scheduled Payouts" → Submit | `payoutPreference: 'scheduled'` saved → navigates to ApprovalScreen | ⬜ |
| ONB-S-02 | Select manual payout | Select "Manual Payouts" → Submit | `payoutPreference: 'manual'` saved → navigates to ApprovalScreen | ⬜ |
| ONB-S-03 | Step indicator shows step 3 | On AccountSetupScreen | Step dots show step 3 highlighted | ⬜ |
| ONB-S-04 | Approval — check status (still pending) | On ApprovalScreen → Tap "Check Status" | Profile fetched; status still pending → SnackBar "Your application is still under review." | ⬜ |
| ONB-S-05 | Approval — check status (approved) | Status changed to active/approved → Tap "Check Status" | Navigates to IncomingRidesModeScreen | ⬜ |
| ONB-S-06 | Approval — sign out | Tap "Sign Out" on ApprovalScreen | Logs out → navigates to SplashScreen | ⬜ |
| ONB-S-07 | Select incoming rides mode — Instant | On IncomingRidesModeScreen → Select "Instant Rides" → Continue | `rideMode: 'instant'` saved → navigates to SuccessScreen | ⬜ |
| ONB-S-08 | Select incoming rides mode — Scheduled | Select "Scheduled Rides" → Continue | `rideMode: 'scheduled'` saved → navigates to SuccessScreen | ⬜ |
| ONB-S-09 | Select incoming rides mode — All | Select "All Rides" → Continue | `rideMode: 'all'` saved → navigates to SuccessScreen | ⬜ |
| ONB-S-10 | Success screen auto-navigation | Reach SuccessScreen | Green checkmark animates (scale + fade, elasticOut), auto-navigates to DriverMapScreen after 4s | ⬜ |
| ONB-S-11 | Success screen tap-to-skip | Tap anywhere on SuccessScreen before 4s | Immediately navigates to DriverMapScreen | ⬜ |

---

## 12. Splash & Session Restore

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| SPL-01 | Cold start — unauthenticated | Launch app with no saved session | SplashScreen shows logo, "Get Started" and "Login" buttons | ⬜ |
| SPL-02 | Cold start — authenticated & approved | Launch app with saved session (approved user) | Auto-authenticates → biometric check if enabled → resolves to `/map` | ⬜ |
| SPL-03 | Cold start — pending approval | Launch with pending user session | Resolves to `/approval` (ApprovalScreen) | ⬜ |
| SPL-04 | Cold start — missing documents | Launch with user who hasn't uploaded docs | Resolves to `/documents` | ⬜ |
| SPL-05 | Cold start — missing emergency contacts | Launch with user who has no emergency contacts | Resolves to `/emergency-contacts` | ⬜ |
| SPL-06 | Active ride restoration | Launch with an active ride in progress | `loadCachedRide()` + `checkForActiveRide()` → resolves to `/trip` | ⬜ |
| SPL-07 | Location permission loop | Launch app → deny location permission | App keeps requesting; if permanently denied → opens app settings | ⬜ |
| SPL-08 | Biometric on cold start | Enabled biometric user launches app | System biometric prompt before proceeding to home | ⬜ |
| SPL-09 | "Get Started" button | Tap "Get Started" on splash | Navigates to CreateAccountScreen | ⬜ |
| SPL-10 | "Login" button | Tap "Login" on splash | Navigates to LoginScreen | ⬜ |

---

## 13. Home — Driver Map / Going Online

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| HOME-M-01 | Map loads with dark style | Navigate to DriverMapScreen | Google Map renders with dark theme via mapStyle asset | ⬜ |
| HOME-M-02 | Go online toggle | Tap online/offline toggle switch | Status changes; socket emits `driver:status {isOnline: true}`; UI reflects online state | ⬜ |
| HOME-M-03 | Go offline toggle | While online → Tap toggle off | Socket emits `driver:status {isOnline: false}`; stops receiving ride requests | ⬜ |
| HOME-M-04 | Online status persists across reconnect | Go online → lose connection → reconnect | Socket reconnects; driver re-joins room; online status re-emitted | ⬜ |
| HOME-M-05 | Heartbeat ping | While online, observe socket | Heartbeat emitted periodically to maintain connection | ⬜ |
| HOME-M-06 | Custom driver marker icon | Map loads with driver at current location | Custom vehicle marker icon displayed (not default Google pin) | ⬜ |
| HOME-M-07 | Camera centers on driver | Upon map load | Camera animates to driver's current GPS position | ⬜ |
| HOME-M-08 | Cross-region request filtering | NG driver online in Lagos | Only receives requests within Nigeria region (not Chicago requests) | ⬜ |
| HOME-M-09 | Driver preferences apply | Set acceptRides=true, acceptDeliveries=false | Only ride requests come through (delivery requests filtered out) | ⬜ |
| HOME-M-10 | Map screen action buttons | On DriverMapScreen | Menu icon, heat map button, incentive button, destination button visible | ⬜ |
| HOME-M-11 | Navigate to heat map | Tap heat map button | Navigates to HeatMapScreen | ⬜ |
| HOME-M-12 | Navigate to incentives | Tap incentive button | Navigates to IncentiveScreen | ⬜ |
| HOME-M-13 | Navigate to destination | Tap destination button | Navigates to DestinationScreen | ⬜ |
| HOME-M-14 | DraggableScrollableSheet | Check bottom panel behavior | Bottom panel is draggable with min/max snap points | ⬜ |

---

## 14. Home — Location Tracking & Socket

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| HOME-LOC-01 | Continuous location updates | Go online → move device | Position stream emits every 5s / 10m distance filter; socket emits `location:update` | ⬜ |
| HOME-LOC-02 | Foreground location service (Android) | Go online on Android | Persistent notification "BlackLivery Driver — Tracking your location" appears | ⬜ |
| HOME-LOC-03 | Background location (iOS) | Go online on iOS → background app | Location indicator shown; `ActivityType.automotiveNavigation` active | ⬜ |
| HOME-LOC-04 | Socket reconnect with exponential backoff | Kill server → restart after 10s | Socket reconnects with delays: 2s → 4s → 8s → 16s → 32s (max 5 attempts) | ⬜ |
| HOME-LOC-05 | Socket token refresh on reconnect | Firebase token expires → reconnect triggered | Fresh Firebase ID token obtained before reconnection attempt | ⬜ |
| HOME-LOC-06 | Location permission denied | Deny location permission | Error: "Location permissions are denied" thrown/shown | ⬜ |
| HOME-LOC-07 | Location services disabled | Disable GPS on device | Error: "Location services are disabled" | ⬜ |
| HOME-LOC-08 | Socket joins driver room | Connect socket successfully | Socket joins room `driver:${uid}` | ⬜ |

---

## 15. Home — Heat Map

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| HOME-HM-01 | Load demand zones | Open HeatMapScreen | Circles overlay on map showing demand areas from API | ⬜ |
| HOME-HM-02 | Filter — All | Select "All" filter chip | All zone types displayed (rides + deliveries + surge) | ⬜ |
| HOME-HM-03 | Filter — Rides only | Select "Rides" filter chip | Only ride demand zones shown (orange circles) | ⬜ |
| HOME-HM-04 | Filter — Deliveries only | Select "Deliveries" chip | Only delivery zones shown (blue circles) | ⬜ |
| HOME-HM-05 | Filter — Surge only | Select "Surge" chip | Only surge zones shown (red circles) | ⬜ |
| HOME-HM-06 | Preference filtering | acceptRides=true, acceptDeliveries=false → open heat map | Delivery zones excluded regardless of filter selection | ⬜ |
| HOME-HM-07 | Zone intensity opacity | Zones with varying intensity values | Higher intensity → higher opacity (capped at 0.6) | ⬜ |
| HOME-HM-08 | Color legend | Observe bottom info card | Shows color legend: orange=Rides, blue=Deliveries, red=Surge | ⬜ |
| HOME-HM-09 | Refresh demand data | Tap floating refresh button | Zones re-fetched from API; map updates | ⬜ |
| HOME-HM-10 | Error loading zones | API fails to respond | Error card "Unable to load demand data" with retry option | ⬜ |

---

## 16. Home — Incentives

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| HOME-INC-01 | Weekly trip goal (Nigeria) | Open IncentiveScreen as NG driver | Shows "40 trips → ₦10,000 bonus" progress card | ⬜ |
| HOME-INC-02 | Weekly trip goal (Chicago) | Open IncentiveScreen as US driver | Shows "20 trips → $1,200 minimum guarantee" | ⬜ |
| HOME-INC-03 | Peak hour bonus tiers (NG) | View peak hour section | Tier display: 1-4 trips = ₦300, 5-7 = ₦400, 8+ = ₦500 per trip | ⬜ |
| HOME-INC-04 | Weekly summary stats | Scroll to weekly summary | Shows total trips, total earnings, peak hour trips, avg per trip | ⬜ |
| HOME-INC-05 | "How Incentives Work" panel | Expand info panel | Expandable panel explains incentive rules | ⬜ |
| HOME-INC-06 | Loading state | Open screen while data loading | CircularProgressIndicator shown | ⬜ |

---

## 17. Home — Loyalty Points

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| HOME-LP-01 | Load loyalty overview | Open LoyaltyPointsScreen | Tier badge, current points, lifetime points, lifetime trips displayed | ⬜ |
| HOME-LP-02 | Tier display | Driver with "BRONZE" tier | Badge shows "BRONZE" capitalized | ⬜ |
| HOME-LP-03 | Available rewards list | Scroll to rewards section | List of rewards with name + point cost per item | ⬜ |
| HOME-LP-04 | Recent activity history | Scroll to activity section | Shows +/- point changes with green (earned) and red (spent) indicators | ⬜ |
| HOME-LP-05 | API failure | API returns error | SnackBar with error message; empty sections displayed | ⬜ |

---

## 18. Home — Notifications

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| HOME-N-01 | Load notifications list | Open NotificationsScreen | List of notifications with title, body, relative timestamp (timeago) | ⬜ |
| HOME-N-02 | Unread notification styling | Notification with isRead=false | Title rendered in bold | ⬜ |
| HOME-N-03 | Read notification styling | Notification with isRead=true | Title rendered in grey/normal weight | ⬜ |
| HOME-N-04 | Mark one as read | Tap on unread notification | Optimistic UI: immediately renders as read; API call `markNotificationRead(id)` | ⬜ |
| HOME-N-05 | Mark all as read | Tap "Mark all" in AppBar | All notifications switch to read state; API call `markAllNotificationsRead()` | ⬜ |
| HOME-N-06 | Clear badge on entry | Navigate to NotificationsScreen | `NotificationService().clearBadge()` called; app badge count cleared | ⬜ |
| HOME-N-07 | Empty state | No notifications exist | Bell icon + "No notifications yet" text | ⬜ |
| HOME-N-08 | Mark all failure | API error on markAllRead | SnackBar "Failed to mark all as read" | ⬜ |

---

## 19. Home — Preferences

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| HOME-PR-01 | Accept Rides toggle | Toggle "Accept Rides" switch | Preference saved; affects which requests are received | ⬜ |
| HOME-PR-02 | Accept Deliveries toggle | Toggle "Accept Deliveries" switch | Preference saved; delivery requests filtered accordingly | ⬜ |
| HOME-PR-03 | Accept Scheduled toggle | Toggle "Accept Scheduled" switch | Preference saved; scheduled ride requests filtered | ⬜ |
| HOME-PR-04 | Long Trips toggle | Toggle "Long Trips" | Preference persisted via provider | ⬜ |
| HOME-PR-05 | Short Trips toggle | Toggle "Short Trips" | Preference persisted | ⬜ |
| HOME-PR-06 | Airport Rides toggle | Toggle "Airport Rides" | Preference persisted | ⬜ |
| HOME-PR-07 | Auto Greeting toggle | Toggle "Auto Greeting" | Preference persisted | ⬜ |
| HOME-PR-08 | Quiet Mode toggle | Toggle "Quiet Mode" | Preference persisted | ⬜ |
| HOME-PR-09 | Wheelchair Accessible toggle | Toggle "Wheelchair Accessible" | Preference persisted | ⬜ |
| HOME-PR-10 | Pet Friendly toggle | Toggle "Pet Friendly" | Preference persisted | ⬜ |

---

## 20. Home — Destination Filter

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| HOME-D-01 | Search for destination | Type address (min 3 chars) in search field | Up to 5 geocoded results displayed | ⬜ |
| HOME-D-02 | Search with < 3 chars | Type 2 characters | No search triggered | ⬜ |
| HOME-D-03 | Select destination from results | Tap a search result | Destination set via `DriverPreferencesProvider.setDestination(name, lat, lng)` → pops back | ⬜ |
| HOME-D-04 | Use current location | Tap "Use Current Location" | GPS position obtained → reverse geocoded → set as destination | ⬜ |
| HOME-D-05 | Clear active destination | Tap "Clear" link next to active destination | Destination cleared via `prefs.clearDestination()` | ⬜ |
| HOME-D-06 | Set home address | Tap Home → enter/edit address | Address reverse geocoded → saved via `prefs.setHomeAddress(name, lat, lng)` | ⬜ |
| HOME-D-07 | Set work address | Tap Work → enter/edit address | Address reverse geocoded → saved via `prefs.setWorkAddress(name, lat, lng)` | ⬜ |
| HOME-D-08 | Geocoding failure | Enter nonexistent address | SnackBar "Could not find location" | ⬜ |
| HOME-D-09 | Location permission denied | Tap "Use Current Location" with no permission | SnackBar about location permission | ⬜ |

---

## 21. Home — Rating Overview

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| HOME-R-01 | Rating display | Open RatingScreen | Large circular display with 2-decimal rating (e.g., 4.85) | ⬜ |
| HOME-R-02 | Rating badge — Excellent | Rating ≥ 4.8 | Green "Excellent" badge chip displayed | ⬜ |
| HOME-R-03 | Rating badge — Great | Rating 4.5–4.79 | Gold "Great" badge | ⬜ |
| HOME-R-04 | Rating badge — Good | Rating 4.0–4.49 | Blue "Good" badge | ⬜ |
| HOME-R-05 | Rating badge — Needs Improvement | Rating < 4.0 | Orange "Needs Improvement" badge | ⬜ |
| HOME-R-06 | Star distribution bars | View 5-star breakdown | Horizontal bars showing percentage per star level (1–5) | ⬜ |
| HOME-R-07 | Tips to improve | Scroll to tips section | 5 bullet items with improvement suggestions | ⬜ |
| HOME-R-08 | Recent feedback | Scroll to feedback section | Rider name, star rating, comment, timeago date for each feedback entry | ⬜ |
| HOME-R-09 | Zero total ratings (division safe) | Driver with 0 total ratings | Bars show 0%; no division-by-zero crash | ⬜ |

---

## 22. Home — Support

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| HOME-SUP-01 | Chat with us | Tap "Chat with us" tile | Navigates to SupportChatScreen | ⬜ |
| HOME-SUP-02 | Call us | Tap "Call us" tile | Launches dialer with `tel:+2348100000000` | ⬜ |
| HOME-SUP-03 | Email us | Tap "Email" tile | Launches mail client with `mailto:blackliveryinc@gmail.com` | ⬜ |
| HOME-SUP-04 | FAQ bottom sheet | Tap "FAQ" tile | Bottom sheet opens with 5 expandable FAQ items | ⬜ |
| HOME-SUP-05 | FAQ expansion | Tap one FAQ question | ExpansionTile expands showing answer text | ⬜ |
| HOME-SUP-06 | URL launch failure | tel/mailto fails (no app) | SnackBar "Could not launch…" | ⬜ |

---

## 23. Ride — Request & Timer

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| RIDE-REQ-01 | Receive ride request | Driver online → rider requests ride in proximity | RideRequestOverlay/RideRequestSheet appears with ride details | ⬜ |
| RIDE-REQ-02 | 15-second countdown timer | Request overlay appears | Timer counts from 15 → 0; visible countdown in UI | ⬜ |
| RIDE-REQ-03 | Timer expires — auto-decline | Let 15s timer reach 0 | Request auto-declined; overlay dismissed; socket emits `ride:decline` | ⬜ |
| RIDE-REQ-04 | Request shows rider info | View request sheet | Rider name, pickup address, dropoff address, fare, distance displayed | ⬜ |
| RIDE-REQ-05 | Request shows payment method | View request sheet | Payment method indicator visible (cash/card/wallet) | ⬜ |
| RIDE-REQ-06 | Accept ride button | Tap "Accept" before timer expires | Socket emits `ride:accept {rideId}`; navigates to RideAcceptedScreen | ⬜ |
| RIDE-REQ-07 | Decline ride button | Tap "Decline" on request sheet | Request dismissed; socket emits `ride:decline`; returns to map | ⬜ |
| RIDE-REQ-08 | Socket event `ride:offer` | Server emits `ride:offer` | App handles event; displays request UI | ⬜ |
| RIDE-REQ-09 | Legacy `ride_request` event | Server emits `ride_request` (legacy) | Same handling as `ride:offer` (aliased) | ⬜ |
| RIDE-REQ-10 | Multiple rapid requests | Decline one → another arrives immediately | Previous overlay fully dismissed before new one appears | ⬜ |

---

## 24. Ride — Accept & Navigate to Pickup

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| RIDE-NAV-01 | Route polyline displayed | Accept ride → RideAcceptedScreen loads | Google Map shows polyline from driver location to pickup point | ⬜ |
| RIDE-NAV-02 | Driver + pickup markers | On accepted screen | Custom driver marker and pickup location marker visible on map | ⬜ |
| RIDE-NAV-03 | Navigate button | Tap navigate/directions button | Launches Google Maps navigation via `google.navigation:q=lat,lng` intent | ⬜ |
| RIDE-NAV-04 | Navigate fallback (no Google Maps) | Device without Google Maps app | Falls back to Google Maps URL in browser | ⬜ |
| RIDE-NAV-05 | Call rider | Tap call button | Launches dialer with `tel:` URI for rider's phone number | ⬜ |
| RIDE-NAV-06 | Chat with rider | Tap chat button | Navigates to ChatScreen with rideId and riderName | ⬜ |
| RIDE-NAV-07 | 50m arrival auto-detection | Drive within 50 meters of pickup | System auto-detects arrival; transitions to arrived state | ⬜ |
| RIDE-NAV-08 | Manual arrival button | Tap "Arrived" / Slide to arrive | Calls `rideProvider.updateStatus('arrived')` | ⬜ |
| RIDE-NAV-09 | Cancel ride (with reasons) | Tap cancel → select reason → confirm | Shows 5 cancel reasons; calls `updateStatus('cancelled')` with selected reason; pops to DriverMapScreen | ⬜ |
| RIDE-NAV-10 | Real-time location updates | Drive toward pickup | Driver marker moves; location emitted via socket `location:update` | ⬜ |

---

## 25. Ride — Arrival & Waiting

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| RIDE-ARR-01 | Arrived state UI | Driver marks arrived | Screen shows "Arrived at pickup" state; waiting timer starts | ⬜ |
| RIDE-ARR-02 | Free waiting timer (5 min) | Wait at pickup | Timer counts up; free waiting indicator shown for first 5 minutes (300s) | ⬜ |
| RIDE-ARR-03 | Paid waiting transition | Wait > 5 minutes | UI transitions from "Free Waiting" to "Paid Waiting" indicator | ⬜ |
| RIDE-ARR-04 | Start trip / slide to start | Rider boards → Tap "Start Trip" or slide | Calls `rideProvider.updateStatus('in_progress')` → navigates to TripScreen | ⬜ |
| RIDE-ARR-05 | Cancel during waiting | Tap cancel while waiting | Cancel dialog with reasons; cancellation processed | ⬜ |

---

## 26. Ride — Trip In-Progress

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| RIDE-TRIP-01 | Trip screen shows route | Start trip → TripScreen loads | Map shows polyline from current position to dropoff | ⬜ |
| RIDE-TRIP-02 | Real-time driver tracking | Drive during trip | Driver marker updates continuously; location streamed via socket | ⬜ |
| RIDE-TRIP-03 | External maps launch | Tap navigate/directions button on TripScreen | Opens Google Maps or fallback URL for turn-by-turn directions | ⬜ |
| RIDE-TRIP-04 | SOS button | Tap SOS (red emergency button) | POST `/api/v1/rides/{rideId}/sos` with location → launches `tel:911` | ⬜ |
| RIDE-TRIP-05 | Complete trip / slide to complete | Arrive at dropoff → Slide "Complete Trip" | Calls `rideProvider.updateStatus('completed')` → navigates to TripCompletedScreen | ⬜ |
| RIDE-TRIP-06 | Cancel during trip | Tap cancel (with penalty warning) | Warning dialog mentioning penalties; calls `updateStatus('cancelled')` | ⬜ |
| RIDE-TRIP-07 | Trip fare display | View bottom panel during trip | Shows fare amount, distance, ETA or elapsed time | ⬜ |
| RIDE-TRIP-08 | `mounted` guard checks | Background the app during status update | `mounted` checks prevent setState on disposed widget | ⬜ |

---

## 27. Ride — Trip Completion & Rating

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| RIDE-COMP-01 | Completion screen displays | Trip completed → TripCompletedScreen | Shows green checkmark, "Trip Complete" header, fare breakdown | ⬜ |
| RIDE-COMP-02 | Fare breakdown details | View completion screen | Base fare, tips (if any), total, distance, pickup/dropoff addresses | ⬜ |
| RIDE-COMP-03 | Star rating selection | Tap 1-5 stars | Selected star count highlighted (gold); rating stored | ⬜ |
| RIDE-COMP-04 | Feedback tags | Select feedback tags | 7 tags available (e.g., "Friendly", "Clean car", etc.); multiple selectable | ⬜ |
| RIDE-COMP-05 | Submit rating | Select stars + optional tags → Tap submit | Rating submitted via API; navigates back to DriverMapScreen | ⬜ |
| RIDE-COMP-06 | Skip rating | Tap "Done" without rating | Navigates to DriverMapScreen (pushAndRemoveUntil, clears stack) | ⬜ |
| RIDE-COMP-07 | Payment method shown | View completion screen | Payment method indicator (cash/card/wallet) displayed | ⬜ |

---

## 28. Ride — Cancellation

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| RIDE-CAN-01 | Cancel with reason selection | Tap cancel → dialog shows 5 reasons | Can select a reason before confirming cancellation | ⬜ |
| RIDE-CAN-02 | Cancel reason minimum length | Enter custom reason < 3 chars | Validation: minimum 3 characters for cancel reason | ⬜ |
| RIDE-CAN-03 | Rider cancels ride | Rider cancels remotely | Socket receives `ride:cancelled` → overlay/screen dismissed → SnackBar notification | ⬜ |
| RIDE-CAN-04 | Cancel from accepted screen | On RideAcceptedScreen → Cancel | Returns to DriverMapScreen | ⬜ |
| RIDE-CAN-05 | Cancel from trip screen (penalty) | On TripScreen → Cancel | Warning dialog about penalties → processes cancellation | ⬜ |
| RIDE-CAN-06 | Server-side cancellation event | Server emits `ride:cancelled` | App handles event; clears ride state; returns to map | ⬜ |

---

## 29. Ride — Scheduled Rides

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| RIDE-SCH-01 | Receive scheduled ride request | Scheduled ride becomes due | ScheduledRideRequestSheet appears (no countdown timer) | ⬜ |
| RIDE-SCH-02 | No timer on scheduled request | View ScheduledRideRequestSheet | No 15s countdown — driver can review at leisure | ⬜ |
| RIDE-SCH-03 | Accept scheduled ride | Tap "Accept" on scheduled request | Ride accepted; enters normal ride flow | ⬜ |
| RIDE-SCH-04 | Decline scheduled ride | Tap "Decline" on scheduled request | Request dismissed; returns to map | ⬜ |
| RIDE-SCH-05 | Scheduled ride details | View RideRequestDetailScreen | Shows scheduled date/time, rider info, pickup/dropoff, fare | ⬜ |

---

## 30. Delivery — Request

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| DEL-REQ-01 | Receive delivery request | Driver online + acceptDeliveries=true → delivery request emitted | DeliveryRequestSheet appears with orange theme | ⬜ |
| DEL-REQ-02 | 20-second countdown timer | Request sheet appears | Timer counts from 20 → 0 (5s longer than ride requests) | ⬜ |
| DEL-REQ-03 | Timer expires — auto-decline | Let 20s timer reach 0 | Request auto-declined; sheet dismissed | ⬜ |
| DEL-REQ-04 | Delivery details shown | View request sheet | Sender name/phone, pickup/dropoff, fare, distance, package type, package weight, proof required | ⬜ |
| DEL-REQ-05 | Accept delivery | Tap "Accept" before timer | Delivery accepted; navigates to DeliveryPickupScreen | ⬜ |
| DEL-REQ-06 | Decline delivery | Tap "Decline" | Request dismissed; returns to map | ⬜ |
| DEL-REQ-07 | Socket event `delivery:offer` | Server emits `delivery:offer` | App handles event; displays delivery request UI | ⬜ |
| DEL-REQ-08 | Package types displayed | View various delivery requests | Shows correct packageType label: documents, parcel, bulk, food, medical | ⬜ |

---

## 31. Delivery — Pickup Flow

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| DEL-PICK-01 | Navigate to pickup | Accept delivery → DeliveryPickupScreen | Map shows route polyline from driver to pickup location | ⬜ |
| DEL-PICK-02 | Phase: Navigating | Initial phase after accept | Orange arrow header; "Slide when arrived" action slider | ⬜ |
| DEL-PICK-03 | Slide to arrive | Slide "Slide when arrived" | Calls `rideProvider.updateStatus('arrived')`; transitions to arrived phase; starts waiting timer | ⬜ |
| DEL-PICK-04 | Phase: Arrived | After marking arrived | Green check header; "Slide: Package Collected" action slider | ⬜ |
| DEL-PICK-05 | Free waiting at pickup | Wait at pickup location | Timer counts up; free waiting for 5 min (300s), then paid waiting | ⬜ |
| DEL-PICK-06 | Slide: Package Collected | Slide "Package Collected" | Calls `rideProvider.updateStatus('in_progress')`; pushReplacement to DeliveryTripScreen | ⬜ |
| DEL-PICK-07 | Package info card | View pickup screen | Shows package type, weight, description, proof requirement badge | ⬜ |
| DEL-PICK-08 | Sender action buttons | View sender section | Navigate / Call / Chat action buttons for sender | ⬜ |
| DEL-PICK-09 | Call sender | Tap call button | Launches dialer with `tel:` URI for sender's phone | ⬜ |
| DEL-PICK-10 | Open navigation | Tap navigate button | Launches Google Maps intent `google.navigation:q=lat,lng` | ⬜ |
| DEL-PICK-11 | Cancel delivery | Tap cancel button | Dialog with cancel reasons; calls `updateStatus('cancelled')`; pops to DriverMapScreen | ⬜ |
| DEL-PICK-12 | Chat with sender | Tap chat button | Navigates to ChatScreen | ⬜ |

---

## 32. Delivery — Trip & Drop-off

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| DEL-TRIP-01 | Trip screen with route | Package collected → DeliveryTripScreen | Map shows polyline from pickup to dropoff | ⬜ |
| DEL-TRIP-02 | Recipient info panel | View bottom panel | Recipient name, avatar, navigate/call/chat action buttons | ⬜ |
| DEL-TRIP-03 | Call recipient | Tap call button | Launches `tel:` URI for recipient's phone | ⬜ |
| DEL-TRIP-04 | Navigate to dropoff | Tap navigate button | Google Maps intent for dropoff location | ⬜ |
| DEL-TRIP-05 | Slide to complete (no proof) | proofRequired=none → Slide "Complete Delivery" | `updateStatus('completed')` → DeliveryCompletedScreen | ⬜ |
| DEL-TRIP-06 | Slide to complete (proof needed) | proofRequired=photo/signature/both → Slide | Routes to DeliveryProofScreen instead | ⬜ |
| DEL-TRIP-07 | SOS button | Tap red SOS button | POST `/api/v1/rides/{rideId}/sos` with current location → launches `tel:911` | ⬜ |
| DEL-TRIP-08 | Cancel with penalty warning | Tap cancel button | Warning dialog mentioning penalties | ⬜ |
| DEL-TRIP-09 | Chat with recipient | Tap chat button | Navigates to ChatScreen | ⬜ |
| DEL-TRIP-10 | `_isCompleting` guard | Tap complete multiple times rapidly | Only one completion request processed (guard prevents double-tap) | ⬜ |

---

## 33. Delivery — Proof of Delivery

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| DEL-PROOF-01 | Take delivery photo | Tap camera card → capture photo | ImagePicker (camera, maxWidth 1280, quality 80) → preview shown | ⬜ |
| DEL-PROOF-02 | Retake photo | Photo captured → Tap "Retake" | Camera reopens; new photo replaces previous | ⬜ |
| DEL-PROOF-03 | Collect signature | Tap "Collect Signature" → sign on pad | Signature modal opens with white canvas; draw signature with finger | ⬜ |
| DEL-PROOF-04 | Signature clear | Drawing on pad → Tap "Clear" | Canvas cleared; all strokes removed | ⬜ |
| DEL-PROOF-05 | Signature confirm | Draw signature → Tap "Confirm" | Signature captured as PNG (via RepaintBoundary.toImage); modal closes | ⬜ |
| DEL-PROOF-06 | Submit proof — photo only | proofRequired=photo → take photo → Submit | Photo encoded as base64; uploaded via `DeliveryService.uploadProof()`; navigates to CompletedScreen | ⬜ |
| DEL-PROOF-07 | Submit proof — signature only | proofRequired=signature → collect signature → Submit | Signature encoded as base64; uploaded | ⬜ |
| DEL-PROOF-08 | Submit proof — both required | proofRequired=both → take photo + collect signature → Submit | Both encoded and uploaded together | ⬜ |
| DEL-PROOF-09 | Submit without required photo | proofRequired=photo → Skip photo → Submit | "Submit" button disabled (greyed out); `_canSubmit` returns false | ⬜ |
| DEL-PROOF-10 | Submit without required signature | proofRequired=signature → Skip signature → Submit | "Submit" button disabled | ⬜ |
| DEL-PROOF-11 | Optional notes field | Enter notes text → Submit | Notes included in upload payload | ⬜ |
| DEL-PROOF-12 | `_isSubmitting` guard | Tap "Submit" rapidly | Only one submission processed | ⬜ |
| DEL-PROOF-13 | Upload error handling | API returns error | Error state displayed; SnackBar; can retry | ⬜ |

---

## 34. Delivery — Completion

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| DEL-COMP-01 | Completion screen display | Delivery completed → DeliveryCompletedScreen | Green checkmark, "Delivery Complete" header | ⬜ |
| DEL-COMP-02 | Earnings card | View completion screen | Shows fare, tips (if any), total earnings | ⬜ |
| DEL-COMP-03 | Delivery details | View details section | Package type, distance, pickup/dropoff addresses | ⬜ |
| DEL-COMP-04 | Payment method indicator | View completion screen | Payment method badge (cash/card/wallet) | ⬜ |
| DEL-COMP-05 | "Done" button | Tap "Done" (gold button) | Navigates to DriverMapScreen (pushAndRemoveUntil, clears entire stack) | ⬜ |

---

## 35. Earnings — Dashboard

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| EARN-D-01 | Earnings dashboard loads | Open EarningsScreen | CustomScrollView with SliverAppBar showing "Earnings" | ⬜ |
| EARN-D-02 | Daily earnings gauge | View daily section | Half-circle arc gauge: current earnings vs daily goal; stats row (rides, fare, tips) | ⬜ |
| EARN-D-03 | Set daily goal | Tap "Set goal" → enter amount → Save | Goal saved via `earningsProvider.setDailyGoal(amount)`; gauge updates | ⬜ |
| EARN-D-04 | Weekly interactive chart | View weekly section | fl_chart BarChart with 7 bars (Mon–Sun); touch tooltips showing day + amount | ⬜ |
| EARN-D-05 | Monthly interactive chart | View monthly section | fl_chart BarChart with 12 bars; touch tooltips | ⬜ |
| EARN-D-06 | Payment split bar | View payment section | Horizontal bar showing in-app% vs cash% with currency amounts | ⬜ |
| EARN-D-07 | Last payout card | View payout section | Shows last payout amount, date, status | ⬜ |
| EARN-D-08 | Next payout card | View payout section | Shows estimated next payout info | ⬜ |
| EARN-D-09 | Navigate to payout history | Tap "View Payout History" | Navigates to PayoutHistoryScreen | ⬜ |
| EARN-D-10 | Navigate to payout/bank | Tap "Request Payout / Update Bank Details" | Navigates to PayoutScreen | ⬜ |
| EARN-D-11 | Error with retry (max 3) | API fails → retry | Retry up to 3 times; error state with retry button shown | ⬜ |
| EARN-D-12 | Offline cache fallback | Go offline → open earnings | Cached data loaded from CacheService; stale data shown | ⬜ |
| EARN-D-13 | Gauge percentage clamping | Goal=0 or Goal < earnings | Percentage clamped to 0.0–1.0 range; no overflow | ⬜ |
| EARN-D-14 | Non-finite value safety | API returns NaN or Infinity amounts | Charts replace non-finite values with 0.0 | ⬜ |

---

## 36. Earnings — Payouts

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| EARN-P-01 | Request payout tab | Open PayoutScreen → "Request Payout" tab | Amount TextField with currency prefix, available balance display | ⬜ |
| EARN-P-02 | Request payout — valid amount | Enter amount > 0 → Tap "Request Payout" | `earningsProvider.requestPayout(amount)` → success SnackBar | ⬜ |
| EARN-P-03 | Request payout — zero amount | Enter 0 → Tap "Request Payout" | Validation error: amount must be > 0 | ⬜ |
| EARN-P-04 | Bank details tab (Nigeria) | Switch to "Bank Details" tab as NG driver | Dropdown for bank selection, account number field, routing number field | ⬜ |
| EARN-P-05 | Nigerian bank account verification | Select bank + enter account number | Debounced (600ms) auto-verification → account name auto-fills with green check | ⬜ |
| EARN-P-06 | Account verification debounce | Type account number rapidly | Verification only triggers 600ms after last keystroke | ⬜ |
| EARN-P-07 | Save bank details | Fill all bank fields → Tap "Save Bank Details" | `earningsProvider.updateBankDetails()` called → success SnackBar | ⬜ |
| EARN-P-08 | Stripe setup tab (Chicago) | Switch to "Stripe Setup" tab as US driver | Stripe Express description + "Open Stripe Dashboard" button | ⬜ |
| EARN-P-09 | Open Stripe dashboard | Tap "Open Stripe Dashboard" | `earningsProvider.fetchStripeDashboardUrl()` → launches URL in external browser | ⬜ |
| EARN-P-10 | Tab label — NG vs US | Open PayoutScreen by region | NG shows "Bank Details" tab; US shows "Stripe Setup" tab | ⬜ |
| EARN-P-11 | Payout error handling | API error during payout | SnackBar with error message; form still editable | ⬜ |

---

## 37. Earnings — Payout History

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| EARN-H-01 | Load payout history | Open PayoutHistoryScreen | List of past payouts loaded | ⬜ |
| EARN-H-02 | Payout item details | View individual payout entry | Date, amount, bank name, status badge, reference ID | ⬜ |
| EARN-H-03 | Status badge — completed | Completed payout | Green badge | ⬜ |
| EARN-H-04 | Status badge — pending | Pending payout | Orange badge | ⬜ |
| EARN-H-05 | Status badge — failed | Failed payout | Red badge | ⬜ |
| EARN-H-06 | Total payouts summary | View top summary card | Formatted total payout amount | ⬜ |
| EARN-H-07 | Pull to refresh | Pull down on list | `RefreshIndicator` triggers `loadPayoutHistory()` reload | ⬜ |
| EARN-H-08 | Empty state | No payout history | "No payouts yet" text displayed | ⬜ |

---

## 38. History — Upcoming Bookings

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| HIST-U-01 | Load upcoming rides | Open BookingsScreen | List of upcoming/scheduled rides loaded via `loadUpcomingRides()` | ⬜ |
| HIST-U-02 | Upcoming ride card details | View individual card | Rider name + star rating + date, car-move image, pickup/dropoff addresses, fare + payment + distance | ⬜ |
| HIST-U-03 | Call rider from booking | Tap "Call Rider" button | Launches `tel:` URI for rider's phone | ⬜ |
| HIST-U-04 | Call rider — no phone | Rider has no phone number | SnackBar "Phone number unavailable" | ⬜ |
| HIST-U-05 | Decline scheduled ride | Tap "Decline Schedule" (red) → Confirm dialog | Confirmation → `updateRideStatus('cancelled', reason: 'Driver declined')` → refreshes list | ⬜ |
| HIST-U-06 | Pull to refresh | Pull down on bookings list | RefreshIndicator triggers reload | ⬜ |
| HIST-U-07 | Navigate to ride history | Tap "View Ride History" link | Navigates to RideHistoryScreen | ⬜ |
| HIST-U-08 | Empty state | No upcoming rides | "No upcoming rides" text | ⬜ |
| HIST-U-09 | Header image | View top of screen | `upcoming-riders.png` header image displayed | ⬜ |

---

## 39. History — Ride History

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| HIST-R-01 | Load ride history | Open RideHistoryScreen | First page of ride history loaded | ⬜ |
| HIST-R-02 | Filter — All | Select "All" ChoiceChip | All rides shown regardless of status | ⬜ |
| HIST-R-03 | Filter — Completed | Select "Completed" chip | Only completed rides shown | ⬜ |
| HIST-R-04 | Filter — Cancelled | Select "Cancelled" chip | Only cancelled rides shown (red text/icon) | ⬜ |
| HIST-R-05 | Filter — In Progress | Select "In Progress" chip | Only in-progress rides shown | ⬜ |
| HIST-R-06 | Infinite scroll pagination | Scroll to bottom (within 200px) | `loadRideHistory()` triggered for next page; loading indicator at bottom | ⬜ |
| HIST-R-07 | Pagination stops at end | All pages loaded (hasMore=false) | No more loading triggers on scroll | ⬜ |
| HIST-R-08 | Ride history item display | View individual item | Status (icon + text), pickup + dropoff addresses, date (formatted), fare | ⬜ |
| HIST-R-09 | Tap item — earnings breakdown | Tap on a ride history item | Modal bottom sheet: ride fare, final fare, distance, tips (green), driver earnings (gold), payment status, payment gateway | ⬜ |
| HIST-R-10 | Selected filter chip style | Select a filter | Gold background on selected ChoiceChip | ⬜ |
| HIST-R-11 | Client-side filtering | Filter changes with loaded data | Filtering applied on already-fetched rides (no new API call) | ⬜ |

---

## 40. Settings — Personal Info

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| SET-PI-01 | Display profile info | Open PersonalInfoScreen | Name, email, phone displayed (name non-editable) | ⬜ |
| SET-PI-02 | Edit phone number | Tap edit icon on phone → enter new phone → Save | `updateProfile(phoneNumber: newPhone)` → profile refreshed | ⬜ |
| SET-PI-03 | Edit email | Tap edit icon on email → enter new email → Save | `updateProfile(email: newEmail)` → "Email updated. Please log in again" → auto-logout → LoginScreen | ⬜ |
| SET-PI-04 | Edit with empty input | Open edit dialog → leave empty → Save | Save button disabled if input empty | ⬜ |
| SET-PI-05 | Firebase fallback | Backend user is null | Falls back to `FirebaseAuth.instance.currentUser` data (displayName, email, phoneNumber) | ⬜ |
| SET-PI-06 | Profile fetch failure | API error on getProfile() | SnackBar with error message | ⬜ |

---

## 41. Settings — Password & Security

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| SET-SEC-01 | Change password — valid | Enter current + new (≥6 chars) + confirm (matching) → Update | `changePassword(current, new)` → success SnackBar → pops back | ⬜ |
| SET-SEC-02 | Change password — empty fields | Leave any field empty → Update | SnackBar "Please fill in all fields" | ⬜ |
| SET-SEC-03 | Change password — short new | New password < 6 chars | SnackBar "New password must be at least 6 characters" | ⬜ |
| SET-SEC-04 | Change password — mismatch | New ≠ Confirm | SnackBar "New passwords do not match" | ⬜ |
| SET-SEC-05 | Enable biometric login | Toggle biometric ON in LoginSecurityScreen | System biometric prompt → authenticate → `setEnabled(true)` | ⬜ |
| SET-SEC-06 | Disable biometric login | Toggle biometric OFF | `setEnabled(false)` → secure storage credentials cleared | ⬜ |
| SET-SEC-07 | Biometric unavailable | Device lacks biometric hardware | Toggle disabled / not shown | ⬜ |
| SET-SEC-08 | Link Google account | Tap "Link Google Account" | `linkGoogleAccount()` → success SnackBar | ⬜ |
| SET-SEC-09 | Set up passkey — full flow | Passkeys → "Set up Passkey" → verify password → biometric | Password verified → biometric auth → credentials saved → passkey enabled | ⬜ |
| SET-SEC-10 | Passkey — wrong password | Enter wrong password in verification dialog | SnackBar "Incorrect password." | ⬜ |
| SET-SEC-11 | Passkey — biometric fails | Password correct → biometric fails | SnackBar "Biometric authentication failed." | ⬜ |
| SET-SEC-12 | Passkey — biometric unavailable | Device has no biometric | SnackBar "Biometric authentication not available on this device" | ⬜ |
| SET-SEC-13 | Toggle 2FA on | Enable Two-Factor Authentication toggle | `AuthService.toggle2fa(true)` → 2FA enabled for account | ⬜ |
| SET-SEC-14 | Toggle 2FA off | Disable Two-Factor Authentication toggle | `AuthService.toggle2fa(false)` → 2FA disabled | ⬜ |

---

## 42. Settings — Emergency Contacts

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| SET-EC-01 | View existing contacts | Open EmergencyContactsScreen (settings) | List of contacts with name, phone, relationship, remove button | ⬜ |
| SET-EC-02 | Remove contact | Tap remove icon on a contact | Contact filtered out → `updateProfile(emergencyContacts: updated)` → profile refreshed | ⬜ |
| SET-EC-03 | Add contact (< 3) | Tap "Add Emergency Contact" | Navigates to ChooseContactsScreen | ⬜ |
| SET-EC-04 | Max 3 contacts limit | Already have 3 contacts → Tap "Add" | SnackBar "You can have up to 3 emergency contacts" | ⬜ |
| SET-EC-05 | Choose from phone contacts | ChooseContactsScreen → grant permission → search/select | Phone contacts listed with CheckboxListTile; search by name or phone | ⬜ |
| SET-EC-06 | Contact permission denied | Deny contacts permission | "Permission Denied" message + "Open Settings" button | ⬜ |
| SET-EC-07 | Select multiple contacts | Check 2 contacts → Tap "Add 2 contacts" | Both added with relationship="Other"; merged with existing; max 3 enforced | ⬜ |
| SET-EC-08 | Contact search filter | Type search query | Contacts filtered by name or phone number containing query | ⬜ |

---

## 43. Settings — Ride Modes & Earnings Model

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| SET-RM-01 | Select instant ride mode | RideModesScreen → Select "Instant" → Save | `updateProfileField('rideMode', 'instant')` → success SnackBar → pop | ⬜ |
| SET-RM-02 | Select scheduled ride mode | Select "Scheduled" → Save | `rideMode: 'scheduled'` saved | ⬜ |
| SET-RM-03 | Select all ride mode | Select "All" → Save | `rideMode: 'all'` saved | ⬜ |
| SET-RM-04 | Ride mode save failure | API error during save | SnackBar with error message | ⬜ |
| SET-RM-05 | Switch to scheduled payout model | EarningsModelsScreen → Select "Scheduled Payout" | `updateProfileField('autoPayoutEnabled', true)` → gold border + checkmark | ⬜ |
| SET-RM-06 | Switch to manual payout model | Select "Manual Payout" | `autoPayoutEnabled: false` → card shows "Currently active" | ⬜ |
| SET-RM-07 | Earnings model reflects current | Open EarningsModelsScreen | Current model has gold border + "Currently active" subtitle from `user.driverProfile.autoPayoutEnabled` | ⬜ |

---

## 44. Settings — General

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| SET-GEN-01 | Notification toggle — Ride Requests | Toggle ride request notifications | Persisted to SharedPreferences key `pref_ride_request_notifications` | ⬜ |
| SET-GEN-02 | Notification toggle — Promotions | Toggle promotion notifications | Persisted to SharedPreferences | ⬜ |
| SET-GEN-03 | Notification toggle — Earnings | Toggle earnings notifications | Persisted to SharedPreferences | ⬜ |
| SET-GEN-04 | Change region | Settings → Region → select new region from bottom sheet | `AuthProvider.updateProfile(region: ...)` + `RegionProvider.setRegion()` → currency/phone updates | ⬜ |
| SET-GEN-05 | Privacy Policy link | Tap Privacy Policy | Opens `https://blacklivery.com/privacy` in external browser | ⬜ |
| SET-GEN-06 | Terms of Service link | Tap Terms of Service | Opens `https://blacklivery.com/terms` in external browser | ⬜ |
| SET-GEN-07 | About dialog | Tap About | `showAboutDialog` with version from `PackageInfo` | ⬜ |
| SET-GEN-08 | Logout — confirm | Tap "Log Out" → Confirm in dialog | `AuthProvider.logout()` → navigates to SplashScreen (pushAndRemoveUntil) | ⬜ |
| SET-GEN-09 | Logout — cancel | Tap "Log Out" → Cancel in dialog | Dialog dismissed; stays on settings | ⬜ |
| SET-GEN-10 | Delete account | Tap "Delete Account" → Confirm | Directs to SupportScreen (manual process) | ⬜ |
| SET-GEN-11 | Version display | Scroll to bottom of settings | Shows "1.0.0" version text | ⬜ |
| SET-GEN-12 | Navigate to Document Verification | Tap "Document Verification" | Opens DocumentsScreen for re-uploading/updating documents | ⬜ |

---

## 45. Chat — In-Ride Chat

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| CHAT-R-01 | Open chat during ride | Tap chat button on ride/delivery screen | ChatScreen opens; polling starts with `startPolling(rideId, driverId)` | ⬜ |
| CHAT-R-02 | Send message | Type text → Tap send button | `sendMessage(rideId, text, driverId)` → message appears as driver bubble (right, primary color) | ⬜ |
| CHAT-R-03 | Empty message guard | Tap send with empty/whitespace input | Nothing happens (trimmed text check) | ⬜ |
| CHAT-R-04 | Receive rider message | Rider sends message during ride | Message appears as rider bubble (left, card color) via polling | ⬜ |
| CHAT-R-05 | Message timestamps | View message bubbles | Grey timestamp below each bubble | ⬜ |
| CHAT-R-06 | Auto-scroll to bottom | New message sent/received | List auto-scrolls to bottom (animated) | ⬜ |
| CHAT-R-07 | Empty chat state | No messages yet | "No messages yet" text displayed | ⬜ |
| CHAT-R-08 | Polling stops on dispose | Leave ChatScreen | `stopPolling()` called in dispose | ⬜ |
| CHAT-R-09 | AppBar shows rider name | Open chat | AppBar title displays the rider's name | ⬜ |

---

## 46. Chat — Support Chat

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| CHAT-S-01 | First message creates ticket | Type message → Send (no active ticket) | `SupportService.createTicket('Support Request', text)` → ticket created + displayed | ⬜ |
| CHAT-S-02 | Reply to existing ticket | Active ticket exists → Type message → Send | `SupportService.replyToTicket(ticketId, text)` | ⬜ |
| CHAT-S-03 | Message alignment | View messages | Support messages = left-aligned (card fill); User messages = right-aligned (primary fill) | ⬜ |
| CHAT-S-04 | Time separator chips | Messages > 30 min apart | Grey rounded chip showing time inserted between messages | ⬜ |
| CHAT-S-05 | Auto-polling (10s) | Active conversation | `Timer.periodic(10s)` polls for new messages via `_refreshTicket()` | ⬜ |
| CHAT-S-06 | Auto-scroll to bottom | New message sent | List auto-scrolls to latest message | ⬜ |
| CHAT-S-07 | Empty state | No active ticket, no messages | "No conversation yet. Send a message to get started." | ⬜ |
| CHAT-S-08 | Send failure | API error during send | SnackBar "Failed to send message" | ⬜ |
| CHAT-S-09 | Ticket fetch failure | API error fetching tickets | Silent failure (debugPrint only) | ⬜ |

---

## 47. Core — Connectivity & Offline

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| CORE-C-01 | Online → Offline transition | Disable network on device | `ConnectivityService._isOnline` → false; stream emits false; "OFFLINE" debugPrinted | ⬜ |
| CORE-C-02 | Offline → Online transition | Re-enable network | `_isOnline` → true; stream emits true; "ONLINE" debugPrinted | ⬜ |
| CORE-C-03 | Earnings offline cache | Go offline → open EarningsScreen | Cached earnings data loaded from CacheService instead of API | ⬜ |
| CORE-C-04 | Cache init required | Use CacheService before `init()` | Throws null reference error on `_prefs!` | ⬜ |
| CORE-C-05 | Cache JSON round-trip | Store Map via `setJson` → retrieve via `getJson` | Data round-trips correctly through `jsonEncode`/`jsonDecode` | ⬜ |
| CORE-C-06 | Duplicate connectivity events | Network flickers rapidly | Only emits when value actually changes (not duplicate broadcasts) | ⬜ |

---

## 48. Core — Push Notifications

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| CORE-PN-01 | FCM permission request | First app launch | System permission dialog for notifications (alert/badge/sound) | ⬜ |
| CORE-PN-02 | FCM token registration | After permission granted | Token obtained → POST `/api/v1/auth/fcm-token` with `{token}` | ⬜ |
| CORE-PN-03 | Token refresh | FCM token rotated | New token re-registered with backend | ⬜ |
| CORE-PN-04 | Foreground ride request notification | Foreground app receives `type: 'ride:offer'` | High-priority channel (`blacklivery_ride_requests`), `fullScreenIntent: true` | ⬜ |
| CORE-PN-05 | Foreground general notification | Foreground app receives non-ride push | Standard channel (`blacklivery_updates`) | ⬜ |
| CORE-PN-06 | Notification tap → navigate | Tap notification banner/drawer | Extracts `rideId` from data → navigates to DriverMapScreen | ⬜ |
| CORE-PN-07 | Background message handler | Push received while app backgrounded | `firebaseMessagingBackgroundHandler` processes message | ⬜ |
| CORE-PN-08 | Cold start from notification | App killed → tap notification in system tray | `getInitialMessage()` processes launch notification → navigates | ⬜ |
| CORE-PN-09 | Token removal on logout | User logs out | `DELETE /api/v1/auth/fcm-token` with `{token: currentToken}` | ⬜ |
| CORE-PN-10 | iOS APNs token wait | iOS first launch | Waits for APNs token before getting FCM token | ⬜ |
| CORE-PN-11 | Clear badge on notifications screen | Open NotificationsScreen | `cancelAll()` clears all local notification badges | ⬜ |

---

## Summary

| Category | Count |
|----------|-------|
| Authentication — Login | 12 |
| Authentication — Registration | 10 |
| Authentication — OTP & 2FA | 8 |
| Authentication — Social & Biometric | 7 |
| Authentication — Password Recovery | 4 |
| Onboarding — Phone & OTP | 6 |
| Onboarding — Account Creation | 4 |
| Onboarding — Email Verification | 4 |
| Onboarding — Emergency Contacts | 7 |
| Onboarding — Vehicle & Documents | 17 |
| Onboarding — Account Setup & Approval | 11 |
| Splash & Session Restore | 10 |
| Home — Driver Map / Going Online | 14 |
| Home — Location Tracking & Socket | 8 |
| Home — Heat Map | 10 |
| Home — Incentives | 6 |
| Home — Loyalty Points | 5 |
| Home — Notifications | 8 |
| Home — Preferences | 10 |
| Home — Destination Filter | 9 |
| Home — Rating Overview | 9 |
| Home — Support | 6 |
| Ride — Request & Timer | 10 |
| Ride — Accept & Navigate to Pickup | 10 |
| Ride — Arrival & Waiting | 5 |
| Ride — Trip In-Progress | 8 |
| Ride — Trip Completion & Rating | 7 |
| Ride — Cancellation | 6 |
| Ride — Scheduled Rides | 5 |
| Delivery — Request | 8 |
| Delivery — Pickup Flow | 12 |
| Delivery — Trip & Drop-off | 10 |
| Delivery — Proof of Delivery | 13 |
| Delivery — Completion | 5 |
| Earnings — Dashboard | 14 |
| Earnings — Payouts | 11 |
| Earnings — Payout History | 8 |
| History — Upcoming Bookings | 9 |
| History — Ride History | 11 |
| Settings — Personal Info | 6 |
| Settings — Password & Security | 14 |
| Settings — Emergency Contacts | 8 |
| Settings — Ride Modes & Earnings Model | 7 |
| Settings — General | 12 |
| Chat — In-Ride Chat | 9 |
| Chat — Support Chat | 9 |
| Core — Connectivity & Offline | 6 |
| Core — Push Notifications | 11 |
| **TOTAL** | **248** |
