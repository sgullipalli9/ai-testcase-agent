import { defineSite } from '../src/config.js';

/**
 * SauceDemo (https://www.saucedemo.com) — Sauce Labs' public practice e-commerce app.
 * All users share the password below; several users have intentionally injected behaviour.
 */
export default defineSite({
  name: 'saucedemo',
  baseUrl: 'https://www.saucedemo.com',
  description:
    'Swag Labs demo store: users log in, browse a product inventory, add items to a cart, and check out in two steps (customer info, then overview) before the order is completed.',
  testIdAttribute: 'data-test',
  testData: {
    password: 'secret_sauce',
    users: {
      standard_user: 'fully working user',
      locked_out_user: 'is locked out; login must be rejected',
      problem_user: 'known UI defects (images, sorting, form fields)',
      performance_glitch_user: 'slow login',
      error_user: 'errors on some cart/checkout actions',
      visual_user: 'visual differences',
    },
    customer: { firstName: 'Ada', lastName: 'Lovelace', postalCode: '98101' },
  },
  auth: {
    description: 'Log in as standard_user.',
    steps: [
      { action: 'goto', path: '/' },
      { action: 'fill', target: { testId: 'username' }, value: 'standard_user' },
      { action: 'fill', target: { testId: 'password' }, value: 'secret_sauce' },
      { action: 'click', target: { testId: 'login-button' } },
      { action: 'expectUrl', contains: '/inventory.html' },
    ],
  },
  modules: [
    {
      name: 'login',
      description: 'As a shopper I can sign in with valid credentials and am told clearly why a sign-in failed.',
      entryPath: '/',
      requiresAuth: false,
      focus: [
        'successful login lands on inventory',
        'required-field validation for username and password',
        'invalid credentials and locked-out user messages',
        'error message can be dismissed',
        'protected pages redirect unauthenticated users',
        'logout ends the session',
      ],
      minCases: 6,
      maxCases: 10,
    },
    {
      name: 'inventory',
      description: 'As a shopper I can browse products, sort them, open a product and add/remove items to my cart.',
      entryPath: '/inventory.html',
      requiresAuth: true,
      focus: [
        'product list renders with names and prices',
        'sorting by name and price in both directions',
        'add to cart / remove updates the cart badge',
        'product detail page and back navigation',
      ],
      minCases: 6,
      maxCases: 10,
    },
    {
      name: 'cart',
      description: 'As a shopper I can review the items in my cart, remove them, and move on to checkout.',
      entryPath: '/cart.html',
      requiresAuth: true,
      focus: ['cart lists added items with price and quantity', 'remove from cart', 'continue shopping', 'proceed to checkout', 'empty cart state'],
      minCases: 5,
      maxCases: 8,
    },
    {
      name: 'checkout',
      description: 'As a shopper I can enter my details, review the order totals and complete the purchase.',
      entryPath: '/inventory.html',
      requiresAuth: true,
      focus: [
        'required-field validation on customer information (first name, last name, postal code)',
        'overview shows items, item total, tax and total',
        'cancel returns to the previous step',
        'finish completes the order and empties the cart',
      ],
      minCases: 6,
      maxCases: 10,
    },
  ],
});
