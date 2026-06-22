---
status: completed
priority: p2
issue_id: '001'
tags: [demo, ui, mock-data]
dependencies: []
---

# Expand Mock Product Data

## Problem Statement

The demo only has 6 mock products, making the product catalog feel sparse and incomplete. For a portfolio showcase, this limits the visual appeal and makes the demo feel unfinished. Browsing products shows the same few items repeatedly.

## Findings

- **Current State:** 6 mock products in `server/api/products/[id].get.ts`
- **Products:** SmartPhone Pro Max, Professional Laptop Ultra, etc. (only 6 unique items)
- **Impact:**
  - Product listings look sparse
  - Pagination not visually demonstrable
  - Categories show few items
  - New products section has limited variety
  - Similar products recommendations repeat

**Demo Impact:**

- Low: Catalog feels "empty"
- Medium: Cannot showcase advanced filtering features effectively
- High: Less impressive portfolio presentation

## Proposed Solutions

### Option 1: Expand to 20-30 Products

**Approach:**

- Add 15-24 more mock products
- Include diverse categories (electronics, components, tools, accessories)
- Add realistic variations (colors, sizes, models)
- Use consistent product images (Unsplash or AI-generated)

**Pros:**

- Fills the catalog nicely
- Shows product variety
- Better showcase of filtering and pagination
- More impressive for portfolio

**Cons:**

- More data to maintain
- Larger file size
- More typing required

**Effort:** 2-3 hours

**Risk:** Low

---

### Option 2: Generate Products with Data Factory

**Approach:**

- Create `mockDataFactory` composable
- Generate 30-50 products programmatically
- Randomize within realistic constraints (prices 10-2000, various categories)
- Keep existing 6 as "featured" products

**Pros:**

- Scalable to many products
- Quick to add more
- Consistent data patterns
- Easy to regenerate

**Cons:**

- Less realistic variety
- May create unrealistic combinations
- Harder to control quality

**Effort:** 3-4 hours

**Risk:** Medium

---

### Option 3: Keep Current 6, Add More Placeholders

**Approach:**

- Keep existing 6 detailed products
- Add 50+ placeholder products (minimal details)
- Use placeholder images from placeholder.com services
- Focus on featured/high-quality items

**Pros:**

- Quick to implement
- Keeps 6 high-quality products
- Shows catalog scale
- Minimal effort

**Cons:**

- Placeholders look generic
- Inconsistent product quality
- Less impressive for detailed views

**Effort:** 1-2 hours

**Risk:** Low

---

## Recommended Action

**To be filled during triage.** Recommend Option 1 (20-30 curated products) for best portfolio impact.

## Technical Details

**Affected files:**

- `server/api/products/[id].get.ts:10-320` - Mock products array
- `server/api/products/search.post.ts:15-178` - Mock products array
- `server/api/products/new-products.get.ts:7-265` - Mock products array
- `server/api/products/[path].get.ts` - Mock products array
- Consider creating: `server/utils/mockProducts.ts` - Shared mock data

**Related components:**

- All product listing pages
- Product detail pages
- Search components
- Category pages
- Similar products section

**No database changes**

## Resources

- **Image Sources:**

  - Unsplash: https://unsplash.com/
  - Pexels: https://www.pexels.com/
  - Placeholder services: https://placeholder.com/

- **Demo Context:** Portfolio showcase, not production

## Acceptance Criteria

- [ ] 20-30 mock products added to shared mock data file
- [ ] Products cover diverse categories (electronics, components, tools, accessories)
- [ ] Each product has: \_id, name, category, price, stock, images, description
- [ ] Product images are consistent (same style/quality)
- [ ] All 4 product endpoints import from shared mock data
- [ ] Product listings show variety and feel complete
- [ ] Pagination is visually demonstrable
- [ ] Categories have multiple products each
- [ ] Similar products recommendations work with expanded data

## Work Log

### 2026-02-14 - Initial Assessment

**By:** Portfolio Demo Review

**Actions:**

- Reviewed current mock product data (6 products only)
- Analyzed impact on demo presentation
- Evaluated 3 approaches to expansion
- Identified all files using mock products

**Learnings:**

- 6 products is too few for portfolio showcase
- 20-30 products is sweet spot (fills catalog, manageable)
- Shared mock data file would eliminate duplication (4 files currently)
- Consistent product images are important for visual appeal
- Related to mock data in cart and orders

### 2026-02-15 - Implementation

**By:** Implementation

**Actions:**

- Created shared mock data file: `server/utils/mockProducts.ts`
- Expanded from 6 to 24 products (added 18 products)
- Added diverse categories: Electronics, Components, Audio, Wearables, Tools, Accessories, Office, Home
- Updated all 4 API files to import from shared mock data:
- `server/api/products/[id].get.ts`
- `server/api/products/[path].get.ts`
- `server/api/products/search.post.ts`
- `server/api/products/new-products.get.ts`
- Used consistent Unsplash images across all products
- Maintained realistic price ranges and product details

**Outcome:**

- Product catalog now has 24 products (4x expansion)
- Eliminated code duplication across 4 files
- Better showcases pagination, filtering, and search features
- Demo feels more complete and professional

**Status:** Completed.

---

## Notes

- **Recommendation:** Option 1 (20-30 curated products) for best portfolio quality
- **Priority:** High impact on demo visual appeal
- **Related:** Issue #002 (sample dashboard data) - both improve mock data richness
