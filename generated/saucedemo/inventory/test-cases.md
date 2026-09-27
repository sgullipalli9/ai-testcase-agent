# saucedemo › inventory — Test Cases

> As a shopper I can browse products, sort them, open a product and add/remove items to my cart.

Generated 2026-09-26 by `reference test design (not machine-validated)` (reference).

## Coverage summary

Catalogue rendering, all four sort options (numeric vs text ordering), add/remove updating the cart badge, multiple items, product detail navigation and back. Not covered: problem_user/error_user seeded defects (candidates for a dedicated negative-persona suite), image assets, responsive layout.

## Index

| ID | Title | Type | Priority | Status |
|---|---|---|---|---|
| [TC-INVENTORY-001](#tc-inventory-001) | Show all six products with name and price | functional | P0 | Not validated |
| [TC-INVENTORY-002](#tc-inventory-002) | Default sort is Name (A to Z) | functional | P2 | Not validated |
| [TC-INVENTORY-003](#tc-inventory-003) | Sort by Name (Z to A) | functional | P2 | Not validated |
| [TC-INVENTORY-004](#tc-inventory-004) | Sort by Price (low to high) | functional | P1 | Not validated |
| [TC-INVENTORY-005](#tc-inventory-005) | Sort by Price (high to low) | boundary | P1 | Not validated |
| [TC-INVENTORY-006](#tc-inventory-006) | Add a product updates the cart badge | functional | P0 | Not validated |
| [TC-INVENTORY-007](#tc-inventory-007) | Remove a product clears the cart badge | state-transition | P1 | Not validated |
| [TC-INVENTORY-008](#tc-inventory-008) | Badge counts multiple products | functional | P2 | Not validated |
| [TC-INVENTORY-009](#tc-inventory-009) | Open product details and go back | functional | P1 | Not validated |

### TC-INVENTORY-001

**Show all six products with name and price**

- **Objective:** Catalogue renders completely.
- **Type / priority:** functional · P0 · _Equivalence partitioning_
- **Tags:** `smoke` `catalogue`
- **Preconditions:** Logged in as standard_user
- **Automation status:** Not validated

| # | Action | Expected result |
|---|---|---|
| 1 | Open /inventory.html | 6 × [inventory-item] are shown; 6 × [inventory-item-name] are shown; 6 × [inventory-item-price] are shown |

**Expected result:** 6 products are listed, each with a name and price.

### TC-INVENTORY-002

**Default sort is Name (A to Z)**

- **Objective:** Default ordering is predictable.
- **Type / priority:** functional · P2 · _Equivalence partitioning_
- **Tags:** `sorting`
- **Preconditions:** Logged in as standard_user
- **Automation status:** Not validated

| # | Action | Expected result |
|---|---|---|
| 1 | Open /inventory.html | [product-sort-container] has value "az"; [inventory-item-name] are sorted by name (ascending) |

**Expected result:** Products are in alphabetical order.

### TC-INVENTORY-003

**Sort by Name (Z to A)**

- **Objective:** Descending name sort.
- **Type / priority:** functional · P2 · _Equivalence partitioning (each sort option)_
- **Tags:** `sorting`
- **Preconditions:** Logged in as standard_user
- **Automation status:** Not validated

| # | Action | Expected result |
|---|---|---|
| 1 | Open /inventory.html |  |
| 2 | Select "za" in [product-sort-container] | [inventory-item-name] are sorted by name (descending); [inventory-item-name] #1 reads "Test.allTheThings() T-Shirt (Red)" |

**Expected result:** First product is 'Test.allTheThings() T-Shirt (Red)'; list is reverse-alphabetical.

### TC-INVENTORY-004

**Sort by Price (low to high)**

- **Objective:** Numeric ascending price sort.
- **Type / priority:** functional · P1 · _Equivalence partitioning (each sort option)_
- **Tags:** `sorting`
- **Preconditions:** Logged in as standard_user
- **Automation status:** Not validated

| # | Action | Expected result |
|---|---|---|
| 1 | Open /inventory.html |  |
| 2 | Select "lohi" in [product-sort-container] | [inventory-item-price] are sorted by value (ascending); [inventory-item-price] #1 reads "$7.99" |

**Expected result:** Cheapest item ($7.99) first; prices ascend.

### TC-INVENTORY-005

**Sort by Price (high to low)**

- **Objective:** Numeric descending price sort; mixes 1- and 2-digit prices.
- **Type / priority:** boundary · P1 · _Boundary value analysis ($9.99 vs $49.99)_
- **Tags:** `sorting`
- **Preconditions:** Logged in as standard_user
- **Automation status:** Not validated

| # | Action | Expected result |
|---|---|---|
| 1 | Open /inventory.html |  |
| 2 | Select "hilo" in [product-sort-container] | [inventory-item-price] are sorted by value (descending); [inventory-item-price] #1 reads "$49.99" |

**Expected result:** Most expensive item ($49.99) first; prices descend.

### TC-INVENTORY-006

**Add a product updates the cart badge**

- **Objective:** Cart badge reflects additions.
- **Type / priority:** functional · P0 · _State transition (empty → 1 item)_
- **Tags:** `cart` `smoke`
- **Preconditions:** Logged in as standard_user; Cart is empty
- **Automation status:** Not validated

| # | Action | Expected result |
|---|---|---|
| 1 | Open /inventory.html | [shopping-cart-badge] is not displayed |
| 2 | Click [add-to-cart-sauce-labs-backpack] | [shopping-cart-badge] reads "1"; [remove-sauce-labs-backpack] is visible |

**Expected result:** Badge shows 1; button switches to Remove.

### TC-INVENTORY-007

**Remove a product clears the cart badge**

- **Objective:** Cart badge reflects removals.
- **Type / priority:** state-transition · P1 · _State transition (1 item → empty)_
- **Tags:** `cart`
- **Preconditions:** Logged in as standard_user
- **Automation status:** Not validated

| # | Action | Expected result |
|---|---|---|
| 1 | Open /inventory.html |  |
| 2 | Click [add-to-cart-sauce-labs-backpack] |  |
| 3 | Click [remove-sauce-labs-backpack] | [shopping-cart-badge] is not displayed; [add-to-cart-sauce-labs-backpack] is visible |

**Expected result:** Badge disappears; button reverts to Add to cart.

### TC-INVENTORY-008

**Badge counts multiple products**

- **Objective:** Badge counts distinct items.
- **Type / priority:** functional · P2 · _Equivalence partitioning (many items)_
- **Tags:** `cart`
- **Preconditions:** Logged in as standard_user
- **Automation status:** Not validated

| # | Action | Expected result |
|---|---|---|
| 1 | Open /inventory.html |  |
| 2 | Click [add-to-cart-sauce-labs-backpack] |  |
| 3 | Click [add-to-cart-sauce-labs-bike-light] |  |
| 4 | Click [add-to-cart-sauce-labs-onesie] | [shopping-cart-badge] reads "3" |

**Expected result:** Badge shows 3.

### TC-INVENTORY-009

**Open product details and go back**

- **Objective:** Product detail navigation round-trip.
- **Type / priority:** functional · P1 · _Use-case testing_
- **Tags:** `navigation`
- **Preconditions:** Logged in as standard_user
- **Automation status:** Not validated

| # | Action | Expected result |
|---|---|---|
| 1 | Open /inventory.html |  |
| 2 | Click "Sauce Labs Backpack" | The URL contains "/inventory-item.html"; [inventory-item-name] reads "Sauce Labs Backpack"; [inventory-item-price] contains "$29.99" |
| 3 | Click [back-to-products] | The URL contains "/inventory.html" |

**Expected result:** Detail page shows the backpack at $29.99; Back returns to the list.
