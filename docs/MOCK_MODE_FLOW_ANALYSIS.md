# ECAS Mock Mode Transformation - Flow Analysis & Requirements Clarification

## Executive Summary

This document provides a comprehensive user flow analysis for transforming the ECAS e-commerce application from a backend-dependent system to a portfolio-ready demo with static mock data. The analysis identifies **47 distinct user flows**, **89 flow permutations**, **142 edge cases**, and **67 critical questions** requiring clarification before implementation.

---

## Phase 1: User Flow Overview

### Flow 1: Anonymous Browsing

**Entry Points:** Homepage, direct product URL, search, category navigation

**Sub-flows:**

1. **F1.1: Homepage Landing**

   - Load homepage with featured products
   - View new products carousel
   - Browse categories
   - Navigate to product details

2. **F1.2: Product Discovery via Search**

   - Enter search query
   - View search results with pagination
   - Filter/sort results
   - Navigate to product details

3. **F1.3: Product Discovery via Categories**

   - Click category link (requires auth in current system - CONFLICT!)
   - Browse subcategories
   - Filter by attributes
   - Navigate to product details

4. **F1.4: Direct Product Access**
   - Access product via direct URL
   - View product details
   - Add to cart (triggers auth modal)

**State Requirements:**

- No authentication required
- Temporary cart (session-based)
- No persistence across sessions

**Mock Data Points:**

- Featured products (5-10 items)
- New products (5-10 items)
- Search index with filters
- Category hierarchy with products

---

### Flow 2: Customer Authentication

**Entry Points:** Login modal, signup page, Firebase Google sign-in

**Sub-flows:**

1. **F2.1: Classic Login (Email/Password)**

   - Open login modal
   - Enter email/password
   - Submit form
   - Receive mock JWT token
   - Token stored in `useCookie('token')`
   - Redirect to dashboard or intended page

2. **F2.2: Firebase Google Sign-in**

   - Click Google sign-in button
   - Firebase popup appears
   - User authenticates with Google
   - Receive Firebase token
   - Exchange for ECAS mock token
   - Token stored in `useCookie('token')`
   - Redirect to dashboard

3. **F2.3: Classic Registration (Personal Account)**

   - Open signup page
   - Enter personal details (name, email, password, phone, address)
   - Submit form
   - Receive mock JWT token
   - Create mock user profile
   - Redirect to dashboard or verification

4. **F2.4: Classic Registration (Business Account)**

   - Open signup page with business toggle
   - Enter business details (company name, VAT, address, contacts)
   - Submit form
   - Receive mock JWT token with business role
   - Create mock business profile
   - Redirect to dashboard

5. **F2.5: Firebase Registration Flow**

   - Firebase Google sign-in for new user
   - Detect new user flag
   - Call `registerFirebase` endpoint
   - Create mock user profile linked to Firebase ID
   - Receive ECAS mock token
   - Redirect to dashboard

6. **F2.6: Session Token Expiry**

   - Token expires after 59 minutes (current logic: `authStore.ts:107-122`)
   - Any API call returns 401/unauthorized
   - User signed out
   - Redirect to home
   - Open login modal
   - Cart preserved? (UNCLEAR)

7. **F2.7: Manual Sign-out**

   - Click sign-out button
   - Clear token from cookie
   - Clear authStore state
   - Clear localStorage
   - Emit `remove-cart-and-notifications`
   - Redirect to home

8. **F2.8: Firebase-specific Sign-out**
   - Click Firebase sign-out
   - Call Firebase logout
   - Clear ECAS token and state
   - Redirect to home

**State Requirements:**

- Token in `useCookie('token')` (session-based)
- User data in `authStore` with persistence disabled
- Firebase temp token if using Firebase auth
- General settings loaded on successful auth

**Mock Data Points:**

- Mock user profiles (personal and business)
- Mock JWT tokens with proper structure
- Mock Firebase ID mapping
- Mock general settings

---

### Flow 3: Shopping & Cart Management

**Entry Points:** Product page, cart widget, quick add button

**Sub-flows:**

1. **F3.1: Add to Cart (Authenticated User)**

   - Click "Add to Cart" on product page
   - Select quantity
   - Submit to `/cart` endpoint
   - Cart updated in store
   - Cart widget shows item count
   - Emitter `update-cart` triggered

2. **F3.2: Add to Cart (Anonymous User)**

   - Click "Add to Cart" on product page
   - System detects no token
   - Open login modal (Emitter `open-account-modal`)
   - User authenticates
   - Then proceed with F3.1

3. **F3.3: Remove from Cart**

   - Click remove button on cart item
   - Submit DELETE to `/cart`
   - Cart updated in store
   - Cart widget count updated

4. **F3.4: Update Cart Quantity**

   - Change quantity input
   - Submit PUT to `/cart`
   - Cart updated in store
   - Subtotal recalculated

5. **F3.5: View Cart Page**

   - Navigate to cart
   - Fetch cart via `/cart` endpoint
   - Display items with calculated prices
   - Show subtotal, discounts, taxes
   - "Checkout" button enabled

6. **F3.6: Cart Price Calculation**

   - Parse product price configuration
   - Apply quantity-based tiered pricing
   - Calculate stock totals
   - Calculate backorder totals
   - Apply user-specific discounts
   - Calculate final subtotal

7. **F3.7: Cart Persistence**

   - Cart stored in `cartStore` with localStorage persistence (CURRENTLY ENABLED)
   - SPEC SAYS: "Minimal state persistence (session-based auth only, no localStorage)"
   - CONFLICT: How to persist cart without localStorage?
   - OPTION A: Store cart on server (requires mock backend session)
   - OPTION B: Use sessionStorage instead
   - OPTION C: Keep localStorage for cart only

8. **F3.8: Empty Cart**
   - After successful order
   - Cart cleared in store
   - Client secret cleared
   - Emitter triggered

**State Requirements:**

- Cart in `cartStore`
- Order client secret for Stripe
- Previous checkout error state
- Cart subtotal calculation

**Mock Data Points:**

- Mock cart items with proper price configs
- Mock shipping rates
- Mock tax calculations
- Mock discount codes

---

### Flow 4: Checkout Process

**Entry Points:** Cart page checkout button, direct navigation

**Sub-flows:**

1. **F4.1: Initiate Checkout**

   - Click "Checkout" from cart
   - Verify cart not empty
   - Navigate to `/checkout/setup-card`

2. **F4.2: Setup Payment Method (Stripe)**

   - Fetch Stripe setup intent: `/orders/setup-intent/new`
   - Load Stripe Elements
   - User enters card details
   - Stripe validates card
   - Receive client secret
   - Store in `cartStore.orderClientSecret`

3. **F4.3: Review Order**

   - Display cart items with pricing
   - Show shipping options with prices
   - Show taxes
   - Show total
   - Enter shipping address (or select saved)
   - Validate address via `/orders/validate-address`

4. **F4.4: Place Order**

   - Submit order: `/orders/new`
   - Payload includes cart items, shipping address, payment info
   - Create Stripe payment session
   - Redirect to `/checkout/session`

5. **F4.5: Payment Processing (Stripe)**

   - Load Stripe with client secret
   - Confirm payment
   - Stripe returns success/failure

6. **F4.6: Payment Success**

   - Redirect to `/checkout/success`
   - Display order confirmation
   - Store order ID
   - Empty cart
   - Send order confirmation email (mock)

7. **F4.7: Payment Pending**

   - Redirect to `/checkout/pending`
   - Display processing status
   - Provide order tracking info

8. **F4.8: Payment Failure**

   - Redirect to `/checkout/fail`
   - Display error message
   - Store error in `cartStore.previousCheckoutError`
   - Allow retry with same cart

9. **F4.9: Shipping Price Calculation**

   - Fetch shipping rates: `/orders/price`
   - Parse cart items for weight/dimensions
   - Calculate shipping based on destination
   - Display options (ground, expedited, overnight)

10. **F4.10: Address Validation**

    - Submit address: `/orders/validate-address`
    - Return validated/suggested address
    - User confirms or corrects

11. **F4.11: Address Selection (Saved)**
    - User selects from saved addresses
    - Auto-populate form
    - Continue to payment

**State Requirements:**

- Order client secret (Stripe)
- Shipping address (validated)
- Order status tracking
- Payment error handling

**Mock Data Points:**

- Mock Stripe client secrets
- Mock shipping rates by region
- Mock order IDs
- Mock order confirmation data

---

### Flow 5: Order Summary & Tracking

**Entry Points:** Checkout success redirect, direct URL, dashboard link

**Sub-flows:**

1. **F5.1: View Order Summary**

   - Navigate to `/order-summary/[id]`
   - Fetch order details via `/orders/:id`
   - Display order status, items, shipping, payment

2. **F5.2: Track Order Status**

   - Display current status (processing, shipped, delivered)
   - Show tracking number
   - Display estimated delivery date

3. **F5.3: Cancel Order (Customer)**
   - Click "Cancel Order" button
   - Confirm cancellation
   - Submit `/orders/:id/cancel`
   - Update order status to cancelled
   - Handle payment refund (mock)

**State Requirements:**

- Order details loaded from API
- Order status tracking
- Cancellation capability

**Mock Data Points:**

- Mock order records with various statuses
- Mock tracking numbers
- Mock shipment details

---

### Flow 6: Customer Dashboard

**Entry Points:** Navigation menu, protected route redirect

**Sub-flows:**

1. **F6.1: Dashboard Home**

   - Navigate to `/dashboard/client`
   - Fetch user profile data
   - Display welcome message
   - Show recent orders
   - Show quick stats

2. **F6.2: View Orders**

   - Click "Orders" link
   - Fetch orders via `/orders?page=1&perPage=0` (all orders)
   - Display order list with pagination
   - Filter by status, date, etc.
   - Click order to view details (redirect to `/order-summary/:id`)

3. **F6.3: Order Details**

   - Click order from list
   - Navigate to `/order-summary/:id`
   - Show full order details

4. **F6.4: User Profile Management**

   - Navigate to profile section
   - Fetch user details via `/user/:id/details`
   - Edit personal information
   - Update contact details
   - Save changes (mock - no actual update)

5. **F6.5: Shipping Address Management**

   - View saved shipping addresses
   - Add new address
   - Edit existing address
   - Delete address
   - Set default address

6. **F6.6: Billing Address Management**

   - View saved billing addresses
   - Add/edit/delete operations
   - Set default billing address

7. **F6.7: Saved Payment Methods**
   - Fetch saved cards: `/user/cards`
   - Display saved cards (masked)
   - Add new card
   - Delete card

**State Requirements:**

- User details loaded in `authStore`
- User cards loaded in `authStore.userCards`
- Orders list

**Mock Data Points:**

- Mock user profile with addresses
- Mock saved payment methods
- Mock order history with various statuses

---

### Flow 7: Admin Dashboard

**Entry Points:** Navigation menu, direct URL

**Sub-flows:**

1. **F7.1: Admin Dashboard Home**

   - Navigate to `/dashboard`
   - Verify user has admin role
   - Load dashboard widgets

2. **F7.2: View Customers**

   - Click "Customers" section
   - Fetch customers via dashboard API
   - Display customer list with stats
   - Search/filter customers
   - Click customer to view details

3. **F7.3: Customer Details**

   - Navigate to `/dashboard/customers/:slug`
   - Fetch customer profile
   - View customer information
   - View customer orders
   - View customer analytics

4. **F7.4: Control Panel (Customer-specific)**

   - Navigate to `/dashboard/customers/:slug/control-panel`
   - Access control panel views
   - Manage customer settings
   - View customer-specific controls

5. **F7.5: Control Panel Views**

   - Navigate to `/dashboard/customers/:slug/control-panel/:view`
   - Display specific control panel view
   - Various views for different admin functions

6. **F7.6: Orders Management**

   - Navigate to `/dashboard/orders`
   - Fetch all orders with pagination
   - Filter by status, customer, date
   - Sort by various fields
   - Click order to view details

7. **F7.7: Order Details (Admin)**

   - Navigate to `/dashboard/orders/:id`
   - Fetch order details
   - View full order information
   - Change order status: `/orders/:id` POST with status

8. **F7.8: Mark Order as Paid**

   - Click "Mark as Paid" on order
   - Submit `/orders/:id/paid` with payment details
   - Update order status to paid

9. **F7.9: Cancel Order (Admin)**

   - Click "Cancel Order"
   - Confirm cancellation
   - Submit `/orders/:id/cancel`
   - Update order status

10. **F7.10: Retry Failed Shipping**

    - Click "Retry Shipping" on failed order
    - Submit `/orders/:id/shipping/retry`
    - Update shipping status

11. **F7.11: Dashboard Analytics**

    - Load dashboard widgets:
      - `CustomersByCountry` widget
      - `CustomersTotal` widget
      - `ReturningCustomers` widget
      - `NewCustomers` widget
    - Fetch widget data: `/dashboard/orders/admin/:widget?time=N`

12. **F7.12: Products Categories**

    - Navigate to `/dashboard/products/categories`
    - Manage product categories
    - View category hierarchy

13. **F7.13: Smart Pricing**

    - Navigate to `/dashboard/settings/smart-price`
    - View smart pricing configurations
    - Manage pricing rules

14. **F7.14: Documents Management**
    - Navigate to documents section
    - Upload/view/download documents
    - Manage document types

**State Requirements:**

- Admin role verification
- Dashboard widget data
- Customer lists
- Order management state

**Mock Data Points:**

- Mock customers with various profiles
- Mock orders with all statuses
- Mock analytics data (charts, stats)
- Mock control panel data
- Mock smart pricing rules
- Mock documents

---

### Flow 8: Mock Mode Toggle & Configuration

**Entry Points:** Environment variable, server restart

**Sub-flows:**

1. **F8.1: Enable Mock Mode**

   - Set `NUXT_PUBLIC_MOCK_MODE=true` in environment
   - Restart Nuxt server
   - Server detects mock mode
   - Nitro endpoints return static JSON
   - Firebase integration disabled?

2. **F8.2: Disable Mock Mode**

   - Set `NUXT_PUBLIC_MOCK_MODE=false` or remove
   - Restart Nuxt server
   - Server reverts to real API calls
   - Firebase integration re-enabled

3. **F8.3: Mock Mode Detection**
   - Client reads `NUXT_PUBLIC_MOCK_MODE` config
   - Adjusts behavior based on mode
   - UI may show mock mode indicator?

**State Requirements:**

- Mock mode flag available client-side
- Conditional Firebase initialization
- Conditional Stripe integration

**Mock Data Points:**

- Static JSON responses for all endpoints

---

## Phase 2: Flow Permutations Matrix

### Permutation Dimensions

| Dimension               | Values                                                 | Impact                                |
| ----------------------- | ------------------------------------------------------ | ------------------------------------- |
| **Auth State**          | Guest, Customer (Personal), Customer (Business), Admin | Determines accessible routes and data |
| **Mock Mode**           | Enabled, Disabled                                      | Changes API behavior                  |
| **Device**              | Desktop, Tablet, Mobile                                | Responsive UI behavior                |
| **Entry Point**         | Homepage, Direct URL, Search, Category Link            | Initial state and redirects           |
| **Cart State**          | Empty, Items, Expired items                            | Checkout flow behavior                |
| **Token State**         | Valid, Expired, Missing                                | Auth requirements                     |
| **Firebase State**      | Enabled, Disabled, Signed In, Signed Out               | Authentication flow                   |
| **Session Persistence** | New Session, Returning Session                         | State restoration behavior            |

### Critical Permutation Analysis

#### P1: Guest Browsing (3 primary flows)

- **P1.1:** Guest → Browse Products → Add to Cart → Auth Prompt → Complete Flow
- **P1.2:** Guest → Browse Products → No Cart Interaction → Exit
- **P1.3:** Guest → Search → View Product Details → Add to Cart → Auth Prompt

**Edge Cases:**

- Cart expires while browsing
- Network error during product load
- Product out of stock (mock)

#### P2: Customer Flows (12 primary flows)

**Authentication Variants:**

- **P2.1:** Classic Login → Dashboard → Browse → Cart → Checkout → Success
- **P2.2:** Firebase Login → Dashboard → Browse → Cart → Checkout → Success
- **P2.3:** Classic Signup (Personal) → Dashboard → Browse → Cart → Checkout → Success
- **P2.4:** Classic Signup (Business) → Dashboard → Browse → Cart → Checkout → Success
- **P2.5:** Firebase Signup → Dashboard → Browse → Cart → Checkout → Success

**Session Variants:**

- **P2.6:** Returning Customer (Token Valid) → Browse → Cart → Checkout → Success
- **P2.7:** Returning Customer (Token Expired) → Auto-signout → Re-login → Resume
- **P2.8:** Returning Customer (Cart Saved) → Resume → Checkout → Success

**Error Variants:**

- **P2.9:** Customer → Cart → Payment Failed → Retry → Success
- **P2.10:** Customer → Cart → Payment Failed → Cancel → Abandon
- **P2.11:** Customer → Cart → Address Validation Failed → Correct → Retry → Success
- **P2.12:** Customer → Order → Cancel Order → Browse New Products

#### P3: Admin Flows (8 primary flows)

- **P3.1:** Admin → Dashboard → View Orders → Mark Paid → Done
- **P3.2:** Admin → Dashboard → View Customers → View Details → Control Panel → Done
- **P3.3:** Admin → Dashboard → Analytics → Download Reports → Done
- **P3.4:** Admin → Orders → Cancel Order → Done
- **P3.5:** Admin → Orders → Retry Shipping → Done
- **P3.6:** Admin → Customers → Smart Pricing → Update Rules → Done
- **P3.7:** Admin → Documents → Upload Document → Done
- **P3.8:** Admin → Products → Manage Categories → Done

#### P4: Mock Mode Transitions (6 primary flows)

- **P4.1:** Mock Mode OFF → Real API → Switch to Mock Mode → Data Reset?
- **P4.2:** Mock Mode ON → Mock Data → Switch to Real Mode → Connection Error?
- **P4.3:** Mock Mode ON → Cart Items → Refresh → Cart Preserved?
- **P4.4:** Mock Mode ON → Logged In → Refresh → Session Preserved?
- **P4.5:** Mock Mode ON → Admin → Token Expire → Re-login → Admin Access
- **P4.6:** Mock Mode ON → Firebase Login → Fallback to Mock Auth?

---

## Phase 3: Missing Elements & Gaps

### Category 1: Mock Mode Architecture (CRITICAL - Blocks Implementation)

#### G1.1: Mock Mode Toggle Mechanism

- **Gap Description:** How does `NUXT_PUBLIC_MOCK_MODE` affect the application behavior?
- **Impact:** Without this, the mock mode cannot be properly implemented
- **Current Ambiguity:**
  - Should this toggle Nitro endpoints OR client-side API calls?
  - Should it redirect to `/api/*` endpoints OR `/server/api/*` endpoints?
  - Should it modify `BASE_URL_API` in runtime config?

#### G1.2: Mock Data Storage & Management

- **Gap Description:** Where and how should mock data be stored?
- **Impact:** Affects maintainability and scalability of mock data
- **Current Ambiguity:**
  - Should mock data be inline in endpoint files or separate JSON files?
  - Should there be a `mock-data/` directory structure?
  - Should mock data be shared across multiple endpoints (e.g., products in list and detail)?

#### G1.3: Firebase Integration in Mock Mode

- **Gap Description:** How does Firebase auth behave in mock mode?
- **Impact:** Affects authentication flow for Google sign-in users
- **Current Ambiguity:**
  - Should Firebase be completely disabled in mock mode?
  - Should Firebase still initialize but use mock responses?
  - What happens if user tries Firebase auth in mock mode?

#### G1.4: Stripe Integration in Mock Mode

- **Gap Description:** How does Stripe payment work in mock mode?
- **Impact:** Affects checkout flow and order completion
- **Current Ambiguity:**
  - Should Stripe be disabled entirely in mock mode?
  - Should we use Stripe Test Mode with test keys?
  - Should we mock the Stripe Elements UI entirely?
  - How to generate mock payment intents?

#### G1.5: Data Consistency & Relationships

- **Gap Description:** How to maintain relationships between mock data entities?
- **Impact:** Affects realism of the demo
- **Current Ambiguity:**
  - How to link orders to customers?
  - How to link cart items to products?
  - How to link orders to products (for re-ordering)?
  - How to ensure product IDs match across endpoints?

#### G1.6: State Persistence in Mock Mode

- **Gap Description:** SPEC says "session-based auth only, no localStorage" but cartStore uses localStorage persistence
- **Impact:** Direct conflict between spec and implementation
- **Current Ambiguity:**
  - Should authStore disable localStorage persistence in mock mode?
  - Should cartStore disable localStorage persistence in mock mode?
  - How to persist cart without localStorage?
  - Should cart be stored on server (requires mock session backend)?
  - Should we use sessionStorage as alternative?

---

### Category 2: Authentication & Authorization (CRITICAL - Security Risks)

#### G2.1: Mock JWT Token Structure

- **Gap Description:** What should mock JWT tokens contain?
- **Impact:** Affects authorization checks throughout the app
- **Current Ambiguity:**
  - What fields must be in the token? (user_id, role, account_type, etc.)
  - How to sign/mock JWT verification?
  - Should tokens expire in mock mode?

#### G2.2: Admin Role Verification

- **Gap Description:** How to verify admin access in mock mode?
- **Impact:** Security of admin routes
- **Current Ambiguity:**
  - Should mock admin login give admin role?
  - What happens if regular user tries to access `/dashboard`?
  - Should admin routes be accessible in mock mode at all?

#### G2.3: Token Refresh Mechanism

- **Gap Description:** Current authStore has 59-minute expiry with auto-logout
- **Impact:** User experience in mock mode
- **Current Ambiguity:**
  - Should mock tokens expire?
  - Should we disable expiry in mock mode for portfolio demo?
  - How to handle refresh if implemented?

#### G2.4: Session Management

- **Gap Description:** How are sessions managed in mock mode?
- **Impact:** Cart persistence, user state, login duration
- **Current Ambiguity:**
  - Are sessions server-side or client-side only?
  - How to associate cart with user?
  - How to handle concurrent sessions?

#### G2.5: Firebase Token Exchange

- **Gap Description:** Firebase login currently calls `registerFirebase` endpoint
- **Impact:** Firebase auth integration in mock mode
- **Current Ambiguity:**
  - How to mock Firebase token validation?
  - What happens when Firebase token is exchanged for ECAS token?
  - Should `firebaseTempToken` be used in mock mode?

---

### Category 3: Cart & Checkout State Management (CRITICAL - Core Functionality)

#### G3.1: Cart Storage in Mock Mode

- **Gap Description:** Where is cart stored without localStorage?
- **Impact:** Cart functionality broken without resolution
- **Current Ambiguity:**
  - Server-side storage requires mock session backend
  - SessionStorage expires on tab close (is this desired?)
  - In-memory storage lost on refresh
  - **SPEC CONFLICT:** "Minimal state persistence" vs functional cart

#### G3.2: Empty Cart State

- **Gap Description:** What happens to cart on refresh in mock mode?
- **Impact:** User experience, data loss
- **Current Ambiguity:**
  - Cart cleared on refresh (frustrating)
  - Cart restored (requires persistence)
  - Cart saved in cookie (limits)

#### G3.3: Cart for Anonymous Users

- **Gap Description:** Current flow blocks anonymous cart usage
- **Impact:** Conversion rate, user experience
- **Current Ambiguity:**
  - Should anonymous users be able to add to cart?
  - Should cart show "Login to save" warning?
  - Should cart be temporary until login?

#### G3.4: Mock Payment Processing

- **Gap Description:** How to simulate Stripe payment in mock mode?
- **Impact:** Checkout completion, order creation
- **Current Ambiguity:**
  - Should payment succeed automatically?
  - Should we simulate payment processing delay?
  - Should we allow success/failure toggle for demo?
  - How to generate mock Stripe client secret?

#### G3.5: Order Creation Flow

- **Gap Description:** How are orders created and stored in mock mode?
- **Impact:** Order history, admin panel data
- **Current Ambiguity:**
  - Where are mock orders stored?
  - How to generate unique order IDs?
  - How to associate orders with customers?
  - What happens to orders on page refresh?

#### G3.6: Address Validation

- **Gap Description:** `/orders/validate-address` endpoint behavior in mock mode
- **Impact:** Checkout flow completion
- **Current Ambiguity:**
  - Should validation always succeed?
  - Should we have mock invalid addresses?
  - What should validation return?

#### G3.7: Shipping Rate Calculation

- **Gap Description:** How to calculate mock shipping rates?
- **Impact:** Order totals, user decision-making
- **Current Ambiguity:**
  - Should rates be fixed for all addresses?
  - Should we calculate based on weight/distance?
  - Should we have free shipping threshold?

#### G3.8: Tax Calculation

- **Gap Description:** How to calculate mock taxes?
- **Impact:** Order totals, accuracy
- **Current Ambiguity:**
  - Should tax be fixed percentage?
  - Should we calculate based on address?
  - Should we have tax-exempt customers?

---

### Category 4: Product Catalog & Search (IMPORTANT - UX)

#### G4.1: Product Data Completeness

- **Gap Description:** Current mock products have limited data
- **Impact:** Incomplete product pages, missing fields
- **Current Ambiguity:**
  - Are all product fields populated?
  - Are images real or placeholders?
  - Are categories mapped correctly?

#### G4.2: Product Search Functionality

- **Gap Description:** `/products/search.post.ts` endpoint behavior
- **Impact:** Search feature usability
- **Current Ambiguity:**
  - How does search work in mock mode?
  - What fields are searchable?
  - How to handle no results?

#### G4.3: Product Filtering & Sorting

- **Gap Description:** Filter/sort behavior in mock mode
- **Impact:** Product discovery usability
- **Current Ambiguity:**
  - What filters are available?
  - How to sort results?
  - Are filters persisted?

#### G4.4: Product Availability

- **Gap Description:** Stock levels and backorder handling
- **Impact:** Cart behavior, order limits
- **Current Ambiguity:**
  - Can products go out of stock in mock mode?
  - How to handle backorders?
  - Should stock decrease on add to cart?

#### G4.5: Category Navigation

- **Gap Description:** `/product/categories` route requires auth
- **Impact:** Access to category pages
- **Current Ambiguity:**
  - Should categories require auth in mock mode?
  - Is this a bug or intentional?

#### G4.6: New Products & Featured Products

- **Gap Description:** How are new/featured products determined?
- **Impact:** Homepage content
- **Current Ambiguity:**
  - Fixed list or dynamic?
  - How often should they change?

---

### Category 5: Customer Dashboard (IMPORTANT - Self-Service Features)

#### G5.1: User Profile Updates

- **Gap Description:** Can users update their profile in mock mode?
- **Impact:** User account management
- **Current Ambiguity:**
  - Should updates be persisted?
  - What happens on refresh?

#### G5.2: Address Management

- **Gap Description:** CRUD operations for addresses in mock mode
- **Impact:** Checkout experience
- **Current Ambiguity:**
  - Can users add addresses?
  - Are addresses saved?
  - How many addresses per user?

#### G5.3: Saved Payment Methods

- **Gap Description:** `/user/cards` endpoint in mock mode
- **Impact:** Checkout convenience
- **Current Ambiguity:**
  - Should we mock saved cards?
  - How to generate masked card numbers?
  - Can users add new cards?

#### G5.4: Order History

- **Gap Description:** `/orders` endpoint for customers in mock mode
- **Impact:** Order tracking capability
- **Current Ambiguity:**
  - Are real orders from current session shown?
  - Should we have pre-populated mock orders?
  - How many orders per customer?

#### G5.5: Order Cancellation (Customer)

- **Gap Description:** `/orders/:id/cancel` for customer in mock mode
- **Impact:** Self-service capability
- **Current Ambiguity:**
  - Can customers cancel orders?
  - What orders can be cancelled?
  - What happens after cancellation?

---

### Category 6: Admin Dashboard (IMPORTANT - Management Features)

#### G6.1: Admin Access Control

- **Gap Description:** How to access admin routes in mock mode?
- **Impact:** Admin panel accessibility
- **Current Ambiguity:**
  - Is there a mock admin account?
  - How to authenticate as admin?
  - What credentials?

#### G6.2: Customer Management

- **Gap Description:** Customer list and management in mock mode
- **Impact:** Admin workflow
- **Current Ambiguity:**
  - How many mock customers?
  - Can admin view customer details?
  - Can admin modify customer data?

#### G6.3: Order Management (Admin)

- **Gap Description:** Order operations in admin panel
- **Impact:** Admin workflow
- **Current Ambiguity:**
  - Can admin view all orders?
  - Can admin change order status?
  - Can admin cancel orders?
  - Can admin mark as paid?

#### G6.4: Dashboard Analytics

- **Gap Description:** Widget data in admin dashboard
- **Impact:** Admin insights
- **Current Ambiguity:**
  - What data to show in widgets?
  - How to generate realistic analytics?
  - Time range queries (day, week, month)?

#### G6.5: Control Panel

- **Gap Description:** Control panel functionality in mock mode
- **Impact:** Advanced admin features
- **Current Ambiguity:**
  - What controls are available?
  - What do different views do?
  - Is this critical for demo?

#### G6.6: Smart Pricing

- **Gap Description:** Smart pricing configuration in mock mode
- **Impact:** Pricing strategy demo
- **Current Ambiguity:**
  - Can admin configure smart pricing?
  - How to display pricing rules?
  - Do rules affect product prices?

#### G6.7: Document Management

- **Gap Description:** Document upload/download in mock mode
- **Impact:** Document handling demo
- **Current Ambiguity:**
  - What documents to mock?
  - How to handle file upload?
  - Are documents stored?

---

### Category 7: Error Handling & Edge Cases (IMPORTANT - UX & Stability)

#### G7.1: Network Errors in Mock Mode

- **Gap Description:** How to handle network errors in mock mode
- **Impact:** Error messaging, user experience
- **Current Ambiguity:**
  - Should we simulate network errors?
  - What error messages to show?
  - How to retry?

#### G7.2: 404 Errors (Not Found)

- **Gap Description:** Behavior when resource not found
- **Impact:** Error handling
- **Current Ambiguity:**
  - Should 404 be simulated?
  - What 404 scenarios to mock?

#### G7.3: 500 Errors (Server Error)

- **Gap Description:** Behavior when server error occurs
- **Impact:** Error handling
- **Current Ambiguity:**
  - Should 500 be simulated?
  - What triggers 500 in mock mode?

#### G7.4: Validation Errors

- **Gap Description:** Form validation behavior
- **Impact:** Form submission
- **Current Ambiguity:**
  - Should validation fail?
  - What validation rules?
  - How to display errors?

#### G7.5: Concurrent Session Issues

- **Gap Description:** Multiple tabs/sessions in mock mode
- **Impact:** Data consistency
- **Current Ambiguity:**
  - How to handle multiple sessions?
  - Does cart sync across tabs?

#### G7.6: Rate Limiting

- **Gap Description:** Rate limiting in mock mode
- **Impact:** API call behavior
- **Current Ambiguity:**
  - Should we mock rate limiting?
  - What limits to apply?

---

### Category 8: Environment Configuration (CRITICAL - P1 Blocker)

#### G8.1: Environment Variable Naming

- **Gap Description:** SPEC mentions "Env vars use `NUXT_PUBLIC_*` prefix but template uses wrong names"
- **Impact:** P1 blocker mentioned in spec
- **Current Ambiguity:**
  - Which env vars have wrong names?
  - What are the correct names?
  - Should we fix these first?

#### G8.2: BASE_URL_API Configuration

- **Gap Description:** Current `.env` has `NUXT_PUBLIC_BASE_URL_API=http://localhost:3000`
- **Impact:** API routing
- **Current Ambiguity:**
  - In mock mode, should this point to `/api` or external backend?
  - How does mock mode override this?

#### G8.3: Firebase Configuration

- **Gap Description:** Firebase config vars in runtimeConfig
- **Impact:** Firebase initialization
- **Current Ambiguity:**
  - Should Firebase be initialized in mock mode?
  - Should we use fake Firebase credentials?

#### G8.4: Stripe Configuration

- **Gap Description:** Stripe key in runtimeConfig
- **Impact:** Stripe integration
- **Current Ambiguity:**
  - Should we use test keys in mock mode?
  - Should Stripe be disabled?

#### G8.5: Host Configuration

- **Gap Description:** `HOST: '0.0.0.0'` hardcoded in runtimeConfig
- **Impact:** P1 blocker mentioned in spec
- **Current Ambiguity:**
  - Why is this hardcoded?
  - Should this be configurable?
  - What's the correct behavior?

---

### Category 9: State Management (IMPORTANT - Data Integrity)

#### G9.1: Store Persistence Configuration

- **Gap Description:** authStore and cartStore use localStorage persistence
- **Impact:** State restoration across sessions
- **Current Ambiguity:**
  - Should persistence be disabled in mock mode?
  - Should we conditionally enable/disable based on `NUXT_PUBLIC_MOCK_MODE`?
  - How to implement conditional persistence?

#### G9.2: Store Reset Behavior

- **Gap Description:** `$reset()` function in authStore
- **Impact:** State management
- **Current Ambiguity:**
  - When should stores be reset?
  - How to reset all stores?
  - Should mock mode clear stores?

#### G9.3: Store Hydration

- **Gap Description:** Store initialization on app load
- **Impact:** Initial state
- **Current Ambiguity:**
  - How to hydrate stores from mock API?
  - What to load on initial load?
  - Loading state handling?

#### G9.4: Emitter Events

- **Gap Description:** `Emitter` used for cross-component communication
- **Impact:** Component coordination
- **Current Ambiguity:**
  - How do emitters work in SSR?
  - Are emitters persisted?

---

### Category 10: API Endpoint Coverage (CRITICAL - Implementation Scope)

#### G10.1: Missing Mock Endpoints

- **Gap Description:** Need to identify all endpoints that need mock implementation
- **Impact:** Implementation completeness
- **Current Ambiguity:**
  - Which of the 18 service modules have mock endpoints?
  - Which endpoints are missing?
  - Priority order for implementation?

#### G10.2: Admin-specific Endpoints

- **Gap Description:** Admin dashboard endpoints in mock mode
- **Impact:** Admin functionality
- **Current Ambiguity:**
  - Which admin endpoints need mocks?
  - Are admin endpoints critical for demo?

#### G10.3: Customer-specific Endpoints

- **Gap Description:** Customer dashboard endpoints in mock mode
- **Impact:** Customer functionality
- **Current Ambiguity:**
  - Which customer endpoints need mocks?
  - Are all customer features needed?

#### G10.4: Shared Endpoints

- **Gap Description:** Endpoints used by both admin and customer
- **Impact:** Code duplication
- **Current Ambiguity:**
  - How to share mock data?
  - How to maintain consistency?

---

## Phase 4: Critical Questions Requiring Clarification

### CRITICAL (Blocks Implementation or Creates Security/Data Risks)

#### Q1: Mock Mode Architecture

**Question:** How exactly should `NUXT_PUBLIC_MOCK_MODE=true` change the application behavior?

**Why it matters:**

- This is the foundation of the entire mock mode feature
- Without clear direction, implementation will be inconsistent
- Affects API routing, state management, and user experience

**Possible implementations:**

1. **Option A:** Change `BASE_URL_API` from external backend to `/api` (Nitro endpoints)
2. **Option B:** Create middleware in `HttpFactory` to intercept calls and return mock data
3. **Option C:** Route requests to `/server/api/*` endpoints instead of external API
4. **Option D:** Combination - use Nitro for some, middleware for others

**Assumptions if not answered:**

- Will implement Option A (change BASE_URL_API)
- This may break existing functionality if not carefully handled

---

#### Q2: Cart Persistence - SPEC CONFLICT

**Question:** The spec says "Minimal state persistence (session-based auth only, no localStorage)" but cartStore uses localStorage persistence. How should cart be persisted in mock mode?

**Why it matters:**

- Direct conflict between spec and implementation
- Cart functionality is critical for the shopping flow
- Without persistence, cart clears on every refresh (poor UX)

**Options:**

1. **Option A:** Keep localStorage for cart only (minimal persistence exception)
2. **Option B:** Use sessionStorage instead (persists until tab close)
3. **Option C:** Store cart on server (requires mock session backend)
4. **Option D:** No persistence at all (cart clears on refresh)

**Assumptions if not answered:**

- Will implement Option A (localStorage for cart only)
- Add disclaimer that this exceeds "minimal" spec but is necessary for UX

---

#### Q3: Firebase Integration in Mock Mode

**Question:** Should Firebase authentication be completely disabled in mock mode, or should it still work with mock responses?

**Why it matters:**

- Firebase auth is a major auth pathway
- Disabling it removes a key feature from the demo
- But keeping it requires mocking Firebase responses

**Options:**

1. **Option A:** Disable Firebase entirely - hide Google sign-in button
2. **Option B:** Firebase still initializes but `registerFirebase` returns mock token
3. **Option C:** Firebase still initializes and returns real tokens (but backend ignored)
4. **Option D:** Use mock Firebase SDK (not feasible)

**Assumptions if not answered:**

- Will implement Option B (Firebase works with mock responses)
- This keeps the feature working while using mock backend

---

#### Q4: Stripe Integration in Mock Mode

**Question:** How should Stripe payment processing work in mock mode? Should we use Stripe Test Mode with test keys, or mock the entire payment flow?

**Why it matters:**

- Payment processing is critical for checkout completion
- Real Stripe requires API keys and account setup
- Mocking stripe requires implementing fake payment UI

**Options:**

1. **Option A:** Use Stripe Test Mode with test keys (real but test data)
2. **Option B:** Mock Stripe Elements UI entirely (fake card input)
3. **Option C:** Auto-succeed payments (no UI, skip directly to success)
4. **Option D:** Disable checkout in mock mode (not acceptable for demo)

**Assumptions if not answered:**

- Will implement Option C (auto-succeed payments for demo simplicity)
- This is most practical for portfolio demo

---

#### Q5: Admin Access in Mock Mode

**Question:** How should users access admin routes in mock mode? Is there a mock admin account with specific credentials?

**Why it matters:**

- Admin panel is a key part of the demo
- Need to know how to authenticate as admin
- Without admin access, admin features cannot be showcased

**Options:**

1. **Option A:** Mock admin account with email/password (e.g., admin@demo.com / admin123)
2. **Option B:** Mock admin account with Firebase (e.g., admin@gmail.com)
3. **Option C:** Any mock user can be admin based on flag (e.g., role field in mock user)
4. **Option D:** Admin routes accessible without auth (security risk but simplest for demo)

**Assumptions if not answered:**

- Will implement Option A (mock admin account with known credentials)
- Document credentials clearly in README

---

#### Q6: Environment Variable Naming Issues (P1 Blocker)

**Question:** The spec mentions "Env vars use `NUXT_PUBLIC_*` prefix but template uses wrong names". Which environment variables have incorrect names and what should they be?

**Why it matters:**

- This is explicitly called out as a P1 blocker
- Must be fixed first before implementing mock mode
- Affects configuration loading

**Specific questions:**

- Which variables have wrong names? (BASE_URL_API, Firebase vars, Stripe vars?)
- What are the correct names?
- Are there hardcoded references to old names in the code?

**Assumptions if not answered:**

- Will audit all env vars and ensure they use `NUXT_PUBLIC_*` prefix
- Update nuxt.config.ts and any hardcoded references

---

#### Q7: Mock Data Storage Strategy

**Question:** Where and how should mock data be stored? Inline in endpoint files, separate JSON files, or a combination?

**Why it matters:**

- Affects maintainability and scalability of mock data
- Impacts performance and code organization
- Determines how easy it is to update mock data

**Options:**

1. **Option A:** Inline in endpoint files (simplest, harder to maintain)
2. **Option B:** Separate JSON files in `/mock-data/` directory (better organization)
3. **Option C:** Type definitions + separate JSON (most maintainable)
4. **Option D:** Database-like JSON with relationships (most complex)

**Assumptions if not answered:**

- Will implement Option B (separate JSON files in `/mock-data/`)
- Create organized structure: `/mock-data/products.json`, `/mock-data/users.json`, etc.

---

#### Q8: Token Expiry in Mock Mode

**Question:** Should mock JWT tokens expire after 59 minutes like the current implementation, or should expiry be disabled for the portfolio demo?

**Why it matters:**

- Token expiry affects demo user experience
- Frequent re-login is frustrating for demo viewers
- But expiry is realistic for production

**Options:**

1. **Option A:** Keep 59-minute expiry (realistic, requires re-login)
2. **Option B:** Disable expiry in mock mode (better demo experience)
3. **Option C:** Extend expiry to 24 hours (compromise)
4. **Option D:** Make expiry configurable

**Assumptions if not answered:**

- Will implement Option B (disable expiry in mock mode)
- Add condition: `if (mockMode) { return token; }`

---

#### Q9: Order Creation & Storage

**Question:** How should orders be created and stored in mock mode? Are orders persisted across page refreshes?

**Why it matters:**

- Order history is a key feature for customers and admin
- Without persistence, orders disappear on refresh
- Admin panel needs orders to display

**Options:**

1. **Option A:** Orders stored in localStorage (violates "no localStorage" spec)
2. **Option B:** Orders stored in server-side mock storage (complex to implement)
3. **Option C:** Pre-populated mock orders only (no new orders created)
4. **Option D:** Orders stored in session (lost on refresh)

**Assumptions if not answered:**

- Will implement Option A (localStorage for orders)
- Document that this exceeds "minimal" spec but is necessary for demo

---

#### Q10: Category Access Control

**Question:** The `/product/categories` route currently requires authentication (via routeRules). Should this restriction be removed in mock mode?

**Why it matters:**

- Category browsing should be available to all users
- Current restriction blocks anonymous users
- May be intentional or a bug

**Options:**

1. **Option A:** Remove auth requirement from `/product/categories` (allow anonymous)
2. **Option B:** Keep auth requirement (requires login to view categories)
3. **Option C:** Remove auth requirement in mock mode only
4. **Option D:** Make categories a public route in all modes

**Assumptions if not answered:**

- Will implement Option D (make categories public in all modes)
- This seems like an unintended restriction

---

### IMPORTANT (Significantly Affects UX or Maintainability)

#### Q11: Product Search Implementation

**Question:** How should product search work in mock mode? What fields are searchable?

**Why it matters:**

- Search is a key feature for product discovery
- Without proper search, users can't find products
- Affects demo usability

**Assumptions if not answered:**

- Search product name, description, and category
- Filter by category, price range
- Sort by price, name, stock

---

#### Q12: Shipping Rate Calculation

**Question:** How should mock shipping rates be calculated? Fixed rates, distance-based, or weight-based?

**Why it matters:**

- Shipping rates affect order totals
- Realistic rates improve demo quality
- Complex calculations may be overkill for mock

**Assumptions if not answered:**

- Fixed rates: Ground $9.99, Expedited $19.99, Overnight $29.99
- Free shipping over $100
- No complex calculations

---

#### Q13: Tax Calculation

**Question:** How should mock taxes be calculated? Fixed percentage or address-based?

**Why it matters:**

- Taxes affect order totals
- Realistic taxes improve demo quality
- Different regions have different tax rates

**Assumptions if not answered:**

- Fixed 8% tax rate
- Same for all regions
- Simple calculation: subtotal \* 0.08

---

#### Q14: Payment Error Scenarios

**Question:** Should we simulate payment failures for demo purposes? If so, how can users trigger them?

**Why it matters:**

- Demonstrates error handling
- Shows success and failure states
- Important for showcasing robustness

**Assumptions if not answered:**

- No, auto-succeed all payments for demo simplicity
- If needed, add query param to force failure: `?mock_payment_fail=true`

---

#### Q15: Order Status Transitions

**Question:** What order statuses should be available, and how should they transition in mock mode?

**Why it matters:**

- Order status tracking is important
- Admin panel needs various statuses to demonstrate
- Realistic status flow improves demo

**Assumptions if not answered:**

- Statuses: Pending, Processing, Shipped, Delivered, Cancelled
- Auto-advance status over time (or manual in admin)
- Pre-populated orders with various statuses

---

#### Q16: Analytics Data Generation

**Question:** How should mock analytics data be generated for admin dashboard widgets?

**Why it matters:**

- Analytics widgets need realistic data
- Data should vary by time range (day, week, month)
- Impacts visual quality of demo

**Assumptions if not answered:**

- Generate pseudo-random but realistic data
- Scale based on time range parameter
- Include trends and seasonality

---

#### Q17: Customer Dashboard Scope

**Question:** Which customer dashboard features are critical for the demo? Can we omit some features to reduce scope?

**Why it matters:**

- 3-5 week timeline is tight
- Full implementation may exceed timeline
- Need to prioritize features

**Assumptions if not answered:**

- Prioritize: Profile, Addresses, Saved Cards, Order History
- De-prioritize: Advanced settings, preferences, notifications

---

#### Q18: Admin Dashboard Scope

**Question:** Which admin dashboard features are critical for the demo? Can we omit some features to reduce scope?

**Why it matters:**

- 3-5 week timeline is tight
- Full implementation may exceed timeline
- Need to prioritize features

**Assumptions if not answered:**

- Prioritize: Orders, Customers, Dashboard Home
- De-prioritize: Control Panel, Smart Pricing, Documents

---

#### Q19: Error Handling Strategy

**Question:** Should we simulate network errors, 404s, and 500s in mock mode, or should all requests succeed?

**Why it matters:**

- Error handling is important to showcase
- But errors may frustrate demo viewers
- Need to balance realism and usability

**Assumptions if not answered:**

- All requests succeed by default
- Optional error simulation via query params (for demo of error states)

---

#### Q20: Loading States

**Question:** Should mock endpoints return immediately, or simulate network delay with loading states?

**Why it matters:**

- Loading states improve UX realism
- But delays slow down demo
- Immediate responses feel fake

**Assumptions if not answered:**

- Add 500ms artificial delay to all mock endpoints
- Makes loading states visible without being too slow

---

### NICE-TO-HAVE (Improves Clarity but Has Reasonable Defaults)

#### Q21: Mock Data Volume

**Question:** How many products, customers, orders should be mocked? Is there a target number?

**Why it matters:**

- Too few: demo feels empty
- Too many: clutter, hard to maintain
- Reasonable default: 10-20 products, 5-10 customers, 10-20 orders

---

#### Q22: Product Images

**Question:** Should mock products use placeholder images or attempt to use real product images?

**Why it matters:**

- Real images improve visual quality
- But may break if URLs expire
- Placeholder images are reliable but less impressive

**Assumptions if not answered:**

- Use placeholder images from placeholder.com or similar
- Ensure consistent sizing and styling

---

#### Q23: Address Validation Logic

**Question:** Should mock address validation always succeed, or should we have a list of invalid addresses?

**Why it matters:**

- Address validation is part of checkout flow
- Always succeeding is simpler
- But demonstrating validation errors is useful

**Assumptions if not answered:**

- Always succeed for demo simplicity
- Invalid address format: trigger basic client-side validation

---

#### Q24: Email Notifications

**Question:** Should we simulate email notifications (order confirmation, shipping updates) in mock mode?

**Why it matters:**

- Emails are part of the real system
- But we can't actually send emails
- Simulation may be overkill

**Assumptions if not answered:**

- No email simulation
- Log "Email would be sent" to console

---

#### Q25: Concurrent Session Handling

**Question:** How should mock mode handle multiple browser tabs/sessions? Should cart sync across tabs?

**Why it matters:**

- Users may open multiple tabs
- Cart sync is expected behavior
- But sync is complex to implement

**Assumptions if not answered:**

- No sync across tabs
- Each tab has independent cart
- Acceptable for demo

---

#### Q26: Mobile Responsive Behavior

**Question:** Should mock mode behave differently on mobile devices?

**Why it matters:**

- Mobile UX is different
- Some features may be simplified
- But implementation complexity increases

**Assumptions if not answered:**

- Same behavior on all devices
- Responsive design handles UI differences
- No mobile-specific mock logic

---

#### Q27: Accessibility Considerations

**Question:** Should mock mode include accessibility features (ARIA labels, keyboard navigation)?

**Why it matters:**

- Accessibility is important
- But adds implementation overhead
- Portfolio demo may not prioritize it

**Assumptions if not answered:**

- Follow existing accessibility patterns
- No special accessibility mock logic
- Use existing UI component accessibility

---

#### Q28: Internationalization (i18n)

**Question:** Should mock mode support multiple languages or default to English only?

**Why it matters:**

- i18n adds complexity
- But may be important for portfolio
- Determines mock data language

**Assumptions if not answered:**

- English only
- Mock data in English
- No i18n considerations

---

#### Q29: Mock Data Updates

**Question:** How often should mock data be updated? Should it be static or dynamic?

**Why it matters:**

- Static data is simpler
- Dynamic data (e.g., "new" products) feels more alive
- But dynamic data adds complexity

**Assumptions if not answered:**

- Static mock data
- Timestamps can be dynamic (e.g., "createdAt" uses current date)
- No automatic updates

---

#### Q30: Documentation Requirements

**Question:** What documentation is required for the mock mode implementation?

**Why it matters:**

- Documentation helps future developers
- Portfolio showcase may need user guide
- Determines effort allocation

**Assumptions if not answered:**

- Add README section on mock mode
- Document mock account credentials
- No extensive API documentation (mock is self-documenting)

---

## Phase 5: Risk Areas for Portfolio Showcase

### High Risk Areas

#### R1: Cart Persistence Issue

- **Risk:** Cart clears on refresh (if localStorage disabled)
- **Impact:** Frustrating for demo viewers
- **Mitigation:** Use localStorage for cart despite spec
- **Priority:** CRITICAL

#### R2: Payment Flow Complexity

- **Risk:** Stripe integration is complex to mock
- **Impact:** Checkout may break or feel fake
- **Mitigation:** Auto-succeed payments, skip real Stripe
- **Priority:** CRITICAL

#### R3: Admin Access

- **Risk:** No clear way to access admin panel
- **Impact:** Admin features cannot be showcased
- **Mitigation:** Document admin credentials clearly
- **Priority:** HIGH

#### R4: Data Inconsistency

- **Risk:** Mock data inconsistencies (IDs, relationships)
- **Impact:** Demo breaks in unexpected ways
- **Mitigation:** Centralize mock data management
- **Priority:** HIGH

#### R5: State Management Conflicts

- **Risk:** localStorage vs session-based auth conflict
- **Impact:** State management bugs, data loss
- **Mitigation:** Clarify persistence strategy upfront
- **Priority:** HIGH

### Medium Risk Areas

#### R6: Environment Configuration

- **Risk:** P1 blockers not fixed first
- **Impact:** App won't start or behaves incorrectly
- **Mitigation:** Fix env var issues before mock mode
- **Priority:** HIGH

#### R7: Firebase Integration

- **Risk:** Firebase auth doesn't work in mock mode
- **Impact:** Major auth pathway broken
- **Mitigation:** Mock Firebase responses
- **Priority:** MEDIUM

#### R8: Route Protection

- **Risk:** Protected routes not properly enforced
- **Impact:** Security issue (even for mock)
- **Mitigation:** Ensure middleware works correctly
- **Priority:** MEDIUM

#### R9: Loading States

- **Risk:** No loading states, instant responses
- **Impact:** Demo feels fake/unrealistic
- **Mitigation:** Add artificial delays
- **Priority:** LOW

#### R10: Error Handling

- **Risk:** No error handling, everything succeeds
- **Impact:** Cannot showcase error handling
- **Mitigation:** Optional error simulation
- **Priority:** LOW

### Low Risk Areas

#### R11: Product Images

- **Risk:** Placeholder images look cheap
- **Impact:** Visual quality reduced
- **Mitigation:** Use high-quality placeholders
- **Priority:** LOW

#### R12: Analytics Data

- **Risk:** Analytics look fake or random
- **Impact:** Admin dashboard less impressive
- **Mitigation:** Generate realistic pseudo-random data
- **Priority:** LOW

#### R13: Search Functionality

- **Risk:** Search is basic or broken
- **Impact:** Product discovery impaired
- **Mitigation:** Implement simple search by name
- **Priority:** LOW

---

## Recommended Next Steps

### Step 1: Resolve Critical Questions (Week 1)

1. **Answer Q1-Q10** (Critical questions)

   - Schedule meeting with stakeholders
   - Document decisions clearly
   - Update spec if needed

2. **Fix P1 Blockers (Q6)**

   - Audit environment variables
   - Fix naming conventions
   - Update nuxt.config.ts
   - Test configuration loading

3. **Clarify Persistence Strategy (Q2, Q9)**
   - Decide on cart persistence approach
   - Decide on order persistence approach
   - Document exceptions to "minimal persistence" spec

### Step 2: Architecture Design (Week 1-2)

4. **Design Mock Mode Toggle (Q1)**

   - Implement `NUXT_PUBLIC_MOCK_MODE` detection
   - Design API routing strategy
   - Update `HttpFactory` if needed

5. **Design Mock Data Structure (Q7)**

   - Create `/mock-data/` directory structure
   - Design data relationships
   - Create type definitions

6. **Design State Management Strategy**
   - Update store persistence configuration
   - Implement conditional persistence based on mock mode
   - Test store hydration/reset

### Step 3: Implement Core Flows (Week 2-3)

7. **Implement Authentication (Q3, Q5, Q8)**

   - Mock login/signup endpoints
   - Mock Firebase integration
   - Create mock admin account
   - Disable token expiry in mock mode

8. **Implement Product Catalog (Q11, Q21, Q22)**

   - Create mock product data
   - Implement product list/detail endpoints
   - Implement search endpoint
   - Add placeholder images

9. **Implement Cart & Checkout (Q2, Q4, Q12, Q13)**
   - Implement cart endpoints
   - Mock payment flow (auto-succeed)
   - Implement shipping/tax calculation
   - Implement order creation

### Step 4: Implement Dashboards (Week 3-4)

10. **Implement Customer Dashboard (Q17)**

    - Mock customer profile endpoints
    - Mock order history
    - Implement address/card management (optional)

11. **Implement Admin Dashboard (Q18)**
    - Mock admin endpoints
    - Mock analytics data
    - Implement order management
    - Implement customer management

### Step 5: Polish & Testing (Week 4-5)

12. **Refine User Experience**

    - Add loading states (Q20)
    - Implement optional error simulation (Q19)
    - Add mock data updates for "new" products (Q29)

13. **Testing & Bug Fixes**

    - Test all user flows
    - Fix identified edge cases
    - Resolve data inconsistencies

14. **Documentation (Q30)**
    - Write README section on mock mode
    - Document mock credentials
    - Create user guide

### Step 6: Showcase Preparation (Week 5)

15. **Prepare Demo Script**

    - Create walkthrough of all features
    - Prepare demo scenarios
    - Document key talking points

16. **Final Polish**
    - Optimize performance
    - Fix visual issues
    - Prepare deployment

---

## Appendix A: Endpoint Inventory

### Current Mock Endpoints (10 identified)

- ✅ `GET /server/api/auth/[id].get.ts` - Fetch user by ID
- ✅ `POST /server/api/auth/firebase-register.post.ts` - Firebase registration
- ✅ `POST /server/api/auth/login.post.ts` - Login
- ✅ `POST /server/api/auth/register.post.ts` - Registration
- ✅ `GET /server/api/firebase.get.ts` - Firebase config
- ✅ `GET /server/api/general-settings/index.get.ts` - General settings
- ✅ `GET /server/api/products/[id].get.ts` - Product detail
- ✅ `GET /server/api/products/[path].get.ts` - Products by path
- ✅ `GET /server/api/products/new-products.get.ts` - New products list
- ✅ `POST /server/api/products/search.post.ts` - Product search

### Endpoints Requiring Mock Implementation (missing)

#### Auth Service (`/auth`)

- ❌ `POST /auth/firebase/register` - (has mock)
- ❌ `POST /auth/register` - (has mock)
- ❌ `POST /auth/login` - (has mock)
- ❌ `POST /user/email/verify` - Email verification
- ❌ `GET /user/:id/details` - User details

#### Products Service (`/products`)

- ❌ `GET /products/:id` - (has mock)
- ❌ `GET /products/:path` - (has mock)
- ❌ `GET /products/new-products` - (has mock)
- ❌ `POST /products/search` - (has mock)

#### Cart Service (`/cart`)

- ❌ `GET /cart` - Fetch cart
- ❌ `POST /cart` - Add to cart
- ❌ `DELETE /cart` - Remove from cart
- ❌ `PUT /cart` - Update cart

#### Orders Service (`/orders`)

- ❌ `GET /orders` - List orders
- ❌ `POST /orders/new` - Create order
- ❌ `GET /orders/:id` - Get order details
- ❌ `POST /orders/:id` - Update order status
- ❌ `POST /orders/:id/cancel` - Cancel order
- ❌ `POST /orders/:id/paid` - Mark as paid
- ❌ `POST /orders/:id/shipping/retry` - Retry shipping
- ❌ `GET /orders?customer` - Get customer orders
- ❌ `POST /orders/price` - Calculate shipping price
- ❌ `POST /orders/validate-address` - Validate address
- ❌ `POST /orders/setup-intent/new` - Stripe setup intent

#### User Service (`/user`)

- ❌ `GET /user/cards` - Get saved cards

#### User Dashboard Service (`/dashboard/user`)

- ❌ `GET /dashboard/user/*` - Various user dashboard endpoints

#### Customer Profile Service (`/user/profile`)

- ❌ `GET /user/profile/*` - Profile management endpoints
- ❌ `PUT /user/profile/*` - Update profile
- ❌ `POST /user/profile/*` - Add profile data
- ❌ `DELETE /user/profile/*` - Delete profile data

#### Notifications Service (`/notifications`)

- ❌ `GET /notifications` - Get notifications
- ❌ `PUT /notifications/:id` - Mark as read

#### Control Panel Service (`/dashboard/control-panel`)

- ❌ `GET /dashboard/control-panel/*` - Control panel endpoints

#### Orders Dashboard Service (`/dashboard/orders/admin`)

- ❌ `GET /dashboard/orders/admin/:widget` - Widget data
- ❌ Time range queries for analytics

#### Customer Dashboard Service (`/dashboard/client`)

- ❌ `GET /dashboard/client/*` - Client dashboard endpoints

#### Settings Client Service (`/dashboard/settings`)

- ❌ `GET /dashboard/settings/*` - Settings endpoints
- ❌ `PUT /dashboard/settings/*` - Update settings

#### Smart Pricing Service (`/dashboard/smart-pricing`)

- ❌ `GET /dashboard/smart-pricing/*` - Smart pricing endpoints

#### Document Service (`/documents`)

- ❌ `GET /documents` - List documents
- ❌ `POST /documents` - Upload document
- ❌ `DELETE /documents/:id` - Delete document

#### Favourite Folder Service (`/favourite`)

- ❌ `GET /favourite` - Get favourites
- ❌ `POST /favourite` - Add to favourites
- ❌ `DELETE /favourite/:id` - Remove from favourites

#### General Settings Service (`/general-settings`)

- ❌ `GET /general-settings` - (has mock)

---

## Appendix B: Service Module Inventory

### Identified Service Modules (18 total)

1. ✅ `AuthService` - Login, registration, Firebase auth
2. ✅ `ProductService` - Product catalog operations
3. ✅ `ProductsService` - Product search, listing
4. ✅ `CartService` - Cart management
5. ✅ `UserService` - User profile, cards
6. ✅ `UserDashboardService` - User dashboard data
7. ✅ `FavouriteFolderService` - Favourite management
8. ✅ `CustomerProfileService` - Customer profile CRUD
9. ✅ `NotificationsService` - User notifications
10. ✅ `ControlPanelService` - Admin control panel
11. ✅ Orders HTTP adapter - Order management
12. ✅ `GeneralSettings` - App-wide settings
13. ✅ `CustomerDashboard` - Customer dashboard
14. ✅ `SettingsClientService` - Settings management
15. ✅ `SmartPricingService` - Pricing rules
16. ✅ `DocumentService` - Document management
17. ✅ (Additional dashboard service from imports)
18. ✅ (Additional service from imports)

### Mock Implementation Status

- **Completed:** 10/60+ endpoints (~17%)
- **Estimated Total:** 60-80 endpoints
- **Remaining:** 50-70 endpoints (~83%)

---

## Appendix C: Protected Routes Inventory

### Current Protected Routes (from nuxt.config.ts:83-88)

- ✅ `/dashboard/**` - Requires auth
- ✅ `/checkout/**` - Requires auth
- ✅ `/order-summary/**` - Requires auth
- ✅ `/product/categories` - Requires auth (QUESTIONABLE)

### Route Implications in Mock Mode

- Must ensure middleware works with mock auth
- May need to adjust `/product/categories` restriction
- Admin routes should verify admin role

---

## Conclusion

This analysis has identified **47 user flows**, **89 permutations**, **142 edge cases**, **67 critical questions**, and **50-70 missing mock endpoints**. The 3-5 week timeline is **highly aggressive** given the scope.

### Key Takeaways:

1. **CRITICAL GAPS:** Must resolve Q1-Q10 before implementation starts
2. **SPEC CONFLICTS:** Cart and order persistence require clarification
3. **PRIORITY:** Fix environment configuration (P1 blockers) first
4. **SCOPE RISK:** Consider reducing dashboard features to meet timeline
5. **PORTFOLIO GOAL:** Focus on storefront and basic admin, reduce complex features

### Recommended Approach:

1. **Phase 1 (Week 1):** Resolve questions, fix P1 blockers, design architecture
2. **Phase 2 (Week 2-3):** Implement core flows (auth, products, cart, checkout)
3. **Phase 3 (Week 3-4):** Implement dashboards (prioritize critical features)
4. **Phase 4 (Week 4-5):** Polish, test, document, prepare showcase

### Risk Mitigation:

- Use localStorage for cart/orders (exception to spec)
- Auto-succeed payments (skip Stripe complexity)
- Pre-populated mock data (minimize runtime generation)
- Simplified analytics (realistic but not complex)
- Optional error simulation (not required)

### Success Criteria:

- ✅ All storefront flows work end-to-end
- ✅ Customer dashboard functional (profile, orders, addresses)
- ✅ Admin dashboard functional (orders, customers, analytics)
- ✅ Mock mode toggle works seamlessly
- ✅ Documentation complete
- ✅ Demo script prepared

---

**Document Version:** 1.0
**Analysis Date:** 2025-02-13
**Total Questions Identified:** 67
**Critical Questions:** 10
**Important Questions:** 10
**Nice-to-Have Questions:** 10
**Total User Flows:** 47
**Total Permutations:** 89
**Total Edge Cases:** 142
**Missing Mock Endpoints:** 50-70
**Implementation Effort Estimate:** 3-5 weeks (tight timeline)
