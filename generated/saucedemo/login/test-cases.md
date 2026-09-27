# saucedemo › login — Test Cases

> As a shopper I can sign in with valid credentials and am told clearly why a sign-in failed.

Generated 2026-09-26 by `reference test design (not machine-validated)` (reference).

## Coverage summary

Happy path, required-field validation (username, password, both), invalid and locked-out credentials, dismissible error banner, protected-route access without a session, and logout. Not covered: performance_glitch_user latency SLAs (belongs in a performance suite) and visual_user rendering differences (visual regression).

## Index

| ID | Title | Type | Priority | Status |
|---|---|---|---|---|
| [TC-LOGIN-001](#tc-login-001) | Sign in as standard_user | functional | P0 | Not validated |
| [TC-LOGIN-002](#tc-login-002) | Reject sign-in with empty username | negative | P1 | Not validated |
| [TC-LOGIN-003](#tc-login-003) | Reject sign-in with empty password | negative | P1 | Not validated |
| [TC-LOGIN-004](#tc-login-004) | Username rule wins when both fields are empty | boundary | P3 | Not validated |
| [TC-LOGIN-005](#tc-login-005) | Reject sign-in with a wrong password | negative | P0 | Not validated |
| [TC-LOGIN-006](#tc-login-006) | Block sign-in for locked_out_user | negative | P0 | Not validated |
| [TC-LOGIN-007](#tc-login-007) | Dismiss the login error banner | ui | P3 | Not validated |
| [TC-LOGIN-008](#tc-login-008) | Block direct access to inventory without a session | security | P0 | Not validated |
| [TC-LOGIN-009](#tc-login-009) | Logout ends the session | state-transition | P1 | Not validated |

### TC-LOGIN-001

**Sign in as standard_user**

- **Objective:** Core happy path reaches the inventory.
- **Type / priority:** functional · P0 · _Equivalence partitioning (valid class)_
- **Tags:** `smoke` `auth`
- **Preconditions:** Account standard_user exists
- **Automation status:** Not validated

| # | Action | Expected result |
|---|---|---|
| 1 | Open / |  |
| 2 | Enter "standard_user" in [username] |  |
| 3 | Enter "secret_sauce" in [password] |  |
| 4 | Click [login-button] | The URL contains "/inventory.html"; [title] reads "Products"; [inventory-list] is visible |

**Expected result:** User lands on /inventory.html and the Products list is visible.

### TC-LOGIN-002

**Reject sign-in with empty username**

- **Objective:** Required-field validation for username.
- **Type / priority:** negative · P1 · _Equivalence partitioning (empty input)_
- **Tags:** `validation`
- **Preconditions:** None
- **Automation status:** Not validated

| # | Action | Expected result |
|---|---|---|
| 1 | Open / |  |
| 2 | Enter "secret_sauce" in [password] |  |
| 3 | Click [login-button] | [error] contains "Username is required" |

**Expected result:** Error 'Epic sadface: Username is required' is shown.

### TC-LOGIN-003

**Reject sign-in with empty password**

- **Objective:** Required-field validation for password.
- **Type / priority:** negative · P1 · _Equivalence partitioning (empty input)_
- **Tags:** `validation`
- **Preconditions:** None
- **Automation status:** Not validated

| # | Action | Expected result |
|---|---|---|
| 1 | Open / |  |
| 2 | Enter "standard_user" in [username] |  |
| 3 | Click [login-button] | [error] contains "Password is required" |

**Expected result:** Error 'Epic sadface: Password is required' is shown.

### TC-LOGIN-004

**Username rule wins when both fields are empty**

- **Objective:** Validation order is deterministic when several fields are invalid.
- **Type / priority:** boundary · P3 · _Decision table_
- **Tags:** `validation`
- **Preconditions:** None
- **Automation status:** Not validated

| # | Action | Expected result |
|---|---|---|
| 1 | Open / |  |
| 2 | Click [login-button] | [error] contains "Username is required" |

**Expected result:** Only the username error is shown.

### TC-LOGIN-005

**Reject sign-in with a wrong password**

- **Objective:** Invalid credentials must not authenticate; message must not reveal which field is wrong.
- **Type / priority:** negative · P0 · _Equivalence partitioning (invalid class)_
- **Tags:** `auth` `security`
- **Preconditions:** None
- **Automation status:** Not validated

| # | Action | Expected result |
|---|---|---|
| 1 | Open / |  |
| 2 | Enter "standard_user" in [username] |  |
| 3 | Enter "wrong_password" in [password] |  |
| 4 | Click [login-button] | [error] contains "Username and password do not match any user in this service"; [login-button] is visible |

**Expected result:** Generic credentials error; user remains on the login page.

### TC-LOGIN-006

**Block sign-in for locked_out_user**

- **Objective:** Locked accounts are refused with a specific message.
- **Type / priority:** negative · P0 · _Equivalence partitioning (locked class)_
- **Tags:** `auth`
- **Preconditions:** Account locked_out_user is locked
- **Automation status:** Not validated

| # | Action | Expected result |
|---|---|---|
| 1 | Open / |  |
| 2 | Enter "locked_out_user" in [username] |  |
| 3 | Enter "secret_sauce" in [password] |  |
| 4 | Click [login-button] | [error] contains "Sorry, this user has been locked out." |

**Expected result:** Error 'Epic sadface: Sorry, this user has been locked out.' is shown.

### TC-LOGIN-007

**Dismiss the login error banner**

- **Objective:** Users can clear an error before retrying.
- **Type / priority:** ui · P3 · _Error guessing_
- **Tags:** `ui`
- **Preconditions:** None
- **Automation status:** Not validated

| # | Action | Expected result |
|---|---|---|
| 1 | Open / |  |
| 2 | Click [login-button] | [error] is visible |
| 3 | Click [error-button] | [error] is not displayed |

**Expected result:** Error banner disappears after clicking its close button.

### TC-LOGIN-008

**Block direct access to inventory without a session**

- **Objective:** Protected pages require authentication.
- **Type / priority:** security · P0 · _State transition (anonymous → protected page)_
- **Tags:** `auth` `routing`
- **Preconditions:** No active session
- **Automation status:** Not validated

| # | Action | Expected result |
|---|---|---|
| 1 | Open /inventory.html | [error] contains "You can only access '/inventory.html' when you are logged in" |

**Expected result:** User is shown the login page with an access error.

### TC-LOGIN-009

**Logout ends the session**

- **Objective:** After logout, protected pages are no longer reachable.
- **Type / priority:** state-transition · P1 · _State transition (authenticated → logged out)_
- **Tags:** `auth` `session`
- **Preconditions:** Account standard_user exists
- **Automation status:** Not validated

| # | Action | Expected result |
|---|---|---|
| 1 | Open / |  |
| 2 | Enter "standard_user" in [username] |  |
| 3 | Enter "secret_sauce" in [password] |  |
| 4 | Click [login-button] | The URL contains "/inventory.html" |
| 5 | Click the "Open Menu" button |  |
| 6 | Click [logout-sidebar-link] | [login-button] is visible |
| 7 | Open /inventory.html | [error] is visible |

**Expected result:** User returns to login; revisiting /inventory.html shows the access error.
