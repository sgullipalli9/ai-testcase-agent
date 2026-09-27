# saucedemo › checkout — Test Cases

> As a shopper I can enter my details, review the order totals and complete the purchase.

Generated 2026-09-26 by `reference test design (not machine-validated)` (reference).

## Coverage summary

Required-field validation for each customer field, overview totals (item total, 8% tax, total), cancel paths from both steps, and successful order completion that empties the cart. Not covered: payment/shipping information is static in this app; error_user checkout defects belong to a negative-persona suite.

## Index

| ID | Title | Type | Priority | Status |
|---|---|---|---|---|
| [TC-CHECKOUT-001](#tc-checkout-001) | Complete a purchase end to end | e2e | P0 | Not validated |
| [TC-CHECKOUT-002](#tc-checkout-002) | Require first name | negative | P1 | Not validated |
| [TC-CHECKOUT-003](#tc-checkout-003) | Require last name | negative | P1 | Not validated |
| [TC-CHECKOUT-004](#tc-checkout-004) | Require postal code | negative | P1 | Not validated |
| [TC-CHECKOUT-005](#tc-checkout-005) | Overview shows correct item total, tax and total | functional | P0 | Not validated |
| [TC-CHECKOUT-006](#tc-checkout-006) | Overview totals for two items | boundary | P1 | Not validated |
| [TC-CHECKOUT-007](#tc-checkout-007) | Cancel on customer information returns to cart | state-transition | P2 | Not validated |
| [TC-CHECKOUT-008](#tc-checkout-008) | Cancel on overview returns to inventory without ordering | state-transition | P2 | Not validated |
| [TC-CHECKOUT-009](#tc-checkout-009) | Back Home after order returns to inventory | functional | P3 | Not validated |

### TC-CHECKOUT-001

**Complete a purchase end to end**

- **Objective:** Core purchase flow works.
- **Type / priority:** e2e · P0 · _Use-case testing_
- **Tags:** `smoke` `checkout`
- **Preconditions:** Logged in as standard_user
- **Automation status:** Not validated

| # | Action | Expected result |
|---|---|---|
| 1 | Open /inventory.html |  |
| 2 | Click [add-to-cart-sauce-labs-backpack] |  |
| 3 | Click [shopping-cart-link] |  |
| 4 | Click [checkout] | The URL contains "/checkout-step-one.html" |
| 5 | Enter "Ada" in [firstName] |  |
| 6 | Enter "Lovelace" in [lastName] |  |
| 7 | Enter "98101" in [postalCode] |  |
| 8 | Click [continue] | The URL contains "/checkout-step-two.html" |
| 9 | Click [finish] | The URL contains "/checkout-complete.html"; [complete-header] reads "Thank you for your order!"; [shopping-cart-badge] is not displayed |

**Expected result:** Order confirmation is shown and the cart badge is cleared.

### TC-CHECKOUT-002

**Require first name**

- **Objective:** Required-field validation (first name).
- **Type / priority:** negative · P1 · _Equivalence partitioning (empty input)_
- **Tags:** `validation`
- **Preconditions:** Logged in as standard_user
- **Automation status:** Not validated

| # | Action | Expected result |
|---|---|---|
| 1 | Open /inventory.html |  |
| 2 | Click [add-to-cart-sauce-labs-backpack] |  |
| 3 | Click [shopping-cart-link] |  |
| 4 | Click [checkout] | The URL contains "/checkout-step-one.html" |
| 5 | Enter "Lovelace" in [lastName] |  |
| 6 | Enter "98101" in [postalCode] |  |
| 7 | Click [continue] | [error] contains "First Name is required"; The URL contains "/checkout-step-one.html" |

**Expected result:** Error 'Error: First Name is required'; user stays on step one.

### TC-CHECKOUT-003

**Require last name**

- **Objective:** Required-field validation (last name).
- **Type / priority:** negative · P1 · _Equivalence partitioning (empty input)_
- **Tags:** `validation`
- **Preconditions:** Logged in as standard_user
- **Automation status:** Not validated

| # | Action | Expected result |
|---|---|---|
| 1 | Open /inventory.html |  |
| 2 | Click [add-to-cart-sauce-labs-backpack] |  |
| 3 | Click [shopping-cart-link] |  |
| 4 | Click [checkout] | The URL contains "/checkout-step-one.html" |
| 5 | Enter "Ada" in [firstName] |  |
| 6 | Enter "98101" in [postalCode] |  |
| 7 | Click [continue] | [error] contains "Last Name is required" |

**Expected result:** Error 'Error: Last Name is required'.

### TC-CHECKOUT-004

**Require postal code**

- **Objective:** Required-field validation (postal code).
- **Type / priority:** negative · P1 · _Equivalence partitioning (empty input)_
- **Tags:** `validation`
- **Preconditions:** Logged in as standard_user
- **Automation status:** Not validated

| # | Action | Expected result |
|---|---|---|
| 1 | Open /inventory.html |  |
| 2 | Click [add-to-cart-sauce-labs-backpack] |  |
| 3 | Click [shopping-cart-link] |  |
| 4 | Click [checkout] | The URL contains "/checkout-step-one.html" |
| 5 | Enter "Ada" in [firstName] |  |
| 6 | Enter "Lovelace" in [lastName] |  |
| 7 | Click [continue] | [error] contains "Postal Code is required" |

**Expected result:** Error 'Error: Postal Code is required'.

### TC-CHECKOUT-005

**Overview shows correct item total, tax and total**

- **Objective:** Order maths are correct (8% tax).
- **Type / priority:** functional · P0 · _Equivalence partitioning_
- **Tags:** `pricing`
- **Preconditions:** Logged in as standard_user
- **Automation status:** Not validated

| # | Action | Expected result |
|---|---|---|
| 1 | Open /inventory.html |  |
| 2 | Click [add-to-cart-sauce-labs-backpack] |  |
| 3 | Click [shopping-cart-link] |  |
| 4 | Click [checkout] | The URL contains "/checkout-step-one.html" |
| 5 | Enter "Ada" in [firstName] |  |
| 6 | Enter "Lovelace" in [lastName] |  |
| 7 | Enter "98101" in [postalCode] |  |
| 8 | Click [continue] | [subtotal-label] contains "Item total: $29.99"; [tax-label] contains "Tax: $2.40"; [total-label] contains "Total: $32.39" |

**Expected result:** Item total $29.99, tax $2.40, total $32.39.

### TC-CHECKOUT-006

**Overview totals for two items**

- **Objective:** Totals aggregate multiple items.
- **Type / priority:** boundary · P1 · _Boundary value analysis (1 → many items)_
- **Tags:** `pricing`
- **Preconditions:** Logged in as standard_user
- **Automation status:** Not validated

| # | Action | Expected result |
|---|---|---|
| 1 | Open /inventory.html |  |
| 2 | Click [add-to-cart-sauce-labs-backpack] |  |
| 3 | Click [add-to-cart-sauce-labs-bike-light] |  |
| 4 | Click [shopping-cart-link] |  |
| 5 | Click [checkout] |  |
| 6 | Enter "Ada" in [firstName] |  |
| 7 | Enter "Lovelace" in [lastName] |  |
| 8 | Enter "98101" in [postalCode] |  |
| 9 | Click [continue] | 2 × [inventory-item] are shown; [subtotal-label] contains "Item total: $39.98"; [tax-label] contains "Tax: $3.20"; [total-label] contains "Total: $43.18" |

**Expected result:** Item total $39.98, tax $3.20, total $43.18.

### TC-CHECKOUT-007

**Cancel on customer information returns to cart**

- **Objective:** Cancel path from step one keeps the cart.
- **Type / priority:** state-transition · P2 · _State transition_
- **Tags:** `navigation`
- **Preconditions:** Logged in as standard_user
- **Automation status:** Not validated

| # | Action | Expected result |
|---|---|---|
| 1 | Open /inventory.html |  |
| 2 | Click [add-to-cart-sauce-labs-backpack] |  |
| 3 | Click [shopping-cart-link] |  |
| 4 | Click [checkout] | The URL contains "/checkout-step-one.html" |
| 5 | Click [cancel] | The URL contains "/cart.html"; 1 × [inventory-item] are shown |

**Expected result:** User is back on the cart with the item still present.

### TC-CHECKOUT-008

**Cancel on overview returns to inventory without ordering**

- **Objective:** Cancel path from step two does not place the order.
- **Type / priority:** state-transition · P2 · _State transition_
- **Tags:** `navigation`
- **Preconditions:** Logged in as standard_user
- **Automation status:** Not validated

| # | Action | Expected result |
|---|---|---|
| 1 | Open /inventory.html |  |
| 2 | Click [add-to-cart-sauce-labs-backpack] |  |
| 3 | Click [shopping-cart-link] |  |
| 4 | Click [checkout] | The URL contains "/checkout-step-one.html" |
| 5 | Enter "Ada" in [firstName] |  |
| 6 | Enter "Lovelace" in [lastName] |  |
| 7 | Enter "98101" in [postalCode] |  |
| 8 | Click [continue] |  |
| 9 | Click [cancel] | The URL contains "/inventory.html"; [shopping-cart-badge] reads "1" |

**Expected result:** Inventory is shown and the cart still holds 1 item.

### TC-CHECKOUT-009

**Back Home after order returns to inventory**

- **Objective:** Post-purchase navigation.
- **Type / priority:** functional · P3 · _Use-case testing_
- **Tags:** `navigation`
- **Preconditions:** Logged in as standard_user
- **Automation status:** Not validated

| # | Action | Expected result |
|---|---|---|
| 1 | Open /inventory.html |  |
| 2 | Click [add-to-cart-sauce-labs-backpack] |  |
| 3 | Click [shopping-cart-link] |  |
| 4 | Click [checkout] | The URL contains "/checkout-step-one.html" |
| 5 | Enter "Ada" in [firstName] |  |
| 6 | Enter "Lovelace" in [lastName] |  |
| 7 | Enter "98101" in [postalCode] |  |
| 8 | Click [continue] |  |
| 9 | Click [finish] |  |
| 10 | Click [back-to-products] | The URL contains "/inventory.html" |

**Expected result:** User returns to the inventory.
