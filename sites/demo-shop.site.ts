import { defineSite } from '../src/config.js';

/**
 * Mini Mart — a small shop that ships with this repo (./demo-site). It lets anyone run the whole
 * agent pipeline offline, and lets CI exercise the agent end-to-end with recorded LLM turns.
 */
export default defineSite({
  name: 'demo-shop',
  baseUrl: 'http://localhost:4173',
  description: 'Mini Mart: users sign in, browse and sort products, add them to a cart and place an order.',
  testIdAttribute: 'data-testid',
  testData: {
    validUser: { username: 'demo', password: 'demo123' },
    lockedUser: { username: 'locked', password: 'demo123' },
  },
  auth: {
    description: 'Sign in as demo/demo123.',
    steps: [
      { action: 'goto', path: '/' },
      { action: 'fill', target: { testId: 'username' }, value: 'demo' },
      { action: 'fill', target: { testId: 'password' }, value: 'demo123' },
      { action: 'click', target: { testId: 'login-button' } },
      { action: 'expectUrl', contains: '/products.html' },
    ],
  },
  localServer: { command: 'node', args: ['demo-site/server.mjs'], readyUrl: 'http://localhost:4173/' },
  modules: [
    {
      name: 'login',
      description: 'As a shopper I can sign in and I get a clear message when sign-in fails.',
      entryPath: '/',
      requiresAuth: false,
      focus: ['valid login', 'required fields', 'invalid credentials', 'locked account', 'protected page redirect'],
      minCases: 4,
      maxCases: 8,
    },
    {
      name: 'products',
      description: 'As a shopper I can browse and sort products and add or remove them from my cart.',
      entryPath: '/products.html',
      requiresAuth: true,
      focus: ['product list renders', 'sort by name and price', 'add/remove updates cart badge'],
      minCases: 4,
      maxCases: 8,
    },
  ],
});
