// Mini Mart — a deliberately small shop used to run the agent fully offline (CI, demos).
const USERS = { demo: { password: 'demo123', locked: false }, locked: { password: 'demo123', locked: true } };
const PRODUCTS = [
  { id: 'coffee-mug', name: 'Coffee Mug', price: 12.5 },
  { id: 'desk-lamp', name: 'Desk Lamp', price: 34.0 },
  { id: 'notebook', name: 'Notebook', price: 4.99 },
  { id: 'backpack', name: 'Backpack', price: 49.99 },
  { id: 'water-bottle', name: 'Water Bottle', price: 18.0 },
];

const store = {
  get user() { return localStorage.getItem('mm-user'); },
  set user(v) { v ? localStorage.setItem('mm-user', v) : localStorage.removeItem('mm-user'); },
  get cart() { return JSON.parse(localStorage.getItem('mm-cart') ?? '[]'); },
  set cart(v) { localStorage.setItem('mm-cart', JSON.stringify(v)); },
};

const $ = (sel) => document.querySelector(sel);
const money = (n) => `$${n.toFixed(2)}`;

function requireLogin() {
  if (!store.user) {
    location.href = '/index.html?error=login-required';
    return false;
  }
  return true;
}

function renderBadge() {
  const badge = $('[data-testid="cart-count"]');
  const n = store.cart.length;
  badge.textContent = String(n);
  badge.hidden = n === 0;
}

function initHeader() {
  renderBadge();
  $('[data-testid="logout"]').addEventListener('click', () => {
    store.user = null;
    store.cart = [];
    location.href = '/index.html';
  });
}

export function loginPage() {
  const form = $('form');
  const error = $('[data-testid="login-error"]');
  const show = (msg) => { error.textContent = msg; error.hidden = !msg; };
  if (new URLSearchParams(location.search).get('error') === 'login-required') show('Please log in to continue');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = $('#username').value.trim();
    const password = $('#password').value;
    if (!username) return show('Username is required');
    if (!password) return show('Password is required');
    const user = USERS[username];
    if (!user || user.password !== password) return show('Invalid username or password');
    if (user.locked) return show('This account is locked');
    store.user = username;
    location.href = '/products.html';
  });
}

export function productsPage() {
  if (!requireLogin()) return;
  initHeader();
  const list = $('[data-testid="product-list"]');
  const sort = $('[data-testid="sort"]');
  const sorters = {
    'name-asc': (a, b) => a.name.localeCompare(b.name),
    'name-desc': (a, b) => b.name.localeCompare(a.name),
    'price-asc': (a, b) => a.price - b.price,
    // SEEDED BUG (intentional, for the agent to find): prices compared as strings, not numbers.
    'price-desc': (a, b) => money(b.price).localeCompare(money(a.price)),
  };
  const render = () => {
    const cart = store.cart;
    list.innerHTML = [...PRODUCTS]
      .sort(sorters[sort.value])
      .map((p) => {
        const inCart = cart.includes(p.id);
        return `<li class="card">
          <h3 data-testid="product-name">${p.name}</h3>
          <span data-testid="product-price">${money(p.price)}</span>
          <button data-testid="${inCart ? 'remove' : 'add'}-${p.id}" data-id="${p.id}">${inCart ? 'Remove' : 'Add to cart'}</button>
        </li>`;
      })
      .join('');
  };
  list.addEventListener('click', (e) => {
    const id = e.target?.dataset?.id;
    if (!id) return;
    const cart = store.cart;
    store.cart = cart.includes(id) ? cart.filter((x) => x !== id) : [...cart, id];
    render();
    renderBadge();
  });
  sort.addEventListener('change', render);
  render();
}

export function cartPage() {
  if (!requireLogin()) return;
  initHeader();
  const items = PRODUCTS.filter((p) => store.cart.includes(p.id));
  const list = $('[data-testid="cart-items"]');
  list.innerHTML = items.length
    ? items.map((p) => `<li><span data-testid="cart-item-name">${p.name}</span> <span>${money(p.price)}</span></li>`).join('')
    : '<li data-testid="empty-cart">Your cart is empty</li>';
  $('[data-testid="cart-total"]').textContent = `Total: ${money(items.reduce((s, p) => s + p.price, 0))}`;
  $('form').addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = $('[data-testid="checkout-error"]');
    if (!items.length) { msg.textContent = 'Your cart is empty'; msg.hidden = false; return; }
    if (!$('#fullName').value.trim()) { msg.textContent = 'Full name is required'; msg.hidden = false; return; }
    if (!/^\d{5}$/.test($('#zip').value.trim())) { msg.textContent = 'ZIP code must be 5 digits'; msg.hidden = false; return; }
    store.cart = [];
    document.querySelector('main').innerHTML = '<h2 data-testid="order-complete">Thank you for your order!</h2>';
    renderBadge();
  });
}
