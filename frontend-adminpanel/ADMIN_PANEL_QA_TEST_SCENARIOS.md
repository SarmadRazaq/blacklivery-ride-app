# BlackLivery Admin Panel — Comprehensive QA Test Scenarios

> **Total Test Cases: 312**
> Organized by feature area. Each test case includes ID, description, steps, expected behavior, and status.

---

## Table of Contents

1. [Authentication — Login (AUTH-L)](#1-authentication--login)
2. [Authentication — Session & Token (AUTH-S)](#2-authentication--session--token)
3. [Authentication — Access Control (AUTH-AC)](#3-authentication--access-control)
4. [Layout — Sidebar Navigation (LAY-SB)](#4-layout--sidebar-navigation)
5. [Layout — General UI (LAY-UI)](#5-layout--general-ui)
6. [Dashboard — Stats Overview (DASH-S)](#6-dashboard--stats-overview)
7. [Dashboard — Live Map (DASH-MAP)](#7-dashboard--live-map)
8. [Dashboard — Real-Time Updates (DASH-RT)](#8-dashboard--real-time-updates)
9. [Users — List & Search (USR-LS)](#9-users--list--search)
10. [Users — Status Management (USR-SM)](#10-users--status-management)
11. [Users — Document Review (USR-DOC)](#11-users--document-review)
12. [Rides — Active Rides Tab (RDE-ACT)](#12-rides--active-rides-tab)
13. [Rides — All History Tab (RDE-ALL)](#13-rides--all-history-tab)
14. [Rides — Detail & Expand (RDE-DET)](#14-rides--detail--expand)
15. [Rides — Admin Cancel (RDE-CAN)](#15-rides--admin-cancel)
16. [Rides — Real-Time Socket (RDE-RT)](#16-rides--real-time-socket)
17. [Deliveries — List & Filter (DEL-LS)](#17-deliveries--list--filter)
18. [Deliveries — Real-Time Updates (DEL-RT)](#18-deliveries--real-time-updates)
19. [Vehicles — List & Search (VEH-LS)](#19-vehicles--list--search)
20. [Vehicles — Summary Cards (VEH-SUM)](#20-vehicles--summary-cards)
21. [Pricing — Nigeria Rides (PRC-NG)](#21-pricing--nigeria-rides)
22. [Pricing — Chicago Premium (PRC-CHI)](#22-pricing--chicago-premium)
23. [Pricing — Delivery (PRC-DEL)](#23-pricing--delivery)
24. [Pricing — History (PRC-HIST)](#24-pricing--history)
25. [Disputes — List & View (DSP-LS)](#25-disputes--list--view)
26. [Disputes — Resolution (DSP-RES)](#26-disputes--resolution)
27. [Promotions — List & View (PRO-LS)](#27-promotions--list--view)
28. [Promotions — Create (PRO-CR)](#28-promotions--create)
29. [Promotions — Edit (PRO-ED)](#29-promotions--edit)
30. [Promotions — Activate/Suspend (PRO-ST)](#30-promotions--activatesuspend)
31. [Loyalty — List & Search (LOY-LS)](#31-loyalty--list--search)
32. [Loyalty — Award Bonus (LOY-AW)](#32-loyalty--award-bonus)
33. [Analytics — Revenue Cards (ANA-REV)](#33-analytics--revenue-cards)
34. [Analytics — Charts (ANA-CH)](#34-analytics--charts)
35. [Analytics — Ride & User Stats (ANA-ST)](#35-analytics--ride--user-stats)
36. [Analytics — Period Filter (ANA-PER)](#36-analytics--period-filter)
37. [Payouts — List & Filter (PAY-LS)](#37-payouts--list--filter)
38. [Payouts — Approve (PAY-AP)](#38-payouts--approve)
39. [Payouts — Detail & Expand (PAY-DET)](#39-payouts--detail--expand)
40. [Payouts — Pagination (PAY-PG)](#40-payouts--pagination)
41. [Support — Ticket List (SUP-LS)](#41-support--ticket-list)
42. [Support — Ticket Detail & Chat (SUP-CH)](#42-support--ticket-detail--chat)
43. [Support — Resolve Ticket (SUP-RES)](#43-support--resolve-ticket)
44. [Socket — Connection Lifecycle (SOCK-CL)](#44-socket--connection-lifecycle)
45. [API Client — Interceptors & Error Handling (API-INT)](#45-api-client--interceptors--error-handling)
46. [Error Boundary & Edge Cases (ERR-EC)](#46-error-boundary--edge-cases)
47. [Routing & Code Splitting (RTE-CS)](#47-routing--code-splitting)
48. [Responsive & Cross-Browser (RES-CB)](#48-responsive--cross-browser)
49. [Network & Connectivity (NET-A)](#49-network--connectivity)

---

## 1. Authentication — Login

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| AUTH-L-01 | Login with valid admin credentials | Enter valid admin email + password → Click "Sign In" | Successful login → navigates to Dashboard (`/`); toast "Welcome back!" | ⬜ |
| AUTH-L-02 | Login with invalid email format | Enter "notanemail" in email field → Click "Sign In" | Browser HTML5 validation blocks submit (input type="email") | ⬜ |
| AUTH-L-03 | Login with wrong password | Enter valid email + incorrect password → Click "Sign In" | Toast error with Firebase message (e.g., "Wrong password"); stays on login page | ⬜ |
| AUTH-L-04 | Login with empty email | Leave email blank → Click "Sign In" | Inline validation: "Email is required" in red below field | ⬜ |
| AUTH-L-05 | Login with empty password | Enter email only → Leave password blank → Click "Sign In" | Inline validation: "Password is required" in red below field | ⬜ |
| AUTH-L-06 | Login with non-admin role (rider) | Enter valid rider credentials → Click "Sign In" | Toast error: "Access denied: admin privileges required"; user signed out; stays on login | ⬜ |
| AUTH-L-07 | Login with non-admin role (driver) | Enter valid driver credentials → Click "Sign In" | Toast error: "Access denied: admin privileges required"; user signed out; stays on login | ⬜ |
| AUTH-L-08 | Login button disabled while submitting | Click "Sign In" with valid credentials | Button text changes to "Signing in..." and is disabled until response | ⬜ |
| AUTH-L-09 | Login page centered layout | Navigate to `/login` | Page has dark background (`bg-gray-900`); form card centered (`max-w-md`) | ⬜ |
| AUTH-L-10 | Branding displayed on login | View login page | "Blacklivery" title in blue; "Admin Portal Access" subtitle | ⬜ |
| AUTH-L-11 | Login with unregistered email | Enter non-existent email + any password | Toast error with Firebase "user not found" message | ⬜ |

---

## 2. Authentication — Session & Token

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| AUTH-S-01 | Token stored on login | Login successfully → Check localStorage | `token` key contains Firebase ID token string | ⬜ |
| AUTH-S-02 | Token auto-refresh on API call | Wait for token to near expiry → Make API call | Request interceptor calls `getIdToken()` which auto-refreshes; new token stored in localStorage | ⬜ |
| AUTH-S-03 | Token cleared on logout | Click "Logout" in sidebar | `token` removed from localStorage; user state set to null | ⬜ |
| AUTH-S-04 | Auth state restored on refresh | Login → Refresh browser (F5) | `onAuthStateChanged` fires; profile fetched; user remains logged in on Dashboard | ⬜ |
| AUTH-S-05 | Auth state restored — profile fetch fails | Login → Refresh with backend down | Falls back to Firebase custom claims; role checked from `tokenResult.claims.role` | ⬜ |
| AUTH-S-06 | Loading state while auth resolving | Hard-refresh page while logged in | "Loading..." centered on screen until `onAuthStateChanged` resolves | ⬜ |
| AUTH-S-07 | Logout clears auth state | Click Logout → Verify state | `user` state is null; socket disconnects; redirected to `/login` | ⬜ |

---

## 3. Authentication — Access Control

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| AUTH-AC-01 | Unauthenticated user visits dashboard | Navigate to `/` without logging in | Redirected to `/login` via `<Navigate to="/login" replace />` | ⬜ |
| AUTH-AC-02 | Unauthenticated user visits any protected route | Navigate to `/users`, `/rides`, `/analytics` etc. without auth | Redirected to `/login` for all protected routes | ⬜ |
| AUTH-AC-03 | Non-admin user visits protected route | Login as rider → Navigate to `/` | "Access Denied. Admin role required." displayed in red; no dashboard content shown | ⬜ |
| AUTH-AC-04 | 401 response triggers force logout | API returns 401 during session | Token removed from localStorage; Firebase `signOut()` called; hard redirect to `/login` | ⬜ |
| AUTH-AC-05 | 401 on login page doesn't redirect loop | Already on `/login` → 401 received | No redirect occurs (guard: `window.location.pathname !== '/login'`) | ⬜ |
| AUTH-AC-06 | Unknown route catch-all | Navigate to `/nonexistent` | Redirected to `/` (Dashboard) via `<Route path="*">` | ⬜ |
| AUTH-AC-07 | Admin profile verification on login | Login with admin account | Backend `/v1/auth/profile` called; role verified as 'admin' before granting access | ⬜ |

---

## 4. Layout — Sidebar Navigation

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| LAY-SB-01 | Sidebar renders all nav items | Login → View sidebar | 12 nav items visible: Dashboard, Users, Rides, Deliveries, Vehicles, Pricing & Surge, Disputes, Promotions, Loyalty, Analytics, Payouts, Support | ⬜ |
| LAY-SB-02 | Active nav item highlighting | Click "Users" in sidebar | Users link has `bg-blue-600 text-white`; other links are `text-gray-400` | ⬜ |
| LAY-SB-03 | Dashboard active on index route | Navigate to `/` | Dashboard nav item highlighted (uses `end` prop for exact match) | ⬜ |
| LAY-SB-04 | Sidebar branding | View sidebar header | "Blacklivery" in blue-500; "Admin Panel" subtitle in gray-400 | ⬜ |
| LAY-SB-05 | Logout button in sidebar | View sidebar footer | Red "Logout" button with LogOut icon at bottom, separated by border | ⬜ |
| LAY-SB-06 | Logout confirmation | Click "Logout" button | Calls `AuthContext.logout()`; Firebase `signOut()` → token cleared → redirect to `/login` | ⬜ |
| LAY-SB-07 | Sidebar fixed position | Scroll main content area | Sidebar remains fixed on left side (`fixed left-0 top-0 h-screen`) | ⬜ |
| LAY-SB-08 | Sidebar width | Measure sidebar | Width is `w-64` (256px); main content has `ml-64` margin | ⬜ |
| LAY-SB-09 | Nav item hover effect | Hover over inactive nav item | Background changes to `bg-gray-800`, text to white | ⬜ |
| LAY-SB-10 | Nav icons rendered | View each nav item | Each item shows correct Lucide icon: LayoutDashboard, Users, Car, Package, Truck, DollarSign, AlertCircle, Gift, Star, BarChart3, Wallet, Headphones | ⬜ |
| LAY-SB-11 | Sidebar scrollable when overflow | Resize browser to small height | Nav section has `overflow-y-auto`; scrolls if items overflow | ⬜ |

---

## 5. Layout — General UI

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| LAY-UI-01 | Main content area background | Login → View dashboard | Main content has `bg-gray-100` background with `p-8` padding | ⬜ |
| LAY-UI-02 | Toast container position | Trigger any toast notification | Toast appears in top-right corner; auto-closes after 3000ms | ⬜ |
| LAY-UI-03 | Suspense fallback | Navigate to a lazy-loaded page (first load) | "Loading..." centered on screen while chunk downloads | ⬜ |
| LAY-UI-04 | AdminLayout renders Outlet | Navigate between pages | Content area updates via React Router `<Outlet />` without sidebar re-render | ⬜ |

---

## 6. Dashboard — Stats Overview

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| DASH-S-01 | Stats cards load on mount | Navigate to Dashboard | 3 stat cards shown: Total Revenue, Active Drivers, Active Rides | ⬜ |
| DASH-S-02 | Revenue displays formatted currency | Revenue = 150000 | Card shows formatted value (e.g., "₦150,000" or "$150,000") via `formatCurrency()` | ⬜ |
| DASH-S-03 | Active Drivers count | Backend returns 5 active drivers | "Active Drivers" card shows "5" | ⬜ |
| DASH-S-04 | Active Rides count | Backend returns 3 active rides | "Active Rides" card shows "3"; subtitle "Currently ongoing" | ⬜ |
| DASH-S-05 | Stats auto-refresh every 30s | Wait 30 seconds on dashboard | `refreshStats()` called again via `setInterval(30_000)` | ⬜ |
| DASH-S-06 | Stats API failure | All 3 API calls fail | Console error "Failed to load dashboard stats"; stats remain at defaults (0) | ⬜ |
| DASH-S-07 | Non-array response safety | API returns null/undefined for rides/users | `getArrayLength()` returns 0 safely; no crash | ⬜ |
| DASH-S-08 | Non-number revenue safety | Earnings API returns non-number `rideRevenue` | Falls back to 0 (ternary check `typeof === 'number'`) | ⬜ |
| DASH-S-09 | Dashboard heading | View dashboard page | "Dashboard" h1 in `text-3xl font-bold text-gray-800` | ⬜ |
| DASH-S-10 | Stats grid responsive | View on mobile vs desktop | Cards stack vertically on mobile (`grid-cols-1`), 3-column on desktop (`md:grid-cols-3`) | ⬜ |

---

## 7. Dashboard — Live Map

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| DASH-MAP-01 | Map loads with Google Maps | Navigate to Dashboard | Google Map renders with rounded corners in white card container | ⬜ |
| DASH-MAP-02 | Map section heading | View map section | "Live Fleet Tracking" heading above map | ⬜ |
| DASH-MAP-03 | Missing API key fallback | Remove `VITE_GOOGLE_MAPS_API_KEY` | Yellow warning box: "Google Maps key is missing. Set VITE_GOOGLE_MAPS_API_KEY..." | ⬜ |
| DASH-MAP-04 | Map loading skeleton | Map JS not yet loaded | Gray pulsing placeholder: "Loading Map..." | ⬜ |
| DASH-MAP-05 | Driver markers displayed | Active rides have driver locations | Circle markers on map for each driver with valid lat/lng | ⬜ |
| DASH-MAP-06 | Busy driver marker color | Driver with `in_progress` ride | Marker `fillColor` = busy color (orange/red from theme) | ⬜ |
| DASH-MAP-07 | Online driver marker color | Driver with `accepted`/`arrived` ride | Marker `fillColor` = online color (green from theme) | ⬜ |
| DASH-MAP-08 | Map polls every 15s | Wait 15 seconds | `fetchActiveDriverLocations()` re-called via `MAP_POLL_INTERVAL_MS` | ⬜ |
| DASH-MAP-09 | Socket live location update | Driver emits `driver:location` | Driver marker position updates in real-time without waiting for poll | ⬜ |
| DASH-MAP-10 | New driver appears on socket | New driver goes online mid-session | New marker added to map via socket `driver:location` handler | ⬜ |
| DASH-MAP-11 | Map centers on first driver | Drivers exist on map | Camera centers on first driver's position; fallback to `DEFAULT_MAP_CENTER` if no drivers | ⬜ |
| DASH-MAP-12 | Invalid lat/lng filtered | Ride has null/NaN driver location | Driver excluded from markers (`.filter(Boolean)` after null-check) | ⬜ |
| DASH-MAP-13 | Map height | Measure map container | Height is `400px` (`MAP_CONTAINER_HEIGHT`) | ⬜ |
| DASH-MAP-14 | Map suppresses global error toast | Map API call fails | No global error toast (`X-Suppress-Global-Error: true` header set) | ⬜ |

---

## 8. Dashboard — Real-Time Updates

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| DASH-RT-01 | New ride created → stats refresh | Rider creates a new ride | Socket `ride:created` → `refreshStats()` called; Active Rides increments | ⬜ |
| DASH-RT-02 | Ride completed → stats refresh | Driver completes a ride | Socket `ride:updated` with `status: 'completed'` → stats refresh | ⬜ |
| DASH-RT-03 | Ride cancelled → stats refresh | Ride is cancelled | Socket `ride:updated` with `status: 'cancelled'` → stats refresh | ⬜ |
| DASH-RT-04 | Ride accepted → stats refresh | Driver accepts ride | Socket `ride:updated` with `status: 'accepted'` → stats refresh | ⬜ |
| DASH-RT-05 | Ride status with invalid status — no refresh | Socket emits `ride:updated` with `status: 'some_random'` | Stats NOT refreshed (not in allowed status list) | ⬜ |
| DASH-RT-06 | Null ride data from socket | Socket emits `ride:updated` with `null` | Guard `if (!ride?.status) return;` prevents crash | ⬜ |
| DASH-RT-07 | Socket listeners cleaned up | Navigate away from Dashboard | `socket.off('ride:created')` and `socket.off('ride:updated')` called in cleanup | ⬜ |

---

## 9. Users — List & Search

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| USR-LS-01 | Users table loads | Navigate to Users page | Table with columns: User, Role, Status, Joined, Actions | ⬜ |
| USR-LS-02 | User row displays name + email + phone | View user row | Name in bold, email in small gray, phone in small gray stacked | ⬜ |
| USR-LS-03 | Search by name/email | Type "John" in search field | List filters after 500ms debounce; API called with `?search=John` | ⬜ |
| USR-LS-04 | Search debounce | Type rapidly "J-o-h-n" | Only one API call fires after 500ms of no typing | ⬜ |
| USR-LS-05 | Search icon in input | View search field | Magnifying glass (Search) icon positioned inside left of input | ⬜ |
| USR-LS-06 | Filter by role — All | Select "All Roles" in dropdown | All users shown regardless of role | ⬜ |
| USR-LS-07 | Filter by role — Rider | Select "Rider" | API called with `?role=rider`; only riders shown | ⬜ |
| USR-LS-08 | Filter by role — Driver | Select "Driver" | API called with `?role=driver`; only drivers shown | ⬜ |
| USR-LS-09 | Filter by role — Admin | Select "Admin" | API called with `?role=admin`; only admins shown | ⬜ |
| USR-LS-10 | Filter by onboarding status | Select "Pending Review" | Client-side filter: only drivers with `driverOnboarding.status === 'pending_review'` shown | ⬜ |
| USR-LS-11 | Onboarding status options | Click onboarding dropdown | Options: All Onboarding, Pending Documents, Pending Review, Needs Resubmission, Approved, Rejected | ⬜ |
| USR-LS-12 | Combined role + onboarding filter | Select "Driver" + "Pending Review" | Only drivers with pending_review onboarding status shown | ⬜ |
| USR-LS-13 | Empty state | No users match filters | "No users found" centered in table body | ⬜ |
| USR-LS-14 | Loading state | While fetching users | "Loading users..." centered in table area | ⬜ |
| USR-LS-15 | Active user badge | User with `isActive: true` | Green "Active" badge in Status column | ⬜ |
| USR-LS-16 | Suspended user badge | User with `isActive: false` | Red "Suspended" badge | ⬜ |
| USR-LS-17 | Driver onboarding badge | Driver with `driverOnboarding.status: 'pending_review'` | Yellow "pending review" badge (replaces Active/Suspended) | ⬜ |
| USR-LS-18 | Date formatting — ISO string | User joined `2025-06-15T10:30:00Z` | Displays "6/15/2025" (locale date) | ⬜ |
| USR-LS-19 | Date formatting — Firestore timestamp | User joined `{ _seconds: 1718451000 }` | Correctly converted to date string | ⬜ |
| USR-LS-20 | Date formatting — null | User has no `createdAt` | Displays "N/A" | ⬜ |
| USR-LS-21 | Abort previous request | Type "Jo" then quickly "John" | Previous request aborted via `AbortController`; no stale data | ⬜ |
| USR-LS-22 | Cancelled request no error toast | Previous request aborted | No "Failed to load users" toast for `CanceledError` | ⬜ |
| USR-LS-23 | Page heading | View Users page | "User Management" h1 | ⬜ |

---

## 10. Users — Status Management

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| USR-SM-01 | Suspend active user | Click "Suspend" on active user → Confirm | Confirmation dialog "Are you sure you want to suspend this user?"; PATCH `/admin/users/{id}/status` with `isActive: false`; toast success; row updates | ⬜ |
| USR-SM-02 | Activate suspended user | Click "Activate" on suspended user → Confirm | PATCH with `isActive: true`; toast "User activated successfully"; badge changes to green "Active" | ⬜ |
| USR-SM-03 | Cancel suspend action | Click "Suspend" → Click "Cancel" on browser confirm | No API call; user status unchanged | ⬜ |
| USR-SM-04 | Suspend button styling | View active user row | Button variant is "danger" (red) with text "Suspend" | ⬜ |
| USR-SM-05 | Activate button styling | View suspended user row | Button variant is "primary" (blue) with text "Activate" | ⬜ |
| USR-SM-06 | Button disabled while toggling | Click Suspend → during API call | Button shows "..." and is disabled; prevents double-click | ⬜ |
| USR-SM-07 | Optimistic UI update | Suspend succeeds | User list updated inline (`isActive` toggled) without full refetch | ⬜ |
| USR-SM-08 | Toggle failure | API returns error | Toast "Failed to update user status"; user status unchanged | ⬜ |

---

## 11. Users — Document Review

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| USR-DOC-01 | Review button shown for drivers only | View Users table | FileText icon button visible only for rows where `role === 'driver'` | ⬜ |
| USR-DOC-02 | Open review modal | Click review button on driver with documents | Modal opens: "Review Documents: {driverName}" with document cards | ⬜ |
| USR-DOC-03 | No documents toast | Click review button on driver with no documents | Toast info: "No documents uploaded by this driver yet"; no modal | ⬜ |
| USR-DOC-04 | Document image preview | Document is image type (jpg/png) | Image rendered in preview area; clickable to open in new tab | ⬜ |
| USR-DOC-05 | Document PDF preview | Document is PDF type | PDF rendered in iframe within preview area | ⬜ |
| USR-DOC-06 | Document unknown type | Document type cannot be detected | "Open document in new tab" link shown | ⬜ |
| USR-DOC-07 | No document URL | Document has no URL | "No Preview Available" text shown | ⬜ |
| USR-DOC-08 | Image load failure | Image URL returns 404 | Falls back to "Open document in new tab" link (tracked via `failedImages`) | ⬜ |
| USR-DOC-09 | Document status badge — pending | Document `status: 'pending'` | Yellow "PENDING" badge | ⬜ |
| USR-DOC-10 | Document status badge — approved | Document `status: 'approved'` | Green "APPROVED" badge | ⬜ |
| USR-DOC-11 | Document status badge — rejected | Document `status: 'rejected'` | Red "REJECTED" badge | ⬜ |
| USR-DOC-12 | Approve document | Click "Approve" button on pending document | PATCH `/admin/users/{id}/documents` with `{ documentName, status: 'approved' }`; toast success; badge updates to green | ⬜ |
| USR-DOC-13 | Reject document | Click "Reject" button on pending document | PATCH with `status: 'rejected'`; toast success; badge updates to red | ⬜ |
| USR-DOC-14 | Approve button disabled on rejected doc | Document already rejected | "Reject" button is disabled (`disabled={doc.status === 'rejected'}`) | ⬜ |
| USR-DOC-15 | Approve button disabled on approved doc | Document already approved | "Approve" button is disabled (`disabled={doc.status === 'approved'}`) | ⬜ |
| USR-DOC-16 | Document update syncs to main list | Approve a document in modal | Main users list also updated with new document status (no refetch needed) | ⬜ |
| USR-DOC-17 | Close modal | Click X button on modal | Modal closes; `isModalOpen` set to false | ⬜ |
| USR-DOC-18 | Document action failure | API error during approve/reject | Toast "Failed to update document status"; document unchanged | ⬜ |
| USR-DOC-19 | Modal overlay | Click outside modal content area | Overlay visible (`bg-black bg-opacity-50`); z-index 50 | ⬜ |
| USR-DOC-20 | MIME type detection — image via mimeType | Document `mimeType: 'image/jpeg'` | Detected as image; rendered with `<img>` tag | ⬜ |
| USR-DOC-21 | MIME type detection — PDF via fileName | Document `fileName: 'license.pdf'` | Detected as PDF; rendered in iframe | ⬜ |
| USR-DOC-22 | MIME type detection — image via URL | Document URL ends with `.jpg?token=...` | Detected as image via regex on URL | ⬜ |

---

## 12. Rides — Active Rides Tab

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| RDE-ACT-01 | Active tab selected by default | Navigate to Rides page | "Active Rides" tab has white background + shadow; API calls `/admin/rides/active` | ⬜ |
| RDE-ACT-02 | Active rides table columns | View active rides | Columns: (expand), ID, Rider, Driver, Vehicle, Status, Pickup, Dropoff, Date, Actions | ⬜ |
| RDE-ACT-03 | Ride ID truncated | Ride ID is 24+ chars | Shows first 8 chars + "..." (via `SHORT_ID_LENGTH`) | ⬜ |
| RDE-ACT-04 | Rider info displayed | Ride has riderInfo | Rider name in bold; rider ID truncated below | ⬜ |
| RDE-ACT-05 | Driver info displayed | Ride has driverInfo | Driver name in bold; driver ID truncated below | ⬜ |
| RDE-ACT-06 | No driver assigned | Ride has no driverId | "No driver" in gray | ⬜ |
| RDE-ACT-07 | Vehicle info displayed | Ride has vehicleInfo | Plate number bold; make + model below | ⬜ |
| RDE-ACT-08 | No vehicle info | vehicleInfo is null | "N/A" in gray | ⬜ |
| RDE-ACT-09 | Status badge colors | Various ride statuses | Correct badge color per `RIDE_STATUS_BADGE` config | ⬜ |
| RDE-ACT-10 | Status with underscores formatted | Status `in_progress` | Displayed as "in progress" (underscores replaced with spaces) | ⬜ |
| RDE-ACT-11 | Pickup address truncated | Long address | Text truncated with CSS `truncate`; full address in `title` tooltip | ⬜ |
| RDE-ACT-12 | Fare resolution — finalFare | `pricing.finalFare = 5000` | Shows "5000 NGN" (finalFare takes priority) | ⬜ |
| RDE-ACT-13 | Fare resolution — estimatedFare | No finalFare, `pricing.estimatedFare = 3000` | Shows "3000" as fallback | ⬜ |
| RDE-ACT-14 | Fare resolution — legacy fare | No pricing object, `fare = 2500` | Shows "2500" | ⬜ |
| RDE-ACT-15 | Fare resolution — no fare | No fare data at all | Shows "N/A" | ⬜ |
| RDE-ACT-16 | Loading state | While fetching rides | "Loading rides..." centered in table | ⬜ |
| RDE-ACT-17 | Empty state | No active rides | "No rides found" centered in table body | ⬜ |

---

## 13. Rides — All History Tab

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| RDE-ALL-01 | Switch to All History | Click "All History" tab | Tab highlighted; API calls `/admin/rides`; response parsed from `data.rides` | ⬜ |
| RDE-ALL-02 | All rides listed | View all history | Completed, cancelled, and all other rides shown | ⬜ |
| RDE-ALL-03 | Switch back to Active | Click "Active Rides" tab | API calls active endpoint; list refreshed | ⬜ |
| RDE-ALL-04 | Tab styling — active | Selected tab | White background, blue text, shadow | ⬜ |
| RDE-ALL-05 | Tab styling — inactive | Unselected tab | Gray text, no background; hover changes text color | ⬜ |
| RDE-ALL-06 | Date formatting — Firestore | `createdAt: { _seconds: 1718451000 }` | Correctly formatted to locale string | ⬜ |
| RDE-ALL-07 | Date formatting — ISO string | `createdAt: "2025-06-15T10:30:00Z"` | Correctly formatted | ⬜ |
| RDE-ALL-08 | Date formatting — invalid | `createdAt: "not-a-date"` | Shows "N/A" | ⬜ |

---

## 14. Rides — Detail & Expand

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| RDE-DET-01 | Expand ride row | Click chevron button on ride row | Expanded detail section appears below row with `bg-gray-50` | ⬜ |
| RDE-DET-02 | Collapse ride row | Click chevron again on expanded row | Detail section collapses; ChevronUp → ChevronDown | ⬜ |
| RDE-DET-03 | Eye button toggles details | Click Eye icon in Actions column | Same toggle behavior as chevron | ⬜ |
| RDE-DET-04 | Ride details section | Expand a ride | Shows: Ride ID (mono), Status badge, Pickup (address + lat/lng), Dropoff (address + lat/lng), Fare, Created At | ⬜ |
| RDE-DET-05 | Rider information section | Expand ride with riderInfo | Shows: Name, Phone, Email, Rider ID (mono, full) | ⬜ |
| RDE-DET-06 | Driver information section | Expand ride with driverInfo | Shows: Name, Phone, Email, Driver ID (mono, full) | ⬜ |
| RDE-DET-07 | Vehicle information section | Expand ride with vehicleInfo | Shows: Plate Number, Make & Model, Year, Color, Category | ⬜ |
| RDE-DET-08 | No rider info | Expand ride without riderInfo | Rider section not rendered | ⬜ |
| RDE-DET-09 | No driver info | Expand ride without driverInfo | Driver section not rendered | ⬜ |
| RDE-DET-10 | Lat/Lng display | Pickup has lat/lng values | Shown as `lat.toFixed(6), lng.toFixed(6)` in gray text | ⬜ |
| RDE-DET-11 | Lat/Lng not shown for missing coords | Pickup has no lat/lng | Coordinate line not rendered | ⬜ |
| RDE-DET-12 | Multiple rows expanded | Expand 2 different rides | Both expanded simultaneously (Set-based tracking) | ⬜ |

---

## 15. Rides — Admin Cancel

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| RDE-CAN-01 | Cancel button visible for active statuses | Ride with `accepted` status | Red cancel button (XCircle icon) visible in Actions | ⬜ |
| RDE-CAN-02 | Cancel button visible — arrived | Ride `arrived` status | Cancel button visible | ⬜ |
| RDE-CAN-03 | Cancel button visible — in_progress | Ride `in_progress` status | Cancel button visible | ⬜ |
| RDE-CAN-04 | Cancel button visible — finding_driver | Ride `finding_driver` status | Cancel button visible | ⬜ |
| RDE-CAN-05 | Cancel button hidden — completed | Ride `completed` status | No cancel button shown | ⬜ |
| RDE-CAN-06 | Cancel button hidden — cancelled | Ride `cancelled` status | No cancel button shown | ⬜ |
| RDE-CAN-07 | Cancel ride — confirm | Click cancel → Confirm browser dialog | POST `/admin/rides/{id}/cancel` with `{ reason: "Admin cancelled" }`; toast success; rides refetched | ⬜ |
| RDE-CAN-08 | Cancel ride — decline confirm | Click cancel → Click "Cancel" on confirm dialog | No API call; ride unchanged | ⬜ |
| RDE-CAN-09 | Cancel failure | API returns error | Toast "Failed to cancel ride" | ⬜ |

---

## 16. Rides — Real-Time Socket

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| RDE-RT-01 | New ride appears (active tab) | New ride created while on Active tab | Socket `ride:created` → new ride prepended to list (if not already present) | ⬜ |
| RDE-RT-02 | Ride status updated (active tab) | Existing ride goes from `accepted` → `in_progress` | Socket `ride:updated` → ride row updated in-place | ⬜ |
| RDE-RT-03 | Completed ride removed (active tab) | Ride completed while on Active tab | Socket `ride:updated` with `status: 'completed'` → ride removed from active list | ⬜ |
| RDE-RT-04 | Cancelled ride removed (active tab) | Ride cancelled while on Active tab | Ride removed from active list | ⬜ |
| RDE-RT-05 | Ride updated (all history tab) | Ride updated while on All History tab | Ride row updated in-place (never removed from All view) | ⬜ |
| RDE-RT-06 | Duplicate ride prevention | Same `ride:created` received twice | `prev.some(r => r.id === newRide.id)` prevents duplicate entry | ⬜ |
| RDE-RT-07 | Null ride data guard | Socket emits invalid data | `if (!updatedRide?.id) return;` prevents crash | ⬜ |
| RDE-RT-08 | Socket cleanup on tab switch | Switch from Active to All History | Previous socket listeners cleaned up; new ones attached | ⬜ |

---

## 17. Deliveries — List & Filter

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| DEL-LS-01 | Deliveries page loads | Navigate to Deliveries | "Delivery Tracking" heading; delivery count in header (Package icon + count) | ⬜ |
| DEL-LS-02 | Deliveries filtered from rides | API returns all rides | Only rides with `type === 'delivery'` or `rideType === 'delivery'` shown | ⬜ |
| DEL-LS-03 | Table columns | View deliveries table | Columns: ID, Sender, Driver, Pickup, Dropoff, Package, Fare, Status, Date | ⬜ |
| DEL-LS-04 | Summary status cards | View summary grid | 5 cards for delivery statuses from `DELIVERY_STATUSES` config with counts | ⬜ |
| DEL-LS-05 | Status badge — completed/delivered | Status `completed` | Green "success" badge | ⬜ |
| DEL-LS-06 | Status badge — cancelled | Status `cancelled` | Red "danger" badge | ⬜ |
| DEL-LS-07 | Status badge — in_transit/in_progress | Status `in_progress` | Blue "info" badge | ⬜ |
| DEL-LS-08 | Status badge — picked_up | Status `picked_up` | Yellow "warning" badge | ⬜ |
| DEL-LS-09 | Package description | Delivery has packageDetails | Package description displayed in table | ⬜ |
| DEL-LS-10 | No package details | No packageDetails | "N/A" shown | ⬜ |
| DEL-LS-11 | Fare display | `pricing.finalFare = 3000, currency = 'NGN'` | Shows "3000 NGN" | ⬜ |
| DEL-LS-12 | Unassigned driver | No driverId on delivery | "Unassigned" text shown | ⬜ |
| DEL-LS-13 | Loading state | While fetching | "Loading..." centered | ⬜ |
| DEL-LS-14 | Empty state | No deliveries found | "No deliveries found" in table body | ⬜ |
| DEL-LS-15 | Sender name fallback | No riderInfo, has riderId | Shows first 8 chars of riderId | ⬜ |

---

## 18. Deliveries — Real-Time Updates

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| DEL-RT-01 | Delivery status update via socket | Driver updates delivery status | Socket `ride:updated` → delivery row updated if `type === 'delivery'` | ⬜ |
| DEL-RT-02 | New delivery appears | New delivery-type ride created | If `ride:updated` with delivery type and not in list → prepended | ⬜ |
| DEL-RT-03 | Non-delivery ride ignored | Socket emits `ride:updated` for normal ride | Delivery list unchanged (filtered by type check) | ⬜ |
| DEL-RT-04 | Socket cleanup on unmount | Navigate away from Deliveries | `socket.off('ride:updated')` called | ⬜ |

---

## 19. Vehicles — List & Search

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| VEH-LS-01 | Vehicles page loads | Navigate to Vehicles | "Vehicle Management" heading; vehicles loaded from driver data | ⬜ |
| VEH-LS-02 | Vehicles extracted from drivers | API returns driver list | Each driver's `vehicle` object mapped to vehicle row | ⬜ |
| VEH-LS-03 | Table columns | View vehicles table | Plate Number, Make & Model, Year, Color, Category, Owner, Region, Status | ⬜ |
| VEH-LS-04 | Search by plate | Type plate number in search | Client-side filter matches `plateNumber.toLowerCase()` | ⬜ |
| VEH-LS-05 | Search by owner name | Type owner name | Matches `ownerName.toLowerCase()` | ⬜ |
| VEH-LS-06 | Search by make/model | Type "Toyota" | Matches `make.toLowerCase()` or `model.toLowerCase()` | ⬜ |
| VEH-LS-07 | Search debounce | Type rapidly | Fetches only after `DEBOUNCE_MS` (500ms) of inactivity | ⬜ |
| VEH-LS-08 | Filter by category | Select "SUV" from dropdown | Only vehicles with `category === 'suv'` shown | ⬜ |
| VEH-LS-09 | Category options from config | Open category dropdown | Options populated from `VEHICLE_CATEGORIES` config array | ⬜ |
| VEH-LS-10 | Combined search + category filter | Search "ABC" + select "Sedan" | Both filters applied simultaneously | ⬜ |
| VEH-LS-11 | Category badge | View category column | Blue "info" badge with category text (underscores replaced with spaces) | ⬜ |
| VEH-LS-12 | Active vehicle status | Driver `isActive: true` | Green "active" badge | ⬜ |
| VEH-LS-13 | Inactive vehicle status | Driver `isActive: false` | Red "inactive" badge (danger variant) | ⬜ |
| VEH-LS-14 | Drivers without vehicles skipped | Driver has no `vehicle` object | No row created for that driver | ⬜ |
| VEH-LS-15 | Empty state | No vehicles found | "No vehicles found" centered in table | ⬜ |
| VEH-LS-16 | Loading state | While fetching | "Loading..." centered | ⬜ |
| VEH-LS-17 | Plate number mono font | View plate number column | `font-mono font-medium` class applied | ⬜ |

---

## 20. Vehicles — Summary Cards

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| VEH-SUM-01 | Total vehicles card | View summary cards | Shows total vehicle count with Truck icon in blue | ⬜ |
| VEH-SUM-02 | Active count | View cards | Green count of vehicles with `status === 'active'` | ⬜ |
| VEH-SUM-03 | Inactive count | View cards | Gray count of vehicles with `status === 'inactive'` | ⬜ |
| VEH-SUM-04 | Pending count | View cards | Yellow count of vehicles with `status === 'pending'` | ⬜ |
| VEH-SUM-05 | Cards responsive | View on mobile vs desktop | 2-column on mobile, 4-column on desktop | ⬜ |

---

## 21. Pricing — Nigeria Rides

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| PRC-NG-01 | Nigeria tab selected by default | Navigate to Pricing page | "Nigeria (Rides)" tab highlighted; Nigeria pricing form loaded | ⬜ |
| PRC-NG-02 | Pricing data fetched on load | Tab opens | GET `/admin/pricing/nigeria` called; form fields populated with response data | ⬜ |
| PRC-NG-03 | City selector — Lagos | Click "Lagos" button | City set to `lagos`; pricing fields update for Lagos configuration | ⬜ |
| PRC-NG-04 | City selector — Abuja | Click "Abuja" button | City set to `abuja`; fields update accordingly | ⬜ |
| PRC-NG-05 | Active city button styling | Lagos selected | Lagos button is "primary" (blue); Abuja is "outline" | ⬜ |
| PRC-NG-06 | Platform commission field | View platform section | Input labeled "Platform Commission (0.0 - 1.0)"; helper text "Example: 0.25 for 25%" | ⬜ |
| PRC-NG-07 | Base pricing fields | View base pricing section | 3 fields: Base Fare (₦), Cost Per Minute (₦), Wait Time Fee (₦/min) | ⬜ |
| PRC-NG-08 | Vehicle categories section | View categories | Fields per category from `NIGERIA_VEHICLE_CATEGORIES`: Per KM and Min Fare for each | ⬜ |
| PRC-NG-09 | Cancellation fees section | View cancellation | Cancel fee + No-Show fee inputs per vehicle category | ⬜ |
| PRC-NG-10 | Surge multipliers section | View surge section | Peak, High Demand, Extreme inputs; "Force Surge" checkbox | ⬜ |
| PRC-NG-11 | Force surge checkbox | Toggle "Force Surge" | Checkbox toggles `surge.{city}.forceActive` | ⬜ |
| PRC-NG-12 | Save pricing | Fill form → Click "Save Nigeria Pricing" | PUT `/admin/pricing/nigeria` with form data; toast "Nigeria pricing updated" | ⬜ |
| PRC-NG-13 | Save failure | API returns error | Toast "Failed to update pricing" | ⬜ |
| PRC-NG-14 | Currency symbol | View field labels | All monetary fields prefixed with "₦" (NGN symbol from region config) | ⬜ |
| PRC-NG-15 | Fields keyed by city | Switch from Lagos to Abuja | Form fields have unique React keys including city code (prevents stale values) | ⬜ |

---

## 22. Pricing — Chicago Premium

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| PRC-CHI-01 | Switch to Chicago tab | Click "Chicago (Premium)" tab | Tab highlighted; Chicago pricing form loaded | ⬜ |
| PRC-CHI-02 | Data fetched | Tab opens | GET `/admin/pricing/chicago` called; fields populated | ⬜ |
| PRC-CHI-03 | Platform commission | View form | Commission input with 0.01 step | ⬜ |
| PRC-CHI-04 | Standard rates section | View rates | Per category: Base ($), Per Mile ($), Per Min ($) from `CHICAGO_VEHICLE_CATEGORIES` | ⬜ |
| PRC-CHI-05 | Airport fixed rates | View airport section | Two airport subsections from `CHICAGO_AIRPORTS`; per-category fixed rate inputs | ⬜ |
| PRC-CHI-06 | Hourly chauffeur rates | View hourly section | Per-category hourly rate inputs ($/hr) | ⬜ |
| PRC-CHI-07 | Save pricing | Submit form | PUT `/admin/pricing/chicago`; toast "Chicago pricing updated" | ⬜ |
| PRC-CHI-08 | Save failure | API error | Toast "Failed to update pricing" | ⬜ |
| PRC-CHI-09 | Currency symbol | View labels | All fields prefixed with "$" (USD symbol) | ⬜ |

---

## 23. Pricing — Delivery

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| PRC-DEL-01 | Switch to Delivery tab | Click "Delivery (NG)" tab | Delivery pricing form loaded | ⬜ |
| PRC-DEL-02 | Data fetched | Tab opens | GET `/admin/pricing/nigeria_delivery`; fields populated | ⬜ |
| PRC-DEL-03 | Vehicle categories | View rates section | Per delivery vehicle category: Base (₦), Per KM (₦), Per Min (₦) | ⬜ |
| PRC-DEL-04 | Service multipliers | View multipliers section | Instant (x), Scheduled (x), Fragile Item (+₦) inputs | ⬜ |
| PRC-DEL-05 | Extra fees | View fees section | Extra Stop (Bike), Extra Stop (Car), Return Trip (%) inputs | ⬜ |
| PRC-DEL-06 | Save pricing | Submit form | PUT `/admin/pricing/nigeria_delivery`; toast "Delivery pricing updated" | ⬜ |
| PRC-DEL-07 | Save failure | API error | Toast "Failed to update pricing" | ⬜ |
| PRC-DEL-08 | Platform commission | View form | Commission input present with helper text | ⬜ |

---

## 24. Pricing — History

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| PRC-HIST-01 | Switch to History tab | Click "History" tab | Pricing history table loaded from `/admin/history/pricing` | ⬜ |
| PRC-HIST-02 | History table columns | View table | Columns: Date, Admin, Type, Region, Actions | ⬜ |
| PRC-HIST-03 | History item date format | View date column | Formatted as "MMM d, yyyy HH:mm" (e.g., "Jun 15, 2025 14:30") | ⬜ |
| PRC-HIST-04 | Type badge — pricing | `type: 'pricing'` | Blue badge "PRICING" | ⬜ |
| PRC-HIST-05 | Type badge — surge | `type: 'surge'` | Purple badge "SURGE" | ⬜ |
| PRC-HIST-06 | Region displayed | View region column | Uppercase region code (e.g., "NIGERIA", "CHICAGO") | ⬜ |
| PRC-HIST-07 | Admin name | View admin column | Displays `adminName` of who made the change | ⬜ |
| PRC-HIST-08 | View & Edit historical config | Click "View & Edit" | Detail view opens with back button; historical data loaded into appropriate pricing form | ⬜ |
| PRC-HIST-09 | Nigeria historical config | View historical Nigeria config | `PricingNigeria` component rendered with `initialData` prop | ⬜ |
| PRC-HIST-10 | Chicago historical config | View historical Chicago config | `PricingChicago` component rendered with `initialData` prop | ⬜ |
| PRC-HIST-11 | Delivery historical config | View historical delivery config | `PricingDelivery` component rendered with `initialData` prop | ⬜ |
| PRC-HIST-12 | Unknown region fallback | Historical config with unknown region | Raw JSON displayed in `<pre>` block | ⬜ |
| PRC-HIST-13 | Restore warning banner | View historical config | Blue info banner: "You are viewing a historical configuration. Clicking 'Save' below will apply these settings..." | ⬜ |
| PRC-HIST-14 | Back button | Click "Back to History" | Returns to history list; `selectedItem` set to null | ⬜ |
| PRC-HIST-15 | Empty history | No history records | "No history available." centered text | ⬜ |
| PRC-HIST-16 | Loading state | While fetching history | "Loading history..." centered | ⬜ |
| PRC-HIST-17 | Firestore timestamp handling | `updatedAt: { _seconds: 1718451000 }` | Correctly converted to Date for formatting | ⬜ |
| PRC-HIST-18 | ISO string timestamp | `updatedAt: "2025-06-15T10:30:00Z"` | Correctly parsed and formatted | ⬜ |

---

## 25. Disputes — List & View

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| DSP-LS-01 | Disputes page loads | Navigate to Disputes | "Dispute Resolution" heading; disputes fetched from `/admin/disputes` | ⬜ |
| DSP-LS-02 | Table columns | View disputes table | Columns: (expand), ID, Ride ID, Reason, Status, Date, Actions | ⬜ |
| DSP-LS-03 | Dispute ID truncated | View ID column | Shows first 12 chars + "..." | ⬜ |
| DSP-LS-04 | Status badge — open | `status: 'open'` | Yellow "warning" badge | ⬜ |
| DSP-LS-05 | Status badge — resolved | `status: 'resolved'` | Green "success" badge | ⬜ |
| DSP-LS-06 | Status badge — rejected | `status: 'rejected'` | Red "danger" badge | ⬜ |
| DSP-LS-07 | Expand dispute row | Click chevron or Eye button | Detail section with dispute info, reporter info, ride info | ⬜ |
| DSP-LS-08 | Dispute detail fields | Expand a dispute | Shows: Dispute ID, Status badge, Reason, Details, Created At | ⬜ |
| DSP-LS-09 | Resolved dispute details | Expand resolved dispute | Additional fields: Resolved At, Resolution Notes | ⬜ |
| DSP-LS-10 | Reporter information | Expand dispute with reporterInfo | Shows reporter: Name, Phone, Email, Role | ⬜ |
| DSP-LS-11 | Ride information | Expand dispute with rideInfo | Shows associated ride details: status, pickup, dropoff, fare, rider/driver info, vehicle | ⬜ |
| DSP-LS-12 | Empty state | No disputes | "No disputes found" centered | ⬜ |
| DSP-LS-13 | Loading state | While fetching | "Loading disputes..." centered | ⬜ |
| DSP-LS-14 | API failure | Disputes fetch fails | Toast "Failed to load disputes"; empty array set | ⬜ |
| DSP-LS-15 | Date format — locale string | View date column | Formatted with `DEFAULT_LOCALE` ('en-GB') | ⬜ |

---

## 26. Disputes — Resolution

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| DSP-RES-01 | Resolve button only for open disputes | View disputes table | "Resolve" button visible only when `status === 'open'` | ⬜ |
| DSP-RES-02 | Open resolve modal | Click "Resolve" on open dispute | Modal opens with form: Resolution Type, Notes, Refund fields | ⬜ |
| DSP-RES-03 | Resolution type — dismissed | Select "dismissed" | No refund fields shown (default selection) | ⬜ |
| DSP-RES-04 | Resolution type — refund | Select "refund" | Refund User ID and Refund Amount fields appear; pre-filled from ride data | ⬜ |
| DSP-RES-05 | Pre-filled refund user ID | Open resolve for dispute with rideInfo | Refund User ID pre-filled with `rideInfo.riderInfo.id` | ⬜ |
| DSP-RES-06 | Pre-filled refund amount | Open resolve for dispute with pricing | Refund Amount pre-filled with `rideInfo.pricing.finalFare` | ⬜ |
| DSP-RES-07 | Submit without notes | Leave notes empty → Submit | Toast error: "Resolution notes are required" | ⬜ |
| DSP-RES-08 | Submit refund without user ID | Type = refund, empty user ID → Submit | Toast error: "Refund user ID is required" | ⬜ |
| DSP-RES-09 | Submit refund with invalid amount | Type = refund, amount = 0 or negative → Submit | Toast error: "A positive refund amount is required" | ⬜ |
| DSP-RES-10 | Submit refund with NaN amount | Type = refund, amount = "abc" → Submit | Toast error: "A positive refund amount is required" (`isNaN` check) | ⬜ |
| DSP-RES-11 | Successful resolution — dismissed | Fill notes → Submit as dismissed | POST `/admin/disputes/{id}/resolve` with `{ resolutionNotes, resolutionType: 'dismissed', issueRefund: false }`; toast success; disputes refetched | ⬜ |
| DSP-RES-12 | Successful resolution — refund | Fill all refund fields → Submit | POST with `{ resolutionNotes, resolutionType: 'refund', issueRefund: true, refundUserId, refundAmount }`; toast success | ⬜ |
| DSP-RES-13 | Modal closes on success | Resolution succeeds | `resolveModal` set to null; modal disappears | ⬜ |
| DSP-RES-14 | Resolution failure | API returns error | Toast with `response.data.message` or fallback "Failed to resolve dispute" | ⬜ |
| DSP-RES-15 | Resolving state | During API call | `resolving` flag prevents double submit | ⬜ |

---

## 27. Promotions — List & View

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| PRO-LS-01 | Promotions page loads | Navigate to Promotions | "Promotions" heading with "Create Promotion" button | ⬜ |
| PRO-LS-02 | Table columns | View table | Columns: Code, Type, Value, Usage Limit, Status, Expiry, Actions | ⬜ |
| PRO-LS-03 | Promo code displayed | View code column | Code in `font-mono font-bold` | ⬜ |
| PRO-LS-04 | Percentage type value | `discountType: 'percentage', amount: 15` | Shows "15%" | ⬜ |
| PRO-LS-05 | Flat type value | `discountType: 'flat', amount: 500, region: 'NG'` | Shows "₦500" (currency symbol from region config) | ⬜ |
| PRO-LS-06 | Active status badge | `active: true` | Green "Active" badge | ⬜ |
| PRO-LS-07 | Inactive status badge | `active: false` | Default gray "Inactive" badge | ⬜ |
| PRO-LS-08 | Expiry date | `endsAt: "2025-12-31"` | Formatted locale date | ⬜ |
| PRO-LS-09 | No expiry | `endsAt` is null/undefined | "No Expiry" text | ⬜ |
| PRO-LS-10 | Usage limit | `maxRedemptions: 100` | Shows "100" | ⬜ |
| PRO-LS-11 | Empty state | No promotions | "No promotions found" centered | ⬜ |
| PRO-LS-12 | Loading state | While fetching | "Loading..." centered | ⬜ |

---

## 28. Promotions — Create

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| PRO-CR-01 | Open create modal | Click "Create Promotion" button | Modal with form appears (Plus icon in button) | ⬜ |
| PRO-CR-02 | Create form fields | View create form | Code, Description, Type (dropdown), Amount, Max Redemptions, Start Date, End Date, Region (dropdown) | ⬜ |
| PRO-CR-03 | Code required | Submit with empty code | Validation error: "Code is required" | ⬜ |
| PRO-CR-04 | Region dropdown options | View region dropdown | Options populated from `REGIONS` config array | ⬜ |
| PRO-CR-05 | Default region | Form loads | Region defaults to `DEFAULT_REGION_CODE` | ⬜ |
| PRO-CR-06 | Successful creation | Fill all fields → Submit | POST `/admin/promotions` with payload; toast "Promotion created successfully"; modal closes; list refreshed | ⬜ |
| PRO-CR-07 | Amount parsed as float | Enter "15.5" in amount | Payload has `amount: 15.5` (parseFloat) | ⬜ |
| PRO-CR-08 | Max redemptions parsed as int | Enter "100" | Payload has `maxRedemptions: 100` (parseInt) | ⬜ |
| PRO-CR-09 | Dates converted to ISO | Enter start/end dates | Payload has ISO strings (`new Date(...).toISOString()`) | ⬜ |
| PRO-CR-10 | Regions wrapped in array | Select single region | Payload has `regions: ['NG']` (array) | ⬜ |
| PRO-CR-11 | Creation failure | API returns error | Toast "Failed to create promotion" | ⬜ |
| PRO-CR-12 | Form reset after creation | Create succeeds → Open create again | Form fields are cleared via `reset()` | ⬜ |

---

## 29. Promotions — Edit

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| PRO-ED-01 | Open edit form | Click "Edit" on a promotion | Inline edit form expands below row; row gets `bg-blue-50` | ⬜ |
| PRO-ED-02 | Pre-filled values | Open edit form | All fields pre-populated with existing promotion data | ⬜ |
| PRO-ED-03 | Code field disabled | View edit form | Promo code input is disabled (cannot change code) | ⬜ |
| PRO-ED-04 | Close edit form | Click "Close" button | Edit row collapses; `expandedPromoId` set to null | ⬜ |
| PRO-ED-05 | Toggle between edit forms | Click "Edit" on different promo | Previous edit closes; new one opens (only one expanded at a time) | ⬜ |
| PRO-ED-06 | Save changes | Modify fields → Click "Save Changes" | PUT `/admin/promotions/{id}` with updated data; toast "Promotion updated successfully"; list refreshed | ⬜ |
| PRO-ED-07 | Status change via edit | Change status dropdown to "Inactive" → Save | `active: false` sent in payload | ⬜ |
| PRO-ED-08 | Edit failure | API returns error | Toast with error message from `response.data.message` or fallback | ⬜ |
| PRO-ED-09 | Cancel edit | Click "Cancel" button in edit form | Edit form closes; no API call | ⬜ |

---

## 30. Promotions — Activate/Suspend

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| PRO-ST-01 | Suspend active promotion | Click "Suspend" on active promo → Confirm | Confirmation dialog w/ promo code; PUT `/admin/promotions/{id}` with `{ active: false }`; toast "Promotion suspended" | ⬜ |
| PRO-ST-02 | Activate inactive promotion | Click "Activate" on inactive promo → Confirm | PUT with `{ active: true }`; toast "Promotion activated" | ⬜ |
| PRO-ST-03 | Cancel suspend | Click "Suspend" → Cancel dialog | No API call; status unchanged | ⬜ |
| PRO-ST-04 | Suspend button styling | Active promotion | Red "danger" button with "Suspend" text | ⬜ |
| PRO-ST-05 | Activate button styling | Inactive promotion | Blue "primary" button with "Activate" text | ⬜ |
| PRO-ST-06 | Toggle failure | API error | Toast "Failed to update promotion status" | ⬜ |
| PRO-ST-07 | Click stops propagation | Click Suspend/Activate | `e.stopPropagation()` prevents row click events | ⬜ |

---

## 31. Loyalty — List & Search

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| LOY-LS-01 | Loyalty page loads | Navigate to Loyalty | "Loyalty & Rewards" heading; user list with loyalty data loaded | ⬜ |
| LOY-LS-02 | Users mapped to loyalty accounts | API returns user data | Each user mapped to loyalty account with points, tier, totalEarned, totalRedeemed | ⬜ |
| LOY-LS-03 | Default values for missing data | User has no loyalty fields | Points default to 0, tier to "bronze", earned/redeemed to 0 | ⬜ |
| LOY-LS-04 | Table columns | View table | Columns: User, Tier, Points, Total Earned, Total Redeemed, Actions | ⬜ |
| LOY-LS-05 | Search users | Type name in search field | API called with `?search=` param after debounce; list updates | ⬜ |
| LOY-LS-06 | Tier badge variants | View tier column | Badge color from `TIER_BADGE_VARIANTS` config per tier | ⬜ |
| LOY-LS-07 | Points formatted | User with 12500 points | Shows "12,500" (`.toLocaleString()`) | ⬜ |
| LOY-LS-08 | Tier summary cards | View summary grid | 4 cards from `LOYALTY_TIERS` config showing count per tier with Star icons | ⬜ |
| LOY-LS-09 | Tier card colors | View tier cards | Each card Star icon uses `colorClass` from config | ⬜ |
| LOY-LS-10 | Empty state | No users | "No users found" centered in table | ⬜ |
| LOY-LS-11 | Loading state | While fetching | "Loading..." centered | ⬜ |
| LOY-LS-12 | Fetch failure | API error | Toast "Failed to load loyalty data" | ⬜ |

---

## 32. Loyalty — Award Bonus

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| LOY-AW-01 | Open award modal | Click "Award Bonus" (Gift icon) on user row | Modal opens: "Award Bonus Points" with user name | ⬜ |
| LOY-AW-02 | Points input field | View modal | Number input with min=1, placeholder "e.g. 100", autofocused | ⬜ |
| LOY-AW-03 | Submit with valid points | Enter 500 → Click award button | POST `/admin/loyalty/award` with `{ userId, type: 'loyalty_bonus', amount: 500 }`; toast "Awarded 500 bonus points to {name}" | ⬜ |
| LOY-AW-04 | Submit with zero points | Enter 0 → Submit | Toast error: "Please enter a valid positive number of points" | ⬜ |
| LOY-AW-05 | Submit with negative points | Enter -10 → Submit | Toast error: "Please enter a valid positive number of points" | ⬜ |
| LOY-AW-06 | Submit with non-numeric | Enter "abc" → Submit | `parseInt` returns NaN → toast error | ⬜ |
| LOY-AW-07 | Enter key submits | Type points → Press Enter | `onKeyDown` handler triggers `submitAwardBonus()` | ⬜ |
| LOY-AW-08 | Modal closes on success | Award succeeds | `bonusModal` set to null; `bonusPoints` reset | ⬜ |
| LOY-AW-09 | List refreshed after award | Award succeeds | `fetchAccounts()` re-called to show updated points | ⬜ |
| LOY-AW-10 | Award failure | API error | Toast "Failed to award bonus points"; modal stays open | ⬜ |
| LOY-AW-11 | Close modal without awarding | Click X button | Modal closes; no API call | ⬜ |
| LOY-AW-12 | Awarding state prevents double submit | Click award rapidly | `awarding` flag prevents concurrent requests | ⬜ |

---

## 33. Analytics — Revenue Cards

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| ANA-REV-01 | Revenue section heading | View Analytics page | "Revenue" section heading | ⬜ |
| ANA-REV-02 | Gross Revenue card | View revenue cards | Shows formatted currency value from `earnings.rideRevenue` | ⬜ |
| ANA-REV-03 | Commission card | View cards | Blue text; shows `earnings.platformCommission` | ⬜ |
| ANA-REV-04 | Net Revenue card | View cards | Green text; shows `earnings.net` | ⬜ |
| ANA-REV-05 | Driver Payouts card | View cards | Orange text; shows `earnings.driverPayouts` | ⬜ |
| ANA-REV-06 | All cards use formatCurrency | View all amounts | Proper currency formatting via `formatCurrency()` helper | ⬜ |
| ANA-REV-07 | Null/0 values | No earnings data | Shows formatted zero currency value | ⬜ |
| ANA-REV-08 | Cards responsive | View on mobile | 2-column on mobile, 4-column on desktop (`md:grid-cols-4`) | ⬜ |

---

## 34. Analytics — Charts

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| ANA-CH-01 | Revenue line chart | Time series data exists | Recharts LineChart with daily revenue over last 30 days | ⬜ |
| ANA-CH-02 | Rides bar chart | Time series data exists | Recharts BarChart with daily ride counts | ⬜ |
| ANA-CH-03 | Charts side by side | Desktop view | Two charts in 2-column grid (`lg:grid-cols-2`) | ⬜ |
| ANA-CH-04 | X-axis date formatting | View chart axes | Dates formatted as "MMM d" (e.g., "Jun 15") | ⬜ |
| ANA-CH-05 | Chart tooltips — revenue | Hover on revenue line | Tooltip shows formatted currency + "Revenue" label | ⬜ |
| ANA-CH-06 | Chart tooltips — rides | Hover on ride bar | Tooltip shows count + "Rides" label | ⬜ |
| ANA-CH-07 | Tooltip date format | View tooltip label | Shows "weekday, MMM d" (e.g., "Mon, Jun 15") | ⬜ |
| ANA-CH-08 | No time series data | Empty time series | Charts section not rendered (conditional render) | ⬜ |
| ANA-CH-09 | Chart responsive container | Resize window | Charts resize to fit container via `ResponsiveContainer` | ⬜ |
| ANA-CH-10 | Bar chart rounded corners | View bar chart | Bars have `radius={[4, 4, 0, 0]}` (rounded top corners) | ⬜ |
| ANA-CH-11 | Grid lines | View charts | Dashed grid lines (`strokeDasharray="3 3"`) | ⬜ |
| ANA-CH-12 | Y-axis no decimals (rides) | View rides chart | `allowDecimals={false}` on Y-axis | ⬜ |

---

## 35. Analytics — Ride & User Stats

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| ANA-ST-01 | Rides section heading | View page | "Rides" section heading | ⬜ |
| ANA-ST-02 | Total Rides card | View ride stats | Shows `rideStats.total` with `.toLocaleString()` formatting | ⬜ |
| ANA-ST-03 | Completed rides card | View stats | Green text; `rideStats.completed` | ⬜ |
| ANA-ST-04 | Cancelled rides card | View stats | Red text; `rideStats.cancelled` | ⬜ |
| ANA-ST-05 | Active rides card | View stats | Blue text; `rideStats.active` | ⬜ |
| ANA-ST-06 | Users section heading | View page | "Users" section heading | ⬜ |
| ANA-ST-07 | Total Riders card | View user stats | `userStats.totalRiders` | ⬜ |
| ANA-ST-08 | Total Drivers card | View user stats | `userStats.totalDrivers` | ⬜ |
| ANA-ST-09 | Active Drivers card | View user stats | Green text; `userStats.activeDrivers` | ⬜ |
| ANA-ST-10 | Counts from API | API response | Data sourced from `/admin/analytics/counts` endpoint | ⬜ |
| ANA-ST-11 | Missing count fields default to 0 | API returns partial data | All missing fields fall back to `|| 0` | ⬜ |

---

## 36. Analytics — Period Filter

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| ANA-PER-01 | Default period | Navigate to Analytics | "This Month" selected by default | ⬜ |
| ANA-PER-02 | Period options | Open dropdown | Options: Today, This Week, This Month, All Time | ⬜ |
| ANA-PER-03 | Switch to Today | Select "Today" | API re-called with `?period=today`; all data refreshes | ⬜ |
| ANA-PER-04 | Switch to Week | Select "This Week" | API called with `?period=week` | ⬜ |
| ANA-PER-05 | Switch to All Time | Select "All Time" | API called with `?period=all` | ⬜ |
| ANA-PER-06 | Loading state | While refetching | "Loading analytics..." centered on page | ⬜ |
| ANA-PER-07 | Fetch failure | All API calls fail | Toast "Failed to load analytics" | ⬜ |
| ANA-PER-08 | Parallel API calls | Period changes | Earnings, time series, and counts fetched via `Promise.all` | ⬜ |

---

## 37. Payouts — List & Filter

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| PAY-LS-01 | Payouts page loads | Navigate to Payouts | "Payout Management" heading; summary cards + payout table | ⬜ |
| PAY-LS-02 | Summary card — Gross Revenue | View cards | Wallet icon; gross revenue from analytics API | ⬜ |
| PAY-LS-03 | Summary card — Paid Out | View cards | Green text; `driverPayouts` from earnings | ⬜ |
| PAY-LS-04 | Summary card — Pending | View cards | Yellow text; count of pending payouts in current page | ⬜ |
| PAY-LS-05 | Summary card — Failed | View cards | Red text; count of failed payouts in current page | ⬜ |
| PAY-LS-06 | Filter by status — All | Select "All Status" | No status filter; all payouts shown | ⬜ |
| PAY-LS-07 | Filter by status — Pending | Select "Pending" | API called with `?status=pending`; page reset to 1 | ⬜ |
| PAY-LS-08 | Filter by status — Approved | Select "Approved" | Only approved payouts shown | ⬜ |
| PAY-LS-09 | Filter by status — Completed | Select "Completed" | Only completed payouts | ⬜ |
| PAY-LS-10 | Filter by status — Failed | Select "Failed" | Only failed payouts | ⬜ |
| PAY-LS-11 | Refresh button | Click refresh icon | `fetchPayouts()` re-called | ⬜ |
| PAY-LS-12 | Table header total count | View table header | Shows "Payout Requests" + total count from pagination | ⬜ |
| PAY-LS-13 | Table columns | View table | Columns: (expand), Driver, Amount, Status, Date, Actions | ⬜ |
| PAY-LS-14 | Driver info display | View row | Driver name + email; fallback to truncated userId | ⬜ |
| PAY-LS-15 | Amount formatted | `amount: 50000, currency: 'NGN'` | Shows "NGN 50,000" via `formatMoney()` | ⬜ |
| PAY-LS-16 | Non-finite amount safety | `amount: NaN` | Shows "NGN 0" (`asNumber` guard) | ⬜ |
| PAY-LS-17 | Default currency | No currency specified | Falls back to `DEFAULT_CURRENCY` from regions config | ⬜ |
| PAY-LS-18 | Status badges | Various payout statuses | Completed=green, Approved=blue, Pending=yellow, Failed=red | ⬜ |
| PAY-LS-19 | Loading state | While fetching | "Loading..." centered | ⬜ |
| PAY-LS-20 | Empty state | No payouts | "No payout records found" centered | ⬜ |

---

## 38. Payouts — Approve

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| PAY-AP-01 | Approve button visible for pending | Payout with `status: 'pending'` | Green "Approve" button visible | ⬜ |
| PAY-AP-02 | No approve button for other statuses | Payout with `status: 'completed'` | No approve button shown | ⬜ |
| PAY-AP-03 | Approve payout | Click "Approve" | POST `/payouts/{id}/approve` with `{ approved: true }`; toast "Payout approved" | ⬜ |
| PAY-AP-04 | Approve refreshes list | Approval succeeds, page = 1 | `fetchPayouts()` called; list refreshed | ⬜ |
| PAY-AP-05 | Approve resets to page 1 | Approval succeeds, page ≠ 1 | `setPage(1)` which triggers refetch via useEffect | ⬜ |
| PAY-AP-06 | Approve failure | API error | Toast "Failed to approve payout" | ⬜ |

---

## 39. Payouts — Detail & Expand

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| PAY-DET-01 | Expand payout row | Click chevron on payout row | Detail section shows: Payout ID, Driver ID, Phone, Method, Bank Code, Account Number | ⬜ |
| PAY-DET-02 | Collapse payout row | Click chevron again | Detail section collapses | ⬜ |
| PAY-DET-03 | Missing detail fields | Some fields null | Shows "N/A" for missing method, bankCode, accountNumber, phone | ⬜ |
| PAY-DET-04 | Payout ID mono text | View expanded details | Payout ID in `font-mono` with `break-all` for long IDs | ⬜ |
| PAY-DET-05 | Method capitalized | `method: 'paystack'` | Shows "Paystack" (`capitalize` class) | ⬜ |
| PAY-DET-06 | Multiple rows expandable | Expand 2 payouts | Both show detail sections simultaneously | ⬜ |

---

## 40. Payouts — Pagination

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| PAY-PG-01 | Pagination visible | More than 1 page of results | Previous/Next buttons + "Page X of Y" shown below table | ⬜ |
| PAY-PG-02 | Pagination hidden | 1 page or less | Pagination section not rendered | ⬜ |
| PAY-PG-03 | Next page | Click "Next" | Page increments; API called with new page number | ⬜ |
| PAY-PG-04 | Previous page | On page 2+ → Click "Previous" | Page decrements; API re-fetches | ⬜ |
| PAY-PG-05 | Previous disabled on page 1 | On page 1 | "Previous" button has `disabled:opacity-50`; cannot go below 1 | ⬜ |
| PAY-PG-06 | Next disabled on last page | On final page | "Next" button disabled; cannot exceed `totalPages` | ⬜ |
| PAY-PG-07 | Page size | Check API call | `limit=20` (`DEFAULT_PAGE_SIZE`) sent with every request | ⬜ |
| PAY-PG-08 | Filter resets page | Change status filter | Page resets to 1 via `setPage(1)` | ⬜ |

---

## 41. Support — Ticket List

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| SUP-LS-01 | Support page loads | Navigate to Support | "Support Tickets" heading; tickets from `/support/admin/all` | ⬜ |
| SUP-LS-02 | Table columns | View table | Columns: Subject, User, Priority, Status, Date, Actions | ⬜ |
| SUP-LS-03 | Priority badge — high | `priority: 'high'` | Red "danger" badge | ⬜ |
| SUP-LS-04 | Priority badge — normal/low | `priority: 'low'` | Blue "info" badge | ⬜ |
| SUP-LS-05 | Status badge — open | `status: 'open'` | Yellow "warning" badge | ⬜ |
| SUP-LS-06 | Status badge — closed | `status: 'closed'` | Green "success" badge | ⬜ |
| SUP-LS-07 | User email shown | Ticket has `userEmail` | Email displayed; fallback "N/A" if missing | ⬜ |
| SUP-LS-08 | Date formatted | View date column | Uses `formatDateSafe()` from utils | ⬜ |
| SUP-LS-09 | View button | Click Eye icon on ticket | Opens ticket detail modal | ⬜ |
| SUP-LS-10 | Empty state | No tickets | "No tickets found" centered | ⬜ |
| SUP-LS-11 | Loading state | While fetching | "Loading..." centered | ⬜ |
| SUP-LS-12 | Fetch failure | API error | Toast "Failed to load support tickets" | ⬜ |

---

## 42. Support — Ticket Detail & Chat

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| SUP-CH-01 | Modal opens | Click view on ticket | Fixed overlay modal with ticket subject as title; ticket ID shown | ⬜ |
| SUP-CH-02 | Ticket description | View modal | Initial description in gray background card | ⬜ |
| SUP-CH-03 | Message thread — user message | View messages | User messages aligned left; `bg-gray-100 text-gray-900` | ⬜ |
| SUP-CH-04 | Message thread — admin message | View messages | Admin messages aligned right; `bg-blue-600 text-white` | ⬜ |
| SUP-CH-05 | Message bubble max width | View long messages | Bubbles capped at `max-w-[80%]` (`CHAT_BUBBLE_MAX_WIDTH`) | ⬜ |
| SUP-CH-06 | Message timestamps | View messages | Each message shows date/time via `formatDateTimeSafe()` | ⬜ |
| SUP-CH-07 | Send reply | Type message → Click send (or Enter) | POST `/support/admin/{id}/reply` with `{ content }` | ⬜ |
| SUP-CH-08 | Reply optimistic update | Send succeeds | New admin message appended to messages list immediately; input cleared | ⬜ |
| SUP-CH-09 | Reply toast | Send succeeds | Toast "Reply sent" | ⬜ |
| SUP-CH-10 | Empty reply guard | Click send with empty/whitespace text | Nothing happens (guard: `!replyText.trim()`) | ⬜ |
| SUP-CH-11 | Reply while sending guard | Click send rapidly | `sending` flag prevents concurrent sends | ⬜ |
| SUP-CH-12 | Reply failure | API error | Toast "Failed to send reply" | ⬜ |
| SUP-CH-13 | Close modal | Click X button | `selectedTicket` set to null; modal disappears | ⬜ |
| SUP-CH-14 | Modal scrollable | Many messages | Message area has `overflow-y-auto` with `max-h-[90vh]` on modal | ⬜ |

---

## 43. Support — Resolve Ticket

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| SUP-RES-01 | Resolve button visible | Open ticket with `status: 'open'` | Resolve button visible in modal footer (with confirmation text) | ⬜ |
| SUP-RES-02 | Resolve confirmation | Click Resolve | Browser confirm: "Mark this ticket as resolved? The user will not be able to reopen it." | ⬜ |
| SUP-RES-03 | Resolve succeeds | Confirm resolution | POST `/support/admin/{id}/close`; toast "Ticket resolved"; ticket status updated to 'closed' | ⬜ |
| SUP-RES-04 | Resolve — cancel confirm | Click Resolve → Cancel dialog | No API call; ticket unchanged | ⬜ |
| SUP-RES-05 | Resolve failure | API error | Toast "Failed to resolve ticket" | ⬜ |
| SUP-RES-06 | Tickets list refreshed | Ticket resolved | `fetchTickets()` re-called to update main table | ⬜ |

---

## 44. Socket — Connection Lifecycle

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| SOCK-CL-01 | Socket connects on admin login | Login as admin | Socket.IO connects to `SOCKET_URL` with Firebase token in auth | ⬜ |
| SOCK-CL-02 | Joins admin room | Socket connects | Emits `join:admin` event to join admin broadcast room | ⬜ |
| SOCK-CL-03 | Reconnection toast | Disconnect → Reconnect | Toast success: "Live updates reconnected" (only after first successful connect) | ⬜ |
| SOCK-CL-04 | Disconnect warning toast | Network drops / server goes down | Toast warn: "Live updates disconnected. Data may be stale." | ⬜ |
| SOCK-CL-05 | New ride toast | Server emits `ride:created` | Toast info: "New ride request: {short_id}" (first 8 chars of ride ID) | ⬜ |
| SOCK-CL-06 | Reconnection attempts | Connection lost | Up to 10 reconnection attempts (`SOCKET_RECONNECTION_ATTEMPTS`) with 1000ms delay | ⬜ |
| SOCK-CL-07 | Socket disconnects on logout | Click Logout | `newSocket.disconnect()` called; socket state set to null | ⬜ |
| SOCK-CL-08 | Socket not created for non-admin | Login as non-admin (if bypassed) | Socket only created when `user.role === 'admin'` | ⬜ |
| SOCK-CL-09 | Socket cleanup on user change | User state changes | Previous socket disconnected; new socket created if admin | ⬜ |
| SOCK-CL-10 | isConnected state | Socket connects/disconnects | `isConnected` state accurately reflects socket connection status | ⬜ |
| SOCK-CL-11 | Unknown ride ID in toast | `data.id` is undefined | Toast shows "New ride request: unknown" | ⬜ |

---

## 45. API Client — Interceptors & Error Handling

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| API-INT-01 | Token injected on every request | Make any API call | Request interceptor sets `Authorization: Bearer {token}` from `getIdToken()` | ⬜ |
| API-INT-02 | Token auto-refreshed before request | Token near expiry | `getIdToken()` auto-refreshes; new token used and stored in localStorage | ⬜ |
| API-INT-03 | Idempotency-Key on POST | POST request made | Header `Idempotency-Key: {uuid}` automatically added | ⬜ |
| API-INT-04 | Idempotency-Key on PUT | PUT request made | Idempotency key added | ⬜ |
| API-INT-05 | Idempotency-Key on PATCH | PATCH request made | Idempotency key added | ⬜ |
| API-INT-06 | No Idempotency-Key on GET | GET request made | No `Idempotency-Key` header (only state-changing methods) | ⬜ |
| API-INT-07 | Custom Idempotency-Key preserved | Caller sets custom key | Interceptor does not overwrite (`!config.headers['Idempotency-Key']` check) | ⬜ |
| API-INT-08 | Global error toast | Non-401 API error | Error toast via `getHttpErrorMessage(error)` | ⬜ |
| API-INT-09 | Suppress global error | Request with `X-Suppress-Global-Error: true` | No global error toast shown | ⬜ |
| API-INT-10 | 401 force logout | API returns 401 | Token removed; Firebase signOut called; hard redirect to `/login` | ⬜ |
| API-INT-11 | No current user | Make request while logged out | No Authorization header added; no crash (try/catch in interceptor) | ⬜ |

---

## 46. Error Boundary & Edge Cases

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| ERR-EC-01 | React render error caught | Component throws during render | ErrorBoundary shows: "!" icon, "Something went wrong", error message, "Try Again" button | ⬜ |
| ERR-EC-02 | Try Again resets boundary | Click "Try Again" | `hasError` reset to false; component re-attempts render | ⬜ |
| ERR-EC-03 | Error logged to console | Render error occurs | `componentDidCatch` logs error + errorInfo to console | ⬜ |
| ERR-EC-04 | Custom fallback prop | ErrorBoundary has `fallback` prop | Custom fallback rendered instead of default UI | ⬜ |
| ERR-EC-05 | ToastContainer renders | View any page | `react-toastify` ToastContainer present in DOM | ⬜ |
| ERR-EC-06 | Toast auto-close timing | Trigger any toast | Auto-closes after 3000ms (`TOAST_AUTO_CLOSE_MS`) | ⬜ |

---

## 47. Routing & Code Splitting

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| RTE-CS-01 | All pages lazy-loaded | Inspect network tab | Each page loaded as separate chunk (React.lazy + Suspense) | ⬜ |
| RTE-CS-02 | Login page accessible without auth | Navigate to `/login` | Login page renders; no redirect or access error | ⬜ |
| RTE-CS-03 | Dashboard at root | Navigate to `/` | DashboardPage component renders | ⬜ |
| RTE-CS-04 | Users at /users | Navigate to `/users` | UsersPage renders | ⬜ |
| RTE-CS-05 | Rides at /rides | Navigate to `/rides` | RidesPage renders | ⬜ |
| RTE-CS-06 | Deliveries at /deliveries | Navigate to `/deliveries` | DeliveriesPage renders | ⬜ |
| RTE-CS-07 | Vehicles at /vehicles | Navigate to `/vehicles` | VehiclesPage renders | ⬜ |
| RTE-CS-08 | Pricing at /pricing | Navigate to `/pricing` | PricingPage renders | ⬜ |
| RTE-CS-09 | Disputes at /disputes | Navigate to `/disputes` | DisputesPage renders | ⬜ |
| RTE-CS-10 | Promotions at /promotions | Navigate to `/promotions` | PromotionsPage renders | ⬜ |
| RTE-CS-11 | Loyalty at /loyalty | Navigate to `/loyalty` | LoyaltyPage renders | ⬜ |
| RTE-CS-12 | Analytics at /analytics | Navigate to `/analytics` | AnalyticsPage renders | ⬜ |
| RTE-CS-13 | Payouts at /payouts | Navigate to `/payouts` | PayoutsPage renders | ⬜ |
| RTE-CS-14 | Support at /support | Navigate to `/support` | SupportPage renders | ⬜ |
| RTE-CS-15 | Catch-all redirect | Navigate to `/anything-random` | Redirected to `/` (Dashboard) | ⬜ |
| RTE-CS-16 | Nested layout | Visit any protected route | Page renders inside AdminLayout (Sidebar + main content area) | ⬜ |

---

## 48. Responsive & Cross-Browser

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| RES-CB-01 | Desktop layout (1920px) | View on desktop | Sidebar + content area properly aligned; tables display all columns | ⬜ |
| RES-CB-02 | Laptop layout (1280px) | View on laptop | All tables scrollable horizontally if needed; cards collapse to fewer columns | ⬜ |
| RES-CB-03 | Tablet layout (768px) | View on tablet | Grid cards switch to 2-column; tables overflow with horizontal scroll | ⬜ |
| RES-CB-04 | Mobile layout (320px) | View on mobile | Sidebar overlaps or needs toggle (fixed sidebar may cover content); forms stack vertically | ⬜ |
| RES-CB-05 | Table horizontal scroll | Narrow viewport with wide table | `overflow-x-auto` wrapping enables horizontal scroll | ⬜ |
| RES-CB-06 | Stats cards responsive | Resize window | Cards transition from `grid-cols-1` → `md:grid-cols-3/4` | ⬜ |
| RES-CB-07 | Search + filters responsive | View on small screen | Flex layout wraps filters below search on mobile (`flex-col sm:flex-row`) | ⬜ |
| RES-CB-08 | Chrome support | Open in Chrome | All features function correctly | ⬜ |
| RES-CB-09 | Firefox support | Open in Firefox | All features function correctly | ⬜ |
| RES-CB-10 | Safari support | Open in Safari | All features function correctly | ⬜ |
| RES-CB-11 | Edge support | Open in Edge | All features function correctly | ⬜ |

---

## 49. Network & Connectivity

| ID | Test Case | Steps | Expected Behavior | Status |
|----|-----------|-------|-------------------|--------|
| NET-A-01 | Offline — API calls fail | Turn off network → Navigate to any page | Error toast from response interceptor; data stays at loading/empty state | ⬜ |
| NET-A-02 | Online recovery | Restore network → Interact | Next API call succeeds; data loads | ⬜ |
| NET-A-03 | Socket disconnects offline | Turn off network | Socket disconnects; toast "Live updates disconnected. Data may be stale." | ⬜ |
| NET-A-04 | Socket reconnects online | Restore network | Socket reconnects; toast "Live updates reconnected"; re-joins admin room | ⬜ |
| NET-A-05 | Dashboard polls continue | Network restored | 30s interval resumes fetching stats | ⬜ |
| NET-A-06 | Map polls continue | Network restored | 15s interval resumes fetching driver locations | ⬜ |
| NET-A-07 | Slow network — loading states | Throttle to 3G | All pages show proper loading indicators while data loads | ⬜ |
| NET-A-08 | Token refresh on flaky network | Network intermittent | Token refresh in interceptor handled gracefully (try/catch); console error logged | ⬜ |

---

## Summary

| Category | Count |
|----------|-------|
| Authentication — Login | 11 |
| Authentication — Session & Token | 7 |
| Authentication — Access Control | 7 |
| Layout — Sidebar Navigation | 11 |
| Layout — General UI | 4 |
| Dashboard — Stats Overview | 10 |
| Dashboard — Live Map | 14 |
| Dashboard — Real-Time Updates | 7 |
| Users — List & Search | 23 |
| Users — Status Management | 8 |
| Users — Document Review | 22 |
| Rides — Active Rides Tab | 17 |
| Rides — All History Tab | 8 |
| Rides — Detail & Expand | 12 |
| Rides — Admin Cancel | 9 |
| Rides — Real-Time Socket | 8 |
| Deliveries — List & Filter | 15 |
| Deliveries — Real-Time Updates | 4 |
| Vehicles — List & Search | 17 |
| Vehicles — Summary Cards | 5 |
| Pricing — Nigeria Rides | 15 |
| Pricing — Chicago Premium | 9 |
| Pricing — Delivery | 8 |
| Pricing — History | 18 |
| Disputes — List & View | 15 |
| Disputes — Resolution | 15 |
| Promotions — List & View | 12 |
| Promotions — Create | 12 |
| Promotions — Edit | 9 |
| Promotions — Activate/Suspend | 7 |
| Loyalty — List & Search | 12 |
| Loyalty — Award Bonus | 12 |
| Analytics — Revenue Cards | 8 |
| Analytics — Charts | 12 |
| Analytics — Ride & User Stats | 11 |
| Analytics — Period Filter | 8 |
| Payouts — List & Filter | 20 |
| Payouts — Approve | 6 |
| Payouts — Detail & Expand | 6 |
| Payouts — Pagination | 8 |
| Support — Ticket List | 12 |
| Support — Ticket Detail & Chat | 14 |
| Support — Resolve Ticket | 6 |
| Socket — Connection Lifecycle | 11 |
| API Client — Interceptors & Error Handling | 11 |
| Error Boundary & Edge Cases | 6 |
| Routing & Code Splitting | 16 |
| Responsive & Cross-Browser | 11 |
| Network & Connectivity | 8 |
| **TOTAL** | **512** |
