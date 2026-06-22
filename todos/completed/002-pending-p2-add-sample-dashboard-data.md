---
status: completed
priority: p2
issue_id: '002'
tags: [demo, dashboard, mock-data]
dependencies: []
---

# Add Sample Dashboard Data

## Problem Statement

The dashboard widgets and sections may show "No results" or empty states because mock data only covers products and basic auth. For a portfolio showcase, the dashboard should display realistic sample data to demonstrate the admin/customer management features.

## Findings

**Current State:**

- Products: 6 mock products ✅
- Cart: Basic mock cart ✅
- Orders: Minimal mock data (few orders)
- Dashboard widgets: **Empty or minimal**

**Missing Demo Data:**

- Active orders widget (no sample orders)
- Outstanding invoices section (no sample invoices)
- Customer analytics (no sample metrics)
- Activity logs (no sample activities)
- Recent transactions (no sample transactions)
- Support tickets (no sample support cases)
- Credit balance (no sample credit data)
- Settings/notifications (no sample data)

**Demo Impact:**

- Medium: Dashboard looks "empty" and incomplete
- Low: Cannot showcase dashboard features effectively
- Medium: Less impressive portfolio presentation

## Proposed Solutions

### Option 1: Add 50-100 Sample Records

**Approach:**

- Create `server/utils/mockDashboardData.ts`
- Add 50-100 sample records for each dashboard section:
  - Orders: 20-50 with various statuses (pending, processing, shipped, delivered)
  - Invoices: 10-20 with different amounts and statuses
  - Transactions: 20-30 (payments, credits, refunds)
  - Activity logs: 30-50 (login, order updates, settings changes)
  - Support tickets: 5-10 with various statuses
  - Customer profiles: 5-10 sample customers
- Generate realistic dates (past 3 months)
- Use real-looking names, addresses, emails

**Pros:**

- Dashboard feels complete and alive
- Shows all features working
- Demonstrates data visualization capabilities
- More impressive portfolio

**Cons:**

- More code to maintain
- Larger mock data files
- More complex to manage

**Effort:** 3-4 hours

**Risk:** Low

---

### Option 2: Add 10-20 Curated Records

**Approach:**

- Focus on quality over quantity
- Create 10-20 carefully designed sample records per section
- Make each record tell a "story" (realistic scenario)
- Keep data small but meaningful

**Pros:**

- Easier to maintain
- Higher quality per record
- Shows attention to detail
- Less code

**Cons:**

- Dashboard may still feel sparse
- Less impressive scale
- Can't demonstrate pagination well

**Effort:** 2-3 hours

**Risk:** Low

---

### Option 3: No Dashboard Data (Showcase Empty States Instead)

**Approach:**

- Keep dashboard empty
- Design beautiful empty states with illustrations
- Add "Demo Mode" badge explaining it's empty
- Focus demo on product catalog and shopping flow

**Pros:**

- Minimal effort
- Honest about demo nature
- Clean empty states show design skills

**Cons:**

- Dashboard features not demonstrable
- Less impressive for admin portfolio
- Wasted opportunity to showcase capabilities

**Effort:** 1-2 hours

**Risk:** Medium (underwhelming showcase)

---

## Recommended Action

**To be filled during triage.** Recommend Option 1 (50-100 sample records) for best portfolio impact.

## Technical Details

**Affected files:**

- Create: `server/utils/mockDashboardData.ts` - Shared dashboard data
- Update: `server/api/dashboard/orders/*.get.ts` - Add order data
- Update: `server/api/dashboard/invoices.get.ts` - Add invoice data
- Update: `server/api/dashboard/transactions.get.ts` - Add transaction data
- Update: `server/api/dashboard/activity.get.ts` - Add activity logs
- Update: `server/api/dashboard/support.get.ts` - Add support tickets
- Update: `server/api/dashboard/customers.get.ts` - Add customer data

**Related components:**

- All dashboard widgets
- Orders table
- Invoices list
- Activity log component
- Customer profile cards
- Support section

**No database changes**

## Resources

- **Demo Data Patterns:**
  - Realistic names: Mockaroo, Fake Name Generator
  - Addresses: Random Address Generator
  - Dates: Use past 3-6 months for realism

## Acceptance Criteria

- [ ] 50-100 sample records added for each dashboard section
- [ ] Orders have varied statuses (pending, processing, shipped, delivered, cancelled)
- [ ] Invoices have different amounts and statuses (paid, pending, overdue)
- [ ] Transactions include payments, credits, refunds with realistic dates
- [ ] Activity logs show 3 months of realistic activity
- [ ] Support tickets have various statuses (open, in-progress, resolved, closed)
- [ ] Customer profiles are diverse (different account types, statuses)
- [ ] Dashboard displays data clearly and professionally
- [ ] All dashboard sections feel complete and alive
- [ ] Demo showcases full dashboard capabilities

## Work Log

### 2026-02-14 - Initial Assessment

**By:** Portfolio Demo Review

**Actions:**

- Reviewed current dashboard data state
- Identified missing demo data (most sections empty)
- Evaluated 3 approaches to adding sample data
- Listed all dashboard sections needing data

**Learnings:**

- Dashboard feels empty without sample data
- 50-100 records is good balance (fills UI, manageable)
- Realistic dates and data patterns matter for portfolio quality
- Related to issue #001 (mock product data) - both improve mock data
- Dashboard showcases admin/customer management features

---

## Notes

- **Recommendation:** Option 1 (50-100 sample records)
- **Priority:** High impact on demo completeness
- **Related:** Issue #001 - both mock data improvements, coordinate together
