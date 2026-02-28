# 💳 Payment System Implementation Guide

## Step-by-Step Execution Plan for SSLCommerz Sandbox + ngrok

> Follow each step in order. Check off items as you complete them.

---

## Pre-requisites

- [ ] Register for SSLCommerz Sandbox at `https://sandbox.sslcommerz.com`
- [ ] Get your **Store ID** and **Store Password** from the sandbox dashboard
- [ ] Install ngrok: `npm install -g ngrok` (or download from https://ngrok.com)
- [ ] Sign up for free ngrok account and authenticate: `ngrok config add-authtoken YOUR_TOKEN`

---

## Phase 1: Foundation (Database + Backend Setup)

### Step 1.1 — Environment Variables
- [ ] Add to `backend/.env`:
  ```
  SSLCOMMERZ_STORE_ID=your_sandbox_store_id
  SSLCOMMERZ_STORE_PASSWORD=your_sandbox_store_password
  SSLCOMMERZ_IS_LIVE=false
  NGROK_URL=https://xxxx.ngrok-free.app
  ```
  > ⚠️ `NGROK_URL` must be updated each time you restart ngrok (free tier gives random URLs)

### Step 1.2 — Install SSLCommerz Package
- [ ] Run in `backend/` directory:
  ```bash
  npm install sslcommerz-lts
  ```

### Step 1.3 — Create Database Migration
- [ ] Create file: `backend/migrations/add_payment_system.sql`
- [ ] Add tables:
  - `payment_configs` (event-level fee settings)
  - `transactions` (payment records)
  - `refunds` (refund tracking)
- [ ] Alter `event_participants`: add `payment_status` column
- [ ] Add stored procedures for payment operations
- [ ] Run migration on Supabase

### Step 1.4 — Create SSLCommerz Service
- [ ] Create file: `backend/services/sslcommerz.service.js`
- [ ] Implement functions:
  - `initPayment(params)` — calls SSLCommerz Session API
  - `validateTransaction(valId)` — calls Validation API
  - `initiateRefund(bankTranId, amount)` — calls Refund API

### Step 1.5 — Create Payment Routes
- [ ] Create file: `backend/routes/payment.routes.js`
- [ ] Implement endpoints:
  - `POST /:eventId/config` — create/update payment config
  - `GET /:eventId/config` — get payment config
  - `POST /:eventId/initiate` — start payment session
  - `POST /ipn` — IPN callback handler
  - `POST /success` — success redirect
  - `POST /fail` — failure redirect
  - `POST /cancel` — cancel redirect
  - `POST /:transactionId/refund` — initiate refund
  - `GET /:eventId/transactions` — list transactions
  - `GET /user/:userId/transactions` — user's payment history
- [ ] Mount in `server.js`: `app.use('/api/payment', paymentRoutes)`

### Step 1.6 — Modify Registration Routes
- [ ] In `POST /:eventId/register`: check if paid event → set `payment_status = 'pending'`
- [ ] In `POST /participants/:participantId/reject`: auto-refund per policy
- [ ] Add `POST /participants/:participantId/cancel`: participant self-cancels with refund

### ✅ Phase 1 Checkpoint
- [ ] Start server — no errors
- [ ] Test payment config CRUD via Postman/curl
- [ ] Test payment initiation returns SSLCommerz redirect URL

---

## Phase 2: Payment Flow (End-to-End)

### Step 2.1 — Start ngrok
- [ ] Run: `ngrok http 5000`
- [ ] Copy the `https://xxxx.ngrok-free.app` URL
- [ ] Update `NGROK_URL` in `backend/.env`
- [ ] Restart backend server

### Step 2.2 — Payment Config UI (Event Creator)
- [ ] Create: `frontend/src/pages/EventAdd/components/PaymentConfigSection.jsx`
  - Toggle: "Require registration fee"
  - Fee amount input (BDT)
  - Fee type: per person / per team
  - Refund policy dropdown (full / partial / no refund / custom)
  - Partial refund percentage input (shown when partial selected)
  - Accepted methods checkboxes (bKash, Nagad, Card, Bank)
- [ ] Import and add to `EventAdd/index.jsx` form
- [ ] Pass payment config data in `handleSubmit`
- [ ] Save payment config after event creation

### Step 2.3 — Payment Step in Registration Form
- [ ] Modify `EventRegistrationForm.jsx`:
  - Fetch payment config alongside registration config
  - After form validation, if paid → show payment summary card
  - "Pay ৳X & Register" button → calls `/api/payment/:eventId/initiate`
  - Redirect to SSLCommerz checkout
- [ ] Handle returning from SSLCommerz (query params)

### Step 2.4 — Success/Fail Pages
- [ ] Create: `frontend/src/pages/events/PaymentSuccess.jsx`
  - Shows: ✅ Payment confirmed, transaction ID, amount, event link
- [ ] Create: `frontend/src/pages/events/PaymentFail.jsx`
  - Shows: ❌ Payment failed, error message, retry button
- [ ] Add routes in `App.jsx` or router config

### Step 2.5 — IPN Handler Testing
- [ ] With ngrok running, complete a test payment on SSLCommerz sandbox
- [ ] Check server logs — IPN should be received
- [ ] Verify transaction is recorded in database
- [ ] Verify participant `payment_status` updated to `completed`

### ✅ Phase 2 Checkpoint
- [ ] Full flow works: create paid event → register → pay → IPN received → payment recorded
- [ ] Fail path works: cancel payment → can retry
- [ ] Free events still work normally (no regression)

---

## Phase 3: Refund System

### Step 3.1 — Refund on Registration Rejection
- [ ] When organizer rejects a paid participant:
  - Check event's refund policy
  - If `full_refund`: auto-initiate 100% refund
  - If `partial_refund`: auto-initiate X% refund
  - If `no_refund`: skip refund, notify participant
  - If `custom`: prompt organizer for amount
- [ ] Create refund record in `refunds` table
- [ ] Call SSLCommerz Refund API
- [ ] Update transaction status

### Step 3.2 — Participant Self-Cancellation
- [ ] Add "Cancel Registration" button on participant's registered events page
- [ ] On click → show modal with refund policy info:
  - `full_refund`: "You'll receive ৳X back"
  - `partial_refund`: "You'll receive ৳Y back (Z% of ৳X)"
  - `no_refund`: "⚠️ No refund — you will not get your money back"
  - `custom`: "Refund amount will be decided by the organizer"
- [ ] On confirm → call `POST /participants/:id/cancel`
- [ ] Backend: update status to `cancelled`, initiate refund per policy
- [ ] Free events: just cancel, no refund logic

### Step 3.3 — Event Cancellation (Bulk Refund)
- [ ] When creator cancels event with paid registrations:
  - Show confirmation: "X participants will be refunded"
  - On confirm → bulk refund all paid participants (100% regardless of policy)
  - Create refund records for each
- [ ] Update all registrations to `cancelled`

### Step 3.4 — Refund Status Tracking
- [ ] Participants can see refund status on their dashboard:
  - `initiated` → "Refund processing..."
  - `completed` → "৳X refunded to [original method]"
  - `failed` → "Refund failed — contact organizer"

### ✅ Phase 3 Checkpoint
- [ ] Reject paid participant → refund initiated per policy
- [ ] Participant cancels → correct refund amount applied
- [ ] Cancel event → all participants refunded 100%
- [ ] Refund status visible to participant

---

## Phase 4: Dashboards & Polish

### Step 4.1 — Organizer Payment Dashboard
- [ ] Create: `frontend/src/pages/dashboard/organizer/OrganizerPaymentDashboard.jsx`
  - List of events with transaction counts
  - Click event → see all transactions
  - Filter by status (completed, refunded, pending)
  - Summary: total revenue, refunded amount, net amount
  - Refund button per transaction
  - "Mark as paid (fee waiver)" button

### Step 4.2 — Payment Status Badges
- [ ] Add payment status badges to:
  - Organizer's participant management (pending/approved/rejected lists)
  - Participant's "My Registrations" page
  - Event detail page (fee amount display)
- [ ] Badge colors:
  - `not_required` → gray
  - `pending` → yellow
  - `completed` → green
  - `refunded` → blue

### Step 4.3 — Participant Transaction History
- [ ] On participant dashboard, add "Payment History" section
- [ ] Shows: all transactions across events with status, amount, date, refund info

### Step 4.4 — Fee Display on Event Detail
- [ ] Show registration fee on `EventDetail.jsx`:
  - "Registration Fee: ৳500" (or "Free")
  - Refund policy: "Full refund on cancellation"
  - Accepted methods icons

### Step 4.5 — Fee Waiver
- [ ] Organizer can "Mark as paid (waived)" for a pending participant
- [ ] Sets `payment_status = 'completed'` with `amount = 0` in transaction
- [ ] Participant can proceed without paying

### ✅ Phase 4 Checkpoint
- [ ] Organizer dashboard shows all transactions with correct amounts
- [ ] Institution dashboard shows aggregated data across organizers
- [ ] Payment badges visible across UI
- [ ] Fee info visible on event detail page
- [ ] Fee waiver works

---

## 💰 Money Flow — How Organizers Get Paid

### How SSLCommerz Settles Funds
```
Participant pays ৳500 → SSLCommerz collects → SSLCommerz settles to merchant bank account
```

- SSLCommerz settles collected funds to the **merchant's registered bank account**
- Settlement schedule: **T+1 to T+2 days** (business days)
- In **sandbox mode**: no real money moves, everything is simulated

### For This Project (University/Demo)
- Only ONE SSLCommerz merchant account exists (yours)
- All payments go to one central account
- In a production multi-tenant system, you'd use SSLCommerz **split payments** or manage disbursement manually
- **For demo purposes**: just show the transaction flow — actual money settlement is irrelevant

---

## 🔄 SSLCommerz Refund Mechanism — How It Works

### How SSLCommerz Knows Where to Refund
When a participant pays, SSLCommerz records:
| Data | Purpose |
|------|---------|
| `tran_id` | Our reference (e.g., `EC_abc123_def456_17...`) |
| `bank_tran_id` | The actual bank/wallet transaction ID from bKash/Nagad/Visa |
| `card_type` | Payment method used (bkash, nagad, visa, etc.) |

When we call the **Refund API**, we pass `bank_tran_id`. SSLCommerz traces this back to the **exact source account/card/wallet** and reverses the payment.

### Can User Change the Refund Destination?
**No** — by design:
- Paid via **bKash 01712345678** → refunded to **that exact bKash number**
- Paid via **Visa ending 4321** → refunded to **that exact card**
- This is a **security feature** — prevents fraud (pay from stolen card, refund to different account)

### Edge Cases
| Scenario | What Happens |
|----------|-------------|
| bKash account closed | SSLCommerz refund fails → marked `failed` in our system → organizer handles manually |
| Card expired | Refund still works — banks process refunds to expired cards |
| Partial refund | Only the specified amount is refunded, remainder stays with merchant |

---

## 📊 Dashboard Plans

### Organizer Payment Dashboard (`/organizer/payments`)
| Section | Content |
|---------|---------|
| **Overview Cards** | Total revenue, total refunded, net earnings, pending payments |
| **Per-Event Breakdown** | Each event → collected amount, participant count, refund count |
| **Transaction Table** | Participant name, amount, method (bKash/Card), status, date |
| **Actions** | Refund button, fee waiver button, export CSV |

### Institution Payment Dashboard (`/institution/payments`)
Same as organizer but **aggregated across all organizers** under the institution.

---

## Testing Checklist (Final)

### Happy Paths
- [x] Create paid event (৳500, full refund policy) → verify config saved
- [x] Register as participant → pay via SSLCommerz sandbox → payment recorded
- [ ] Organizer approves paid participant → status = approved
- [ ] Create free event → register → existing flow unchanged

### Refund Paths
- [ ] Organizer rejects paid participant → refund auto-initiated (per policy)
- [ ] Participant cancels with full_refund policy → 100% refund
- [ ] Participant cancels with partial_refund (80%) → 80% refund
- [ ] Participant cancels with no_refund → no refund, warning shown
- [ ] Creator cancels event → all paid participants refunded 100%

### Edge Cases
- [ ] Payment abandonment → can retry
- [ ] Fee waiver by organizer → participant marked as paid
- [ ] Fee display on event detail page for paid vs free events

### Infrastructure
- [ ] ngrok tunnel receives IPN correctly
- [ ] Server restart doesn't lose pending transactions
- [ ] All error states show user-friendly messages

---

## Quick Reference

### SSLCommerz Sandbox Test Credentials
- **Test Card**: `4111111111111111` (Visa), Exp: any future date, CVV: `123`
- **Test bKash**: Use SSLCommerz sandbox test mobile number (check their docs)

### Key URLs
- Sandbox API: `https://sandbox.sslcommerz.com/gwprocess/v4`
- Validation API: `https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php`
- Refund API: `https://sandbox.sslcommerz.com/validator/api/merchantTransIDvalidationAPI.php`

### Environment Variables
```env
SSLCOMMERZ_STORE_ID=xxxx
SSLCOMMERZ_STORE_PASSWORD=xxxx
SSLCOMMERZ_IS_LIVE=false
NGROK_URL=https://xxxx.ngrok-free.app
FRONTEND_URL=http://localhost:5173
```
