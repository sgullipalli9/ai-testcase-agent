# demo-shop › login — Test Cases

> As a shopper I can sign in and I get a clear message when sign-in fails.

Generated 2026-09-27 by `reference-transcript (replayed)` (replay).

## Coverage summary

Covers the happy path, required-field validation for both fields, invalid and unknown credentials (incl. user-enumeration check), locked account, protected-route redirect and logout. Not covered: password masking/visual checks, brute-force throttling (not implemented by the app), keyboard-only sign-in (candidate for an accessibility pass).

## Run metrics

| Agent turns | Tool calls | Grounding rejections | Input tokens | Output tokens | Duration |
|---|---|---|---|---|---|
| 10 | 16 | 1 | n/a (replay) | n/a (replay) | 9.1s |

Validated: 7 · Healed: 1

## Index

| ID | Title | Type | Priority | Status |
|---|---|---|---|---|
| [TC-LOGIN-001](#tc-login-001) | Sign in with valid credentials | functional | P0 | Validated |
| [TC-LOGIN-002](#tc-login-002) | Reject sign-in when username is empty | negative | P1 | Validated |
| [TC-LOGIN-003](#tc-login-003) | Reject sign-in when password is empty | negative | P1 | Validated |
| [TC-LOGIN-004](#tc-login-004) | Reject sign-in with a wrong password | negative | P0 | Validated |
| [TC-LOGIN-005](#tc-login-005) | Block sign-in for a locked account | negative | P1 | Healed |
| [TC-LOGIN-006](#tc-login-006) | Do not reveal whether a username exists | security | P2 | Validated |
| [TC-LOGIN-007](#tc-login-007) | Redirect anonymous users away from protected pages | security | P0 | Validated |
| [TC-LOGIN-008](#tc-login-008) | Log out ends the session | state-transition | P1 | Validated |

### TC-LOGIN-001

**Sign in with valid credentials**

- **Objective:** Core happy path: a registered user reaches the product catalogue.
- **Type / priority:** functional · P0 · _Equivalence partitioning (valid class)_
- **Tags:** `smoke` `auth`
- **Preconditions:** User demo/demo123 exists
- **Automation status:** Validated

| # | Action | Expected result |
|---|---|---|
| 1 | Open / |  |
| 2 | Enter "demo" in [username] |  |
| 3 | Enter "demo123" in [password] |  |
| 4 | Click [login-button] | The URL contains "/products.html"; The "Products" heading is visible |

**Expected result:** User lands on the Products page.

### TC-LOGIN-002

**Reject sign-in when username is empty**

- **Objective:** Required-field validation for username.
- **Type / priority:** negative · P1 · _Equivalence partitioning (empty input)_
- **Tags:** `validation`
- **Preconditions:** None
- **Automation status:** Validated

| # | Action | Expected result |
|---|---|---|
| 1 | Open / |  |
| 2 | Enter "demo123" in [password] |  |
| 3 | Click [login-button] | [login-error] contains "Username is required"; The URL contains "localhost:4173/" |

**Expected result:** Error 'Username is required' is shown and the user stays on the sign-in page.

### TC-LOGIN-003

**Reject sign-in when password is empty**

- **Objective:** Required-field validation for password.
- **Type / priority:** negative · P1 · _Equivalence partitioning (empty input)_
- **Tags:** `validation`
- **Preconditions:** None
- **Automation status:** Validated

| # | Action | Expected result |
|---|---|---|
| 1 | Open / |  |
| 2 | Enter "demo" in [username] |  |
| 3 | Click [login-button] | [login-error] contains "Password is required" |

**Expected result:** Error 'Password is required' is shown.

### TC-LOGIN-004

**Reject sign-in with a wrong password**

- **Objective:** Invalid credentials must not authenticate.
- **Type / priority:** negative · P0 · _Equivalence partitioning (invalid class)_
- **Tags:** `auth`
- **Preconditions:** None
- **Automation status:** Validated

| # | Action | Expected result |
|---|---|---|
| 1 | Open / |  |
| 2 | Enter "demo" in [username] |  |
| 3 | Enter "wrong-password" in [password] |  |
| 4 | Click [login-button] | [login-error] contains "Invalid username or password"; [login-button] is visible |

**Expected result:** Generic invalid-credentials error; no session is created.

### TC-LOGIN-005

**Block sign-in for a locked account**

- **Objective:** Locked accounts cannot sign in and get a specific message.
- **Type / priority:** negative · P1 · _Decision table (valid password × locked flag)_
- **Tags:** `auth`
- **Preconditions:** User 'locked' is locked
- **Automation status:** Healed — Expected text did not match the real message; updated to 'This account is locked' observed on the page.

| # | Action | Expected result |
|---|---|---|
| 1 | Open / |  |
| 2 | Enter "locked" in [username] |  |
| 3 | Enter "demo123" in [password] |  |
| 4 | Click [login-button] | [login-error] contains "This account is locked" |

**Expected result:** Error explains the account is locked.

### TC-LOGIN-006

**Do not reveal whether a username exists**

- **Objective:** Unknown users get the same message as wrong passwords (no user enumeration).
- **Type / priority:** security · P2 · _Error guessing_
- **Tags:** `auth` `security`
- **Preconditions:** None
- **Automation status:** Validated

| # | Action | Expected result |
|---|---|---|
| 1 | Open / |  |
| 2 | Enter "ghost-user" in [username] |  |
| 3 | Enter "demo123" in [password] |  |
| 4 | Click [login-button] | [login-error] contains "Invalid username or password" |

**Expected result:** Same generic error as TC-LOGIN-004.

### TC-LOGIN-007

**Redirect anonymous users away from protected pages**

- **Objective:** Protected pages require a session.
- **Type / priority:** security · P0 · _State transition (anonymous → protected page)_
- **Tags:** `auth` `routing`
- **Preconditions:** No active session
- **Automation status:** Validated

| # | Action | Expected result |
|---|---|---|
| 1 | Open /products.html | The URL contains "error=login-required"; [login-error] contains "Please log in to continue" |

**Expected result:** User is sent to sign-in with 'Please log in to continue'.

### TC-LOGIN-008

**Log out ends the session**

- **Objective:** After logout the protected page is no longer reachable.
- **Type / priority:** state-transition · P1 · _State transition (authenticated → logged out)_
- **Tags:** `auth` `session`
- **Preconditions:** User demo/demo123 exists
- **Automation status:** Validated

| # | Action | Expected result |
|---|---|---|
| 1 | Open / |  |
| 2 | Enter "demo" in [username] |  |
| 3 | Enter "demo123" in [password] |  |
| 4 | Click [login-button] | The "Products" heading is visible |
| 5 | Click [logout] | [login-button] is visible |
| 6 | Open /products.html | The URL contains "error=login-required" |

**Expected result:** User returns to sign-in and cannot reach /products.html without logging in again.
