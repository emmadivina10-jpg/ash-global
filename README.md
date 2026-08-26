# Refer & Grow

REFER — RESPONSIVE REFERRAL & EARNINGS WEB APP

Build a production-quality, mobile-first responsive web application called Refer.

Refer is a referral-based earning platform initially designed for users in Cameroon. The application should be simple, trustworthy, fast, and optimized primarily for mobile phones while also working beautifully on tablets and desktop.

1. BRAND IDENTITY

Product name: Refer

Tagline:
Refer. Earn. Grow.

Use this color system throughout the application:

Primary Emerald Green: #087443

Dark Green: #0B5D3B

Accent Gold: #F4B942

Background: #F7FAF8

White: #FFFFFF

Main Text: #17211B

Muted Text: #66736B

Success: #16A34A

Error: #DC2626

The design should feel like a modern fintech/rewards platform.

Do NOT use the ASH black/gold branding.

Use:

clean cards

rounded corners

subtle shadows

excellent spacing

large readable numbers

clear CTAs

modern typography

responsive navigation

accessible contrast

professional financial-dashboard styling

Avoid excessive animations, gradients, unnecessary decorative elements, or a complicated interface.

2. CORE BUSINESS MODEL

A user joins Refer by paying a one-time:

5,000 XAF activation fee

After successful payment verification, the user's account becomes:

ACTIVE

Only active users can participate in the referral program.

Referral commissions:

Level 1

Direct referral:
1,500 XAF

Level 2

Second-level referral:
750 XAF

Level 3

Third-level referral:
250 XAF

The system must calculate referral relationships and commissions on the backend/server side.

Never trust commission amounts sent from the frontend.

3. MAIN USER FLOW

Create this complete flow:

Landing Page
↓
Register
↓
Login
↓
User Dashboard
↓
Activation
↓
Pay 5,000 XAF
↓
TchokoPay Payment
↓
Payment Verification
↓
Account Activated
↓
Referral Link Generated
↓
User Shares Referral Link
↓
New User Registers
↓
New User Pays 5,000 XAF
↓
Referral Commissions Calculated
↓
Wallet Updated
↓
Transaction Recorded

4. LANDING PAGE

Create a professional landing page.

Hero section:

Refer. Earn. Grow.

Supporting text:

Build your network, refer new members, and earn rewards through a simple three-level referral system.

Primary CTA:

Get Started

Secondary CTA:

Login

Include a clear explanation of the activation fee:

5,000 XAF one-time activation

Explain the three referral levels:

1,500 XAF
Level 1

750 XAF
Level 2

250 XAF
Level 3

Include sections:

How Refer Works

Referral Rewards

Why Refer

Frequently Asked Questions

Contact/Support

Footer

Do not make unrealistic income guarantees.

5. AUTHENTICATION

Implement secure authentication using Supabase Auth.

Support:

Sign up

Login

Logout

Password reset

Email verification where appropriate

Protected routes

Registration fields:

Full name

Email

Phone number

Password

Confirm password

Referral code

Phone number should support Cameroon numbers.

Validate all fields.

The referral code should be optional during registration but, when supplied, must be validated before assigning the referral relationship.

6. USER PROFILE

Create a profile page containing:

Full name

Email

Phone number

Account status

Referral code

Referral link

Registration date

Account status should display clearly:

PENDING ACTIVATION

or

ACTIVE

7. ACTIVATION PAGE

Create a dedicated activation screen.

Show:

Activate Your Refer Account

5,000 XAF

One-time activation fee.

CTA:

Pay 5,000 XAF

The user should not become active merely because the frontend says payment succeeded.

Activation must happen only after verified payment confirmation from the backend/payment provider.

8. TCHOKOPAY PAYMENT ARCHITECTURE

Prepare the application for integration with TchokoPay.

Important security requirements:

NEVER expose the TchokoPay secret API key in frontend/client-side code.

Store sensitive credentials only in secure server-side environment variables/secrets.

Use a backend/Supabase Edge Function architecture such as:

Frontend
→ Supabase Edge Function
→ TchokoPay
→ Payment Provider
→ Webhook/Callback
→ Supabase Edge Function
→ Database

Create the payment service abstraction so the exact TchokoPay API implementation can be inserted using the official TchokoPay API documentation.

Use environment variables such as:

TCHOKOPAY_API_KEY

TCHOKOPAY_SECRET

TCHOKOPAY_BASE_URL

Do NOT hardcode real credentials.

Create placeholders/configuration for:

initiate payment

payment reference

transaction ID

payment status

callback/webhook

payment verification

The payment system must be designed to prevent duplicate activation.

A payment should be processed idempotently.

9. DATABASE

Use Supabase PostgreSQL.

Create a clean relational database architecture.

Suggested tables:

profiles

Fields:

id

user_id

full_name

email

phone

referral_code

referred_by

account_status

created_at

updated_at

activations

Fields:

id

user_id

amount

currency

payment_provider

provider_transaction_id

payment_reference

status

paid_at

created_at

referrals

Fields:

id

referrer_id

referred_user_id

level

created_at

wallets

Fields:

id

user_id

available_balance

pending_balance

total_earned

total_withdrawn

created_at

updated_at

transactions

Fields:

id

user_id

type

amount

currency

reference

description

status

created_at

Transaction types may include:

ACTIVATION_PAYMENT

REFERRAL_COMMISSION

WITHDRAWAL

WITHDRAWAL_REVERSAL

ADJUSTMENT

withdrawals

Fields:

id

user_id

amount

currency

payment_method

phone_number

status

reference

requested_at

processed_at

10. REFERRAL ENGINE

Create the referral engine on the backend.

When an active user refers another user:

Level 1:

Referrer receives:

1,500 XAF

If that new user later refers another person:

The original referrer receives:

750 XAF

At Level 3:

The original referrer receives:

250 XAF

Do not calculate referral commissions purely in React/client-side JavaScript.

Use server-side database functions/Edge Functions where appropriate.

Prevent:

self-referrals

circular referrals

changing referral parents after registration

duplicate commissions

duplicate referral records

manipulation of referral levels

Referral relationships should be immutable once properly established.

11. USER DASHBOARD

Create a beautiful mobile-first dashboard.

Top section:

Welcome, [Name]

Display:

Available Balance

0 XAF

Total Earned

0 XAF

Total Withdrawn

0 XAF

Direct Referrals

0

Total Network

0

Account status badge:

PENDING ACTIVATION

or

ACTIVE

If inactive, show:

Activate your account for 5,000 XAF

button.

If active, show the referral section prominently.

12. REFERRAL SECTION

Create:

My Referral Link

Display the user's unique referral URL.

Buttons:

Copy Link

Share

Generate a unique referral code.

Example:

REFER-ABC123

Do not use predictable sequential referral codes.

Use secure/random generation.

13. REFERRAL NETWORK

Create a referral network page.

Display:

Level 1

Direct referrals

Level 2

Second-level referrals

Level 3

Third-level referrals

Show:

number of members

active members

commissions generated

Use clean cards and simple visual hierarchy.

Do not expose unnecessary private information about other users.

14. WALLET

Create a wallet page.

Display:

Available Balance

Pending Balance

Total Earned

Total Withdrawn

Transaction history:

Date

Type

Amount

Status

Reference

Example:

Referral Commission
+1,500 XAF

Activation Payment
-5,000 XAF

Use green for positive earnings and appropriate neutral/error styling for other transaction states.

15. WITHDRAWALS

Create a withdrawal page.

Initially support:

MTN Mobile Money

and

Orange Money

The user enters:

amount

mobile money provider

phone number

Before submitting, show a confirmation screen.

The backend must validate:

user is authenticated

user is active

amount is valid

sufficient available balance

withdrawal is not duplicated

phone number is valid

Do NOT automatically mark withdrawals as completed from the frontend.

Use statuses:

PENDING

PROCESSING

COMPLETED

FAILED

REVERSED

16. ADMIN DASHBOARD

Create an admin area with role-based access.

Do not expose admin routes to ordinary users.

Admin dashboard should eventually show:

Total users

Active users

Pending users

Total activation payments

Total commissions

Total withdrawals

Pending withdrawals

Completed withdrawals

Recent transactions

User management:

Search users

View profile

View activation status

View referral information

View transaction history

View wallet

Suspend account where authorized

Withdrawal management:

View pending withdrawals

Approve/process

Reject

Mark completed

Record provider reference

Payment management:

View activation payments

Payment status

Provider reference

Transaction ID

17. SECURITY

Implement Supabase Row Level Security.

Users must only be able to access their own:

profile

wallet

transactions

withdrawals

Users must not be able to modify:

wallet balances

referral commissions

activation status

referral relationships

transaction amounts

These values must be controlled server-side.

Protect admin functionality with role-based authorization.

Never expose service-role keys in frontend code.

18. LEDGER REQUIREMENT

Use an immutable transaction ledger.

Every financial event must create a transaction record.

Never simply increase a wallet balance without recording the corresponding transaction.

For referral commissions:

Transaction:

REFERRAL_COMMISSION

Amount:

1500 XAF

etc.

Wallet balances should be derived/updated safely from ledger transactions.

This is important because Refer will eventually handle real money.

19. RESPONSIVE DESIGN

The website must be optimized for:

iPhone

Android phones

tablets

laptops

desktop

Mobile navigation should be simple.

Use a bottom navigation on mobile if appropriate:

Home
Network
Wallet
Profile

Desktop can use a sidebar.

Ensure buttons are touch-friendly.

20. COMPONENTS

Create reusable components for:

Navbar

Sidebar

MobileBottomNav

StatCard

BalanceCard

ReferralCard

TransactionList

StatusBadge

PaymentModal

WithdrawalModal

CopyReferralButton

LoadingState

EmptyState

ErrorState

ConfirmationModal

21. UX REQUIREMENTS

Every important action needs clear feedback.

Use:

loading states

success states

error messages

confirmation dialogs

skeleton loaders where appropriate

empty states

Examples:

Payment processing...

Payment confirmed. Your account is now active.

Payment could not be verified. Please try again.

Withdrawal request submitted successfully.

Do not make users wonder whether an action worked.

22. TECHNICAL REQUIREMENTS

Use a modern TypeScript-based frontend.

Prefer:

React

TypeScript

Tailwind CSS

Supabase

Supabase Auth

Supabase PostgreSQL

Supabase Edge Functions where server-side logic is required

Keep the code modular and maintainable.

Use environment variables for all secrets.

Do not place secrets in client-side code.

Do not create fake payment success responses.

Do not use mock wallet balances in production logic.

23. PAYMENT DEVELOPMENT MODE

Because the TchokoPay production credentials/API details may be added later, structure the payment service so it can initially run in a clearly separated development/test mode.

Do NOT pretend that a payment was completed.

Create a clean interface such as:

PaymentService

with methods for:

createPayment()

verifyPayment()

handleWebhook()

The TchokoPay implementation should be isolated from the rest of the application.

24. IMPORTANT BUSINESS RULE

A user is NOT ACTIVE simply because they clicked the payment button.

The correct sequence is:

REGISTERED
→ PAYMENT INITIATED
→ PAYMENT VERIFIED
→ ACTIVATION CREATED
→ ACCOUNT ACTIVE

Only after verified payment should referral participation become active.

25. FINAL UI STRUCTURE

Pages/routes:

/
Landing page

/register
Registration

/login
Login

/forgot-password
Password recovery

/dashboard
User dashboard

/activate
Account activation

/network
Referral network

/wallet
Wallet

/withdraw
Withdrawals

/transactions
Transaction history

/profile
Profile

/admin
Admin dashboard

/admin/users
User management

/admin/withdrawals
Withdrawal management

/admin/transactions
Transaction management

26. REFERRAL LINK

Support URLs such as:

/register?ref=REFER-ABC123

When someone opens a referral URL:

Capture the referral code.

Store it temporarily during registration.

Validate the code.

Assign the referral relationship after successful registration.

Do not allow the user to change the parent afterward.

27. DESIGN QUALITY

The finished website should look like a real startup product, not a generic template.

Prioritize:

professional typography

clean spacing

strong hierarchy

excellent mobile experience

simple financial dashboards

trustworthy visual language

fast loading

clear navigation

Use Emerald Green as the dominant brand color and Gold sparingly as an earnings/reward accent.

The interface should immediately communicate:

Money + referrals + trust + growth.

28. BUILD ORDER

Build the application in this order:

Project structure

Brand/UI system

Landing page

Authentication

Supabase database

User profiles

Referral-code system

Activation flow

TchokoPay payment-service architecture

Referral engine

Wallet/ledger

Transactions

Withdrawals

Admin dashboard

Security/RLS

Responsive/mobile optimization

Error/loading states

Final testing

Do not skip database security.

Do not expose secrets.

Do not fake financial transactions.

The application should be structured so that the exact TchokoPay API credentials and endpoints can be connected later without redesigning the application.

Start by creating the complete application foundation and UI, database schema, authentication, referral architecture, and secure payment integration structure.

read from Tchokopay docs:  https://docs.tchokopay.com/

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://green-refer-cash.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/27f7580a-d6af-45a7-9546-ba56b1916cbe).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
