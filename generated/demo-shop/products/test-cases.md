# demo-shop › products — Test Cases

> As a shopper I can browse and sort products and add or remove them from my cart.

Generated 2026-09-27 by `reference-transcript (replayed)` (replay).

## Coverage summary

Covers catalogue rendering, all four sort options (with a boundary check on 1- vs 2-digit prices), and cart badge add/remove/persistence. Not covered here: cart page contents and checkout (separate module), images, responsive layout.

## Run metrics

| Agent turns | Tool calls | Grounding rejections | Input tokens | Output tokens | Duration |
|---|---|---|---|---|---|
| 7 | 7 | 0 | n/a (replay) | n/a (replay) | 3.3s |

Validated: 7 · Suspected defect: 1

## Index

| ID | Title | Type | Priority | Status |
|---|---|---|---|---|
| [TC-PRODUCTS-001](#tc-products-001) | Show every product with a name and a price | functional | P0 | Validated |
| [TC-PRODUCTS-002](#tc-products-002) | Default order is name A to Z | functional | P2 | Validated |
| [TC-PRODUCTS-003](#tc-products-003) | Sort by name Z to A | functional | P2 | Validated |
| [TC-PRODUCTS-004](#tc-products-004) | Sort by price low to high | functional | P1 | Validated |
| [TC-PRODUCTS-005](#tc-products-005) | Sort by price high to low | boundary | P1 | Suspected defect |
| [TC-PRODUCTS-006](#tc-products-006) | Adding a product shows it in the cart badge | functional | P0 | Validated |
| [TC-PRODUCTS-007](#tc-products-007) | Removing the last product hides the cart badge | state-transition | P1 | Validated |
| [TC-PRODUCTS-008](#tc-products-008) | Cart badge persists across page reloads | functional | P2 | Validated |

### TC-PRODUCTS-001

**Show every product with a name and a price**

- **Objective:** Catalogue renders completely.
- **Type / priority:** functional · P0 · _Equivalence partitioning_
- **Tags:** `smoke` `catalogue`
- **Preconditions:** Signed in as demo
- **Automation status:** Validated

| # | Action | Expected result |
|---|---|---|
| 1 | Open /products.html | The "Products" heading is visible; 5 × [product-name] are shown; 5 × [product-price] are shown |

**Expected result:** 5 products, each with a price.

### TC-PRODUCTS-002

**Default order is name A to Z**

- **Objective:** Default sort is predictable.
- **Type / priority:** functional · P2 · _Equivalence partitioning_
- **Tags:** `sorting`
- **Preconditions:** Signed in as demo
- **Automation status:** Validated

| # | Action | Expected result |
|---|---|---|
| 1 | Open /products.html | [sort] has value "name-asc"; [product-name] are sorted by name (ascending) |

**Expected result:** Products are alphabetical.

### TC-PRODUCTS-003

**Sort by name Z to A**

- **Objective:** Name sort descending.
- **Type / priority:** functional · P2 · _Equivalence partitioning (each sort option)_
- **Tags:** `sorting`
- **Preconditions:** Signed in as demo
- **Automation status:** Validated

| # | Action | Expected result |
|---|---|---|
| 1 | Open /products.html |  |
| 2 | Select "name-desc" in [sort] | [product-name] are sorted by name (descending) |

**Expected result:** Products are reverse-alphabetical.

### TC-PRODUCTS-004

**Sort by price low to high**

- **Objective:** Numeric price sort ascending.
- **Type / priority:** functional · P1 · _Equivalence partitioning (each sort option)_
- **Tags:** `sorting`
- **Preconditions:** Signed in as demo
- **Automation status:** Validated

| # | Action | Expected result |
|---|---|---|
| 1 | Open /products.html |  |
| 2 | Select "price-asc" in [sort] | [product-price] are sorted by value (ascending) |

**Expected result:** Cheapest product first.

### TC-PRODUCTS-005

**Sort by price high to low**

- **Objective:** Numeric price sort descending; prices with different digit counts ($4.99 vs $49.99) expose string-vs-number sorting.
- **Type / priority:** boundary · P1 · _Boundary value analysis (1- vs 2-digit prices)_
- **Tags:** `sorting`
- **Preconditions:** Signed in as demo
- **Automation status:** Suspected defect — 'Price (high to low)' orders prices as strings: $4.99 appears right after $49.99. Expected numeric descending order.

| # | Action | Expected result |
|---|---|---|
| 1 | Open /products.html |  |
| 2 | Select "price-desc" in [sort] | [product-price] are sorted by value (descending) |

**Expected result:** Most expensive product first, cheapest last.

### TC-PRODUCTS-006

**Adding a product shows it in the cart badge**

- **Objective:** Cart badge reflects additions.
- **Type / priority:** functional · P0 · _State transition (empty cart → 1 item)_
- **Tags:** `cart` `smoke`
- **Preconditions:** Signed in as demo
- **Automation status:** Validated

| # | Action | Expected result |
|---|---|---|
| 1 | Open /products.html | [cart-count] is not displayed |
| 2 | Click [add-water-bottle] | [cart-count] reads "1"; [remove-water-bottle] is visible |

**Expected result:** Badge shows 1 and the button switches to Remove.

### TC-PRODUCTS-007

**Removing the last product hides the cart badge**

- **Objective:** Cart badge reflects removals.
- **Type / priority:** state-transition · P1 · _State transition (1 item → empty cart)_
- **Tags:** `cart`
- **Preconditions:** Signed in as demo
- **Automation status:** Validated

| # | Action | Expected result |
|---|---|---|
| 1 | Open /products.html |  |
| 2 | Click [add-water-bottle] |  |
| 3 | Click [remove-water-bottle] | [cart-count] is not displayed; [add-water-bottle] is visible |

**Expected result:** Badge disappears and the button reverts to Add to cart.

### TC-PRODUCTS-008

**Cart badge persists across page reloads**

- **Objective:** Cart state survives navigation.
- **Type / priority:** functional · P2 · _State transition_
- **Tags:** `cart`
- **Preconditions:** Signed in as demo
- **Automation status:** Validated

| # | Action | Expected result |
|---|---|---|
| 1 | Open /products.html |  |
| 2 | Click [add-water-bottle] |  |
| 3 | Click [add-backpack] | [cart-count] reads "2" |
| 4 | Open /products.html | [cart-count] reads "2" |

**Expected result:** Badge still shows 2 after reload.
