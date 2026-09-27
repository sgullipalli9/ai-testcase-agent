# saucedemo › cart — Test Cases

> As a shopper I can review the items in my cart, remove them, and move on to checkout.

Generated 2026-09-26 by `reference test design (not machine-validated)` (reference).

## Coverage summary

Cart contents (name, quantity, price), removing items, empty-cart state, continue shopping, and entry to checkout. Not covered: quantity editing (not supported by the app), cart persistence across devices.

## Index

| ID | Title | Type | Priority | Status |
|---|---|---|---|---|
| [TC-CART-001](#tc-cart-001) | Cart lists an added product with quantity and price | functional | P0 | Not validated |
| [TC-CART-002](#tc-cart-002) | Remove an item from the cart | functional | P1 | Not validated |
| [TC-CART-003](#tc-cart-003) | Empty cart shows no items | boundary | P2 | Not validated |
| [TC-CART-004](#tc-cart-004) | Continue shopping returns to the inventory | functional | P2 | Not validated |
| [TC-CART-005](#tc-cart-005) | Checkout button opens customer information step | functional | P0 | Not validated |
| [TC-CART-006](#tc-cart-006) | Cart keeps multiple items in order of addition | functional | P2 | Not validated |

### TC-CART-001

**Cart lists an added product with quantity and price**

- **Objective:** Cart reflects what was added.
- **Type / priority:** functional · P0 · _Use-case testing_
- **Tags:** `smoke` `cart`
- **Preconditions:** Logged in as standard_user
- **Automation status:** Not validated

| # | Action | Expected result |
|---|---|---|
| 1 | Open /inventory.html |  |
| 2 | Click [add-to-cart-sauce-labs-backpack] |  |
| 3 | Click [shopping-cart-link] | The URL contains "/cart.html"; [title] reads "Your Cart"; 1 × [inventory-item] are shown; [inventory-item-name] reads "Sauce Labs Backpack"; [item-quantity] reads "1"; [inventory-item-price] reads "$29.99" |

**Expected result:** Cart shows 1 × Sauce Labs Backpack at $29.99.

### TC-CART-002

**Remove an item from the cart**

- **Objective:** Items can be removed on the cart page.
- **Type / priority:** functional · P1 · _State transition (1 item → empty)_
- **Tags:** `cart`
- **Preconditions:** Logged in as standard_user
- **Automation status:** Not validated

| # | Action | Expected result |
|---|---|---|
| 1 | Open /inventory.html |  |
| 2 | Click [add-to-cart-sauce-labs-backpack] |  |
| 3 | Click [shopping-cart-link] |  |
| 4 | Click [remove-sauce-labs-backpack] | 0 × [inventory-item] are shown; [shopping-cart-badge] is not displayed |

**Expected result:** Item disappears and the badge is cleared.

### TC-CART-003

**Empty cart shows no items**

- **Objective:** Empty state is handled.
- **Type / priority:** boundary · P2 · _Boundary value analysis (0 items)_
- **Tags:** `cart`
- **Preconditions:** Logged in as standard_user; Cart is empty
- **Automation status:** Not validated

| # | Action | Expected result |
|---|---|---|
| 1 | Open /cart.html | [title] reads "Your Cart"; 0 × [inventory-item] are shown; [checkout] is visible |

**Expected result:** No items listed; page still renders its actions.

### TC-CART-004

**Continue shopping returns to the inventory**

- **Objective:** Navigation back to catalogue keeps the cart.
- **Type / priority:** functional · P2 · _Use-case testing_
- **Tags:** `navigation`
- **Preconditions:** Logged in as standard_user
- **Automation status:** Not validated

| # | Action | Expected result |
|---|---|---|
| 1 | Open /inventory.html |  |
| 2 | Click [add-to-cart-sauce-labs-backpack] |  |
| 3 | Click [shopping-cart-link] |  |
| 4 | Click [continue-shopping] | The URL contains "/inventory.html"; [shopping-cart-badge] reads "1" |

**Expected result:** Inventory is shown and the badge still shows 1.

### TC-CART-005

**Checkout button opens customer information step**

- **Objective:** Cart → checkout transition.
- **Type / priority:** functional · P0 · _State transition_
- **Tags:** `checkout` `smoke`
- **Preconditions:** Logged in as standard_user
- **Automation status:** Not validated

| # | Action | Expected result |
|---|---|---|
| 1 | Open /inventory.html |  |
| 2 | Click [add-to-cart-sauce-labs-backpack] |  |
| 3 | Click [shopping-cart-link] |  |
| 4 | Click [checkout] | The URL contains "/checkout-step-one.html"; [title] reads "Checkout: Your Information" |

**Expected result:** Checkout step one is displayed.

### TC-CART-006

**Cart keeps multiple items in order of addition**

- **Objective:** Multiple distinct items are all listed.
- **Type / priority:** functional · P2 · _Equivalence partitioning (many items)_
- **Tags:** `cart`
- **Preconditions:** Logged in as standard_user
- **Automation status:** Not validated

| # | Action | Expected result |
|---|---|---|
| 1 | Open /inventory.html |  |
| 2 | Click [add-to-cart-sauce-labs-bike-light] |  |
| 3 | Click [add-to-cart-sauce-labs-backpack] |  |
| 4 | Click [shopping-cart-link] | 2 × [inventory-item] are shown; [inventory-item-name] #1 reads "Sauce Labs Bike Light" |

**Expected result:** Both items are listed, bike light first.
