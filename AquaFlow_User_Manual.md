# AquaFlow — Water Delivery Management System
## User Manual & Verification Guide
**Version 1.0 · May 2026**

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
3. [Super Admin & Admin Guide](#3-super-admin--admin-guide)
4. [Staff / Driver Guide](#4-staff--driver-guide)
5. [Customer Guide](#5-customer-guide)
6. [Verification & Testing Checklist](#6-verification--testing-checklist)
7. [Troubleshooting](#7-troubleshooting)
8. [Quick Reference — URL Directory](#8-quick-reference--url-directory)

---

## 1. Introduction

AquaFlow is a full-stack Water Delivery Management System for water delivery businesses. It handles customer orders, inventory, driver dispatching, POS counter sales, and financial reporting — all from a single web app accessible on desktop and mobile.

### 1.1 System Roles

The system has four distinct roles. Each role determines which screens and actions are available.

| Role | Who Uses It | Primary Purpose |
|---|---|---|
| **Super Admin** | Business owner / IT administrator | Full system control: users, settings, reports, all operations |
| **Admin** | Operations manager | Day-to-day management: orders, deliveries, inventory, customers |
| **Staff / Driver** | Delivery drivers & counter staff | Process POS sales, manage own deliveries, view assigned orders |
| **Customer** | End customers | Place water orders online, track own order history |

### 1.2 How to Access

- Open your browser and go to your AquaFlow URL (e.g. `https://aquaflow.example.com`)
- The app is installable as a mobile PWA — tap **Share → Add to Home Screen** (iOS) or the install prompt (Android)
- Log in with the email and password provided by your administrator
- New customers can self-register via the **Create account** link on the login page

### 1.3 Browser & Device Support

- Chrome, Edge, Firefox, Safari (latest versions)
- Desktop/laptop — recommended for Admin and Super Admin
- Mobile phone/tablet — recommended for Staff/Driver and Customer

---

## 2. Getting Started

### 2.1 Logging In

1. Open the AquaFlow URL in your browser.
2. Enter your **Email address** and **Password**.
3. Click **Sign in**.
4. You are automatically redirected to the correct home screen for your role.

> **Tip:** Forgot your password? Click **Forgot password?** on the login page. A reset link will be sent to your email.

| Your Role | You Are Taken To |
|---|---|
| Super Admin | `/dashboard` — full admin dashboard with revenue, orders, deliveries stats |
| Admin | `/dashboard` — same admin dashboard |
| Staff | `/dashboard` — today's delivery summary |
| Customer | `/order` — product catalog to place a new order |

### 2.2 Navigating the Sidebar

After login, a sidebar appears on the left. Menu items shown depend on your role — you will only see pages you are permitted to access.

| Menu Item | Super Admin | Admin | Staff | Customer |
|---|:---:|:---:|:---:|:---:|
| Dashboard | ✓ | ✓ | ✓ | — |
| Orders (admin view) | ✓ | ✓ | ✓ | — |
| Inventory | ✓ | ✓ | ✓ | — |
| POS (Point of Sale) | ✓ | ✓ | ✓ | — |
| Deliveries | ✓ | ✓ | — | — |
| Customers | ✓ | ✓ | — | — |
| Reports | ✓ | ✓ | — | — |
| Settings | ✓ | — | — | — |
| My Deliveries (driver) | — | — | ✓ | — |
| Order Water | — | — | — | ✓ |
| My Orders | — | — | — | ✓ |

### 2.3 Your Profile

Click your name in the top-right corner to go to the **Profile** page where you can:

- Update your full name
- Change your password
- Verify your phone number via OTP
- Add or remove delivery addresses (customers)

---

## 3. Super Admin & Admin Guide

Super Admins and Admins share the same dashboard and most features. Super Admins additionally control system-wide settings such as user management, tax rates, and business information.

### 3.1 Dashboard (`/dashboard`)

**Roles:** Super Admin, Admin, Staff

The admin/super_admin dashboard shows:

- **Today's Revenue** — total sales for the day with a mini sparkline chart
- **Pending Orders** — orders waiting to be processed or assigned
- **Unassigned Deliveries** — deliveries not yet linked to a driver
- **Low Stock Products** — items in inventory below the set threshold
- **Outstanding Dues** — unpaid balances from credit customers

The Staff dashboard shows today's assigned delivery cards.

---

### 3.2 Orders (`/orders`)

**Roles:** Super Admin, Admin, Staff

#### Filtering & Searching

- Use the **search box** to find orders by order number, customer name, or phone
- Filter by **Status**: Pending, Processing, Out for Delivery, Delivered, Cancelled
- Filter by **Payment Status**: Unpaid, Paid, Partial, Credit
- Filter by **Date** range

#### Order Actions

| Action | Who Can Do It | How |
|---|---|---|
| View order detail | All staff roles | Click the order row or order number |
| Update order status | Super Admin, Admin | Open order detail → click new status button |
| Record payment | Super Admin, Admin, Staff | Open order detail → Payment section → Record Payment |
| Cancel order | Super Admin, Admin | Open order detail → Cancel Order → enter reason |

> **Note:** Cancelling an order requires a cancellation reason, which is stored permanently for audit purposes.

---

### 3.3 Deliveries (`/deliveries`)

**Roles:** Super Admin, Admin

The Deliveries page shows a **Kanban board** with columns for each delivery status: Pending, Assigned, Dispatched, Delivered, Failed.

#### Assigning a Driver

1. Find the delivery card in the **Pending** column.
2. Click **Assign Driver** on the card.
3. Select a driver from the dropdown (shows active Staff members).
4. Click **Assign**. The card moves to the Assigned column.

#### Filtering Deliveries

- **By Date** — see deliveries scheduled for a specific day
- **By Driver** — see all deliveries assigned to one driver
- **By Zone** — see deliveries for a specific delivery zone

#### Delivery Statuses

| Status | Meaning |
|---|---|
| Pending | Order created, no driver assigned yet |
| Assigned | Driver assigned, not yet picked up |
| Dispatched | Driver has picked up the delivery |
| Delivered | Successfully delivered to customer |
| Failed | Delivery attempted but failed (reason recorded) |

---

### 3.4 Inventory (`/inventory`)

**Roles:** Super Admin, Admin (manage); Staff (view only)

#### Product Management

- Add new products with name, description, price, and stock quantity
- Edit existing products (Super Admin and Admin only)
- Set a **low-stock threshold** — a banner alerts when stock falls below this level

#### Stock Operations

| Operation | Who | Purpose |
|---|---|---|
| Stock In | Super Admin, Admin | Record incoming stock (purchases / refills) |
| Stock Adjust | Super Admin, Admin | Manual corrections for losses, damage, stock count |
| Bottle Returns | Super Admin, Admin, Staff | Record empty bottles returned by customers |
| Transaction Log | Super Admin, Admin | Full history of all stock movements |

---

### 3.5 Point of Sale (`/pos`)

**Roles:** Super Admin, Admin, Staff

The POS terminal is used for walk-in and counter sales.

#### Making a Sale

1. From the product grid, click a product to add it to the cart.
2. Adjust quantities using **+** / **−** buttons in the cart.
3. *(Optional)* Search for and attach a customer to the sale.
4. Click **Checkout** to open the payment modal.
5. Select payment method: Cash, Online Transfer, or Credit.
6. Enter amount received and click **Complete Sale**.

#### Discounts & Voids

- **Apply Discount** — Super Admin and Admin only. Enter discount amount or percentage before checkout.
- **Void Transaction** — Super Admin and Admin only. Cancel a completed POS transaction.

> **Note:** Credit sales are recorded against the customer's account. Outstanding dues appear on the Dashboard and Reports.

---

### 3.6 Customers (`/customers`)

**Roles:** Super Admin, Admin

#### Customer List Actions

- Search customers by name or phone number
- Toggle **Active / Inactive** status to enable or disable an account
- Click a customer row to open their detail page

#### Customer Detail Page (`/customers/[id]`)

- **Profile** — contact information
- **Addresses** — list of all saved delivery addresses
- **Bottle Ledger** — running count of bottles issued vs. returned
- **Recent Orders** — last 10 orders with status and payment info

---

### 3.7 Reports & Analytics (`/reports`)

**Roles:** Super Admin, Admin

#### Available Reports

| Report | What It Shows |
|---|---|
| Revenue Chart | Daily revenue over 7, 30, or 90 days (bar chart) |
| Order Volume | Number of orders over the selected period |
| Top Customers | Highest-spending customers by total order value |
| Product Breakdown | Sales quantity and revenue by product |
| Outstanding Dues | Customers with unpaid credit balances |

#### Exporting Data

- Click **Export CSV** to download the current orders as a spreadsheet
- Use the date range picker to select 7 days, 30 days, or 90 days before exporting

---

### 3.8 Settings (`/settings`)

**Roles:** Super Admin only (Zones and Time Slots also accessible by Admin)

#### Business Information (`/settings/business`)

Update business name, phone number, address, and currency.

#### Delivery Zones (`/settings/zones`)

- Add, edit, or delete delivery zones
- Set a delivery fee for each zone

#### Time Slots (`/settings/time-slots`)

- Create delivery time windows (e.g. 9 AM–12 PM, 2 PM–5 PM)
- Enable or disable specific slots to control when customers can book

#### User Management (`/settings/users`) — Super Admin only

- Create new Staff and Admin accounts
- Deactivate staff accounts that are no longer in use
- Roles are synced automatically — no manual JWT edits required

#### Payment Methods (`/settings/payment-methods`)

- Toggle Cash, Online Transfer, and Credit as available payment options
- Set the default delivery fee applied to all orders

---

## 4. Staff / Driver Guide

Staff members primarily handle two things: processing counter sales via POS and completing assigned deliveries on the road. Staff can also view and search all orders.

### 4.1 Dashboard (`/dashboard`)

The Staff dashboard shows all deliveries assigned to you for today, sorted by time slot. Each card shows:

- Customer name and delivery address
- Delivery time slot
- Current delivery status
- A quick link to the delivery detail page

### 4.2 Orders (`/orders`)

Staff can view and search the orders list to help customers with queries, and can record payment on an order.

> **Note:** Staff cannot cancel orders or change order status. Only Admins and Super Admins can do that.

### 4.3 Point of Sale (`/pos`)

Staff have full access to the POS terminal for counter sales. See [Section 3.5](#35-point-of-sale-pos) for the full guide.

> Staff cannot apply discounts or void transactions.

### 4.4 My Deliveries (`/my-deliveries`)

This is the primary screen for drivers on the road. It shows your assigned deliveries for today sorted by time slot.

#### Delivery Workflow

1. Open **My Deliveries** from the sidebar.
2. Tap a delivery card to open the detail page.
3. Review customer address, contact details, and order items.
4. Tap **Start Delivery** when you leave to deliver this order.
5. On arrival, tap **Complete Delivery**.
6. Enter the number of **empty bottles collected** from the customer.
7. **Record any payment** collected (if the order is unpaid or partially paid).
8. Tap **Confirm** to mark the delivery as Delivered.

#### Failed Deliveries

1. If you cannot complete a delivery, tap **Mark as Failed**.
2. Enter the reason for failure (e.g., customer not home, wrong address).
3. Tap **Confirm**. The delivery moves to Failed status on the admin board.

> **Important:** Always record bottle collection accurately. The bottle ledger on each customer's profile depends on this data.

---

## 5. Customer Guide

Customers use AquaFlow to browse products, place water delivery orders, and track order history. The customer interface is optimised for mobile phones.

### 5.1 Creating an Account

1. Open the AquaFlow URL in your browser.
2. Click **Create account** on the login page.
3. Enter your Full Name, Email, Phone Number, and Password.
4. Click **Register**.
5. You will receive a welcome email confirming your registration.

> After registration you can verify your phone number — tap the prompt on your dashboard or go to **Profile → Verify Phone**.

### 5.2 Placing an Order (`/order`)

The ordering process is a simple multi-step flow:

| Step | What You Do |
|---|---|
| **1. Browse Products** | The catalog shows all available water products with prices. Tap **+** to add items to your cart. |
| **2. Review Cart** | A drawer slides up showing your selected items. Adjust quantities or remove items. Tap **Checkout** when ready. |
| **3. Select Delivery** | Choose your delivery date and time slot. Select your delivery address (or add a new one). |
| **4. Choose Payment** | Select your payment method: Cash on Delivery, Online Transfer, or Credit (if enabled). |
| **5. Confirm Order** | Review your order summary and tap **Place Order**. You will receive a confirmation email. |

> **Tip:** You must have at least one saved delivery address to complete checkout. Add addresses from **Profile → Manage Addresses**.

### 5.3 Tracking Your Orders (`/my-orders`)

The My Orders page shows all your past and current orders.

- Each card shows: order number, date, items ordered, total amount, and current status
- Tap an order to open the full receipt with a status timeline
- The status timeline shows: **Order Placed → Processing → Out for Delivery → Delivered**

#### Order Receipt Page (`/my-orders/[id]`)

- Full itemised breakdown of your order
- Delivery information: date, time slot, and assigned driver name
- Payment status and breakdown
- **Re-order** button to quickly order the same items again

### 5.4 Managing Your Profile (`/profile`)

#### Updating Personal Information

1. Click your name in the top-right corner.
2. Edit your Full Name and click **Save**.

#### Changing Your Password

1. Go to **Profile**.
2. Scroll to **Change Password**.
3. Enter your current password, then your new password twice.
4. Click **Update Password**.

#### Managing Delivery Addresses

- Click **Add Address** to add a new delivery location
- Enter address line, city, and any delivery notes
- Click the trash icon next to an address to remove it

> You need at least one saved address to place an order. Your first address becomes the default.

---

## 6. Verification & Testing Checklist

Use this checklist to verify that all key functions are working correctly after deployment or a system update. Run through each section with a test account for that role.

### 6.1 Authentication Tests

| # | Test | Role | Steps | Expected Result |
|---|---|---|---|---|
| 1 | Customer login redirect | Customer | Log in with a customer account | Redirected to `/order` (product catalog) |
| 2 | Admin login redirect | Admin / Super Admin | Log in with admin account | Redirected to `/dashboard` |
| 3 | Staff login redirect | Staff | Log in with staff account | Redirected to `/dashboard` (delivery list) |
| 4 | Customer cannot access `/orders` | Customer | Type `/orders` in URL bar while logged in as customer | Redirected to `/order` |
| 5 | Staff cannot access `/customers` | Staff | Type `/customers` while logged in as staff | Redirected to `/dashboard` |
| 6 | Unauthenticated redirect | None | Open `/dashboard` without logging in | Redirected to `/login?redirect=/dashboard` |
| 7 | Forgot password email | Any | Click Forgot password, enter email, submit | Reset email received within 60 seconds |

### 6.2 Customer Workflow Tests

| # | Test | Steps | Expected Result |
|---|---|---|---|
| 1 | Place a new order | Log in as customer → `/order` → add 2 products → Checkout → select date & slot → choose Cash → Place Order | Confirmation email received; order appears in `/my-orders` with status Pending |
| 2 | View order history | Go to My Orders | List of all past orders displayed with status badges |
| 3 | Open order receipt | Click any order in My Orders | Full receipt page with items, delivery info, and payment status |
| 4 | Add delivery address | Profile → Add Address → fill form → Save | New address appears in list and is selectable at checkout |
| 5 | Phone OTP verification | Profile → Verify Phone → enter phone → Send OTP → enter code | Phone marked as verified |

### 6.3 Staff / Driver Workflow Tests

| # | Test | Steps | Expected Result |
|---|---|---|---|
| 1 | View today's deliveries | Log in as staff → Dashboard or My Deliveries | List of deliveries for today sorted by time slot |
| 2 | Start a delivery | My Deliveries → tap delivery card → tap Start Delivery | Delivery status changes to Dispatched |
| 3 | Complete a delivery | On delivery detail → Complete Delivery → enter bottles returned → record payment → Confirm | Status changes to Delivered; bottle count updated on customer profile |
| 4 | Fail a delivery | On delivery detail → Mark as Failed → enter reason → Confirm | Status changes to Failed; reason visible to admin on Deliveries board |
| 5 | POS sale | POS → add product to cart → Checkout → Cash → Complete Sale | Sale recorded; cart clears; success message shown |
| 6 | View orders list | Go to `/orders` | Order list visible with search and filter controls |

### 6.4 Admin Workflow Tests

| # | Test | Steps | Expected Result |
|---|---|---|---|
| 1 | Dashboard stats load | Log in as admin → Dashboard | Revenue, pending orders, unassigned deliveries, low stock cards all visible |
| 2 | Assign delivery driver | Deliveries → find Pending card → Assign Driver → select staff → Assign | Card moves to Assigned column; driver name shown on card |
| 3 | Update order status | Orders → open an order → change status to Processing | Status badge updates; status history recorded |
| 4 | Record payment | Orders → open unpaid order → Record Payment → enter amount → Save | Payment status updates; outstanding balance recalculates |
| 5 | Cancel order | Orders → open order → Cancel Order → enter reason → Confirm | Order status becomes Cancelled; reason stored |
| 6 | Add inventory stock | Inventory → Stock In → select product → enter quantity → Save | Product stock count increases by entered amount |
| 7 | View customer detail | Customers → click a customer row | Profile, addresses, bottle ledger, recent orders all visible |
| 8 | Run financial report | Reports → set date range to 30 days | Revenue chart, order volume, top customers, product breakdown rendered |

### 6.5 Super Admin Workflow Tests

| # | Test | Steps | Expected Result |
|---|---|---|---|
| 1 | Create staff account | Settings → Users → Create User → enter name, email, role: Staff → Save | New user created; they can log in with credentials provided |
| 2 | Deactivate user | Settings → Users → find user → toggle to Inactive | User is deactivated; they cannot log in |
| 3 | Update business info | Settings → Business → edit name/phone → Save | Details updated and reflected in email templates |
| 4 | Add delivery zone | Settings → Zones → Add Zone → enter name and delivery fee → Save | New zone appears in zone list and is selectable at checkout |
| 5 | Add time slot | Settings → Time Slots → Add Slot → enter label and times → Enable → Save | Slot appears in customer order flow |
| 6 | Toggle payment method | Settings → Payment Methods → disable Online Transfer → Save | Online Transfer no longer appears as option at customer checkout |
| 7 | Export orders CSV | Reports → Export CSV | CSV file downloaded with all orders for the selected date range |

---

## 7. Troubleshooting

| Problem | Likely Cause | Solution |
|---|---|---|
| Clicking a sidebar link redirects me to a wrong page | Account role may not be set correctly in the database | Contact your Super Admin to verify your role in Settings → Users |
| I cannot see the Orders menu item | You are logged in as a Customer | Customer accounts use **My Orders** instead. Check your role. |
| Forgot password email not received | Email may be in spam, or address was mistyped | Check your spam folder. Re-enter your email carefully. Contact admin if issue persists. |
| Delivery time slots are not showing at checkout | All time slots may be disabled by admin | Contact your Super Admin to enable slots in Settings → Time Slots |
| Cannot complete delivery (button missing) | The delivery may not be assigned to your account | Check with your manager that the delivery is assigned to your staff account |
| POS checkout button is greyed out | Cart is empty | Ensure at least one product is in the cart before tapping Checkout |
| Reports page shows no data | No orders exist in the selected date range | Widen the date range (try 90 days) or verify orders have been placed |
| App asks me to install / add to home screen | PWA install prompt is showing | This is optional. Tap Install for quicker mobile access, or dismiss it. |
| Session expired / logged out unexpectedly | Authentication session timed out | Log in again. Sessions expire after 24 hours of inactivity. |

### 7.1 Contacting Support

If you encounter an issue not covered in this manual:

- Contact your **Super Admin** or system administrator first
- Provide: your email address, the page you were on, and what happened
- For technical issues, the Super Admin can check the server logs for error details

---

## 8. Quick Reference — URL Directory

| URL Path | Who Can Access | Purpose |
|---|---|---|
| `/login` | Everyone | Sign in to the system |
| `/register` | Everyone | Create a new customer account |
| `/forgot-password` | Everyone | Request a password reset email |
| `/dashboard` | Super Admin, Admin, Staff | Business stats (admin) or today's deliveries (staff) |
| `/orders` | Super Admin, Admin, Staff | View and search all customer orders |
| `/orders/[id]` | Super Admin, Admin, Staff | Order detail, status, payment, cancel |
| `/deliveries` | Super Admin, Admin | Kanban delivery board — assign drivers, track status |
| `/my-deliveries` | Staff | Driver's assigned deliveries for today |
| `/my-deliveries/[id]` | Staff | Delivery detail — start, complete, fail, collect payment |
| `/inventory` | Super Admin, Admin, Staff | Product list and stock management |
| `/pos` | Super Admin, Admin, Staff | Point of Sale terminal for counter sales |
| `/customers` | Super Admin, Admin | Customer list with search and active toggle |
| `/customers/[id]` | Super Admin, Admin | Customer profile, addresses, bottle ledger, orders |
| `/reports` | Super Admin, Admin | Financial reports, analytics, CSV export |
| `/settings/business` | Super Admin | Business name, phone, address, currency |
| `/settings/zones` | Super Admin, Admin | Delivery zones and fees |
| `/settings/time-slots` | Super Admin, Admin | Delivery time slots |
| `/settings/users` | Super Admin | Create and manage staff/admin accounts |
| `/settings/payment-methods` | Super Admin | Toggle payment methods and delivery fee |
| `/order` | Customer | Product catalog — place a new water delivery order |
| `/my-orders` | Customer | View own order history |
| `/my-orders/[id]` | Customer | Order receipt with timeline and re-order button |
| `/profile` | All roles | Edit name, password, phone OTP, manage addresses |

---

*AquaFlow User Manual · Version 1.0 · May 2026 · Confidential*
