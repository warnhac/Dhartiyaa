const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');
toggle.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('open');
  toggle.setAttribute('aria-expanded', String(isOpen));
});
nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false');
}));
document.getElementById('year').textContent = new Date().getFullYear();

// ---- Limited-time offer settings: change percent or end date/time here ----
const OFFER = { percent: 30, endsAt: '2026-10-31T23:59:59+05:30' };
// WhatsApp number that receives enquiries: country code + number, digits only (e.g. India 91XXXXXXXXXX).
const WHATSAPP_NUMBER = '918802687562'; // +91 88026 87562
const waLink = text => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
const offerEnd = new Date(OFFER.endsAt).getTime();
const offerActive = () => Date.now() < offerEnd;
const unitPrice = price => offerActive() ? Math.round(price * (100 - OFFER.percent) / 100) : price;
const formatINR = value => new Intl.NumberFormat('en-IN', {style:'currency', currency:'INR', maximumFractionDigits:0}).format(value);

// Product prices are DEMO prices in INR. Edit data-price (1 kg) and data-price-5 (5 kg) in index.html.
const products = [...document.querySelectorAll('.product-card[data-id]')].map(card => {
  const sizes = [{ size: 1, price: Number(card.dataset.price) }];
  const price5 = card.getAttribute('data-price-5'); // dataset can't read dash-digit names like data-price-5
  if (price5) sizes.push({ size: 5, price: Number(price5) });
  return { id: card.dataset.id, name: card.dataset.name, sizes, image: card.querySelector('img').getAttribute('src'), tone: card.style.getPropertyValue('--tone').trim() };
});
const selectedSize = new Map(); // productId -> size in kg (default 1)

// Pack size picker (1 kg / 5 kg)
document.querySelectorAll('.product-card .size-btn').forEach(btn => btn.addEventListener('click', () => {
  const card = btn.closest('.product-card');
  const product = products.find(item => item.id === card.dataset.id);
  const size = Number(btn.dataset.size);
  if (!product.sizes.some(v => v.size === size)) return;
  selectedSize.set(product.id, size);
  card.querySelectorAll('.size-btn').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
  renderCardPrice(card);
}));

/* ---------- Cart (orders are sent on WhatsApp) ---------- */
const CART_KEY = 'dhartiya_cart';
const cart = new Map(); // key "productId:sizeKg" -> quantity
const lineKey = (id, size) => `${id}:${size}`;
const cartStore = {
  load() { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { return []; } },
  save() { try { localStorage.setItem(CART_KEY, JSON.stringify([...cart])); } catch (e) {} }
};
cartStore.load().forEach(([key, qty]) => {
  const [id, size] = String(key).split(':');
  const p = products.find(x => x.id === id);
  if (p && p.sizes.some(v => String(v.size) === size) && Number(qty) > 0) cart.set(key, Math.min(Number(qty), 99));
});
function cartLines() {
  return products.flatMap(p => p.sizes
    .filter(v => cart.has(lineKey(p.id, v.size)))
    .map(v => ({ key: lineKey(p.id, v.size), product: p, size: v.size, price: v.price, unit: unitPrice(v.price), qty: cart.get(lineKey(p.id, v.size)) })));
}
const cartTotal = () => cartLines().reduce((sum, l) => sum + l.unit * l.qty, 0);
const cartSavingsTotal = () => cartLines().reduce((sum, l) => sum + (l.price - l.unit) * l.qty, 0);

const cartPanel = document.getElementById('cartPanel');
const cartBackdrop = document.getElementById('cartBackdrop');
const cartItems = document.getElementById('cartItems');
const checkoutForm = document.getElementById('checkoutForm');
const placeOrder = document.getElementById('placeOrder');
const orderStatus = document.getElementById('orderStatus');
const orderStatusDefault = orderStatus.textContent;

function openCart() {
  nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false');
  cartPanel.classList.add('open'); cartPanel.setAttribute('aria-hidden', 'false');
  cartBackdrop.hidden = false; document.body.classList.add('cart-open');
}
function closeCart() {
  cartPanel.classList.remove('open'); cartPanel.setAttribute('aria-hidden', 'true');
  cartBackdrop.hidden = true; document.body.classList.remove('cart-open');
}
document.getElementById('openCart').addEventListener('click', openCart);
document.getElementById('closeCart').addEventListener('click', closeCart);
cartBackdrop.addEventListener('click', closeCart);
document.addEventListener('keydown', event => {
  // Escape closes the top-most popup first; the cart only closes when no popup is open.
  if (event.key === 'Escape' && !document.querySelector('.auth-modal:not([hidden]), .pin-modal:not([hidden])')) closeCart();
});

document.querySelectorAll('[data-add]').forEach(button => button.addEventListener('click', () => {
  const product = products.find(item => item.id === button.dataset.add);
  if (!product) return;
  const key = lineKey(product.id, selectedSize.get(product.id) || 1);
  cart.set(key, Math.min((cart.get(key) || 0) + 1, 99));
  renderCart();
  const originalLabel = button.innerHTML;
  button.innerHTML = 'Added ✓'; button.classList.add('added'); button.setAttribute('aria-live', 'polite');
  window.setTimeout(() => { button.innerHTML = originalLabel; button.classList.remove('added'); }, 1200);
}));
function changeQuantity(key, delta) {
  const next = (cart.get(key) || 0) + delta;
  if (next <= 0) cart.delete(key); else cart.set(key, Math.min(next, 99));
  renderCart();
}
document.getElementById('clearCart').addEventListener('click', () => { cart.clear(); renderCart(); });

function renderCart() {
  const lines = cartLines();
  const count = lines.reduce((sum, l) => sum + l.qty, 0);
  document.getElementById('cartCount').textContent = count;
  document.getElementById('cartTitleCount').textContent = `(${count})`;
  document.getElementById('cartSubtotal').textContent = formatINR(cartTotal());
  const saved = cartSavingsTotal();
  document.getElementById('cartSavings').hidden = !(saved > 0);
  document.getElementById('savingsLabel').textContent = `Limited-time offer (${OFFER.percent}% off)`;
  document.getElementById('savingsAmount').textContent = '−' + formatINR(saved);
  document.getElementById('clearCart').hidden = !count;
  if (!count) {
    cartItems.innerHTML = '<div class="empty-cart"><span>🛒</span><h3>Your cart is waiting</h3><p>Add a few favourites from our flour collection.</p></div>';
  } else {
    cartItems.innerHTML = lines.map(l => {
      const p = l.product, label = `${p.name} (${l.size} kg)`;
      return `<div class="cart-line"><img src="${p.image}" alt="" style="--tone:${p.tone}"><div><h3>${label}</h3><div class="line-price">${l.unit < l.price ? `<s>${formatINR(l.price)}</s>` : ''}${formatINR(l.unit)} / ${l.size} kg pack</div><div class="quantity-controls"><button type="button" data-qty="${l.key}" data-delta="-1" aria-label="Decrease ${label} quantity">−</button><span>${l.qty}</span><button type="button" data-qty="${l.key}" data-delta="1" aria-label="Increase ${label} quantity">+</button></div></div><div class="cart-line-total">${formatINR(l.unit * l.qty)}<button type="button" class="remove-item" data-remove="${l.key}">Remove</button></div></div>`;
    }).join('');
    cartItems.querySelectorAll('[data-qty]').forEach(b => b.addEventListener('click', () => changeQuantity(b.dataset.qty, Number(b.dataset.delta))));
    cartItems.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', () => { cart.delete(b.dataset.remove); renderCart(); }));
  }
  placeOrder.disabled = count === 0;
  cartStore.save();
}

/* ---------- Delivery PIN code check (Delhi only) ---------- */
const DELHI_PIN_MIN = 110001, DELHI_PIN_MAX = 110097;
const isDelhiPin = pin => /^\d{6}$/.test(pin) && Number(pin) >= DELHI_PIN_MIN && Number(pin) <= DELHI_PIN_MAX;
const pinInput = document.getElementById('customerPincode');
const pinStatus = document.getElementById('pinStatus');
const pinModal = document.getElementById('pinModal');
function showPinStatus() {
  const pin = pinInput.value.trim();
  pinInput.classList.remove('pin-invalid');
  if (pin.length < 6) { pinStatus.hidden = true; return; }
  const ok = isDelhiPin(pin);
  pinStatus.hidden = false; pinStatus.className = 'pin-status ' + (ok ? 'ok' : 'bad');
  pinStatus.textContent = ok ? '✓ We deliver to this PIN code.' : 'Sorry, we are not delivering at this PIN code.';
  pinInput.classList.toggle('pin-invalid', !ok);
}
function showPinModal(pin) {
  document.getElementById('pinMessage').textContent = `We currently deliver only within Delhi (PIN codes ${DELHI_PIN_MIN} – ${DELHI_PIN_MAX}). We are not delivering at PIN code ${pin}. Please enter a Delhi PIN code, or ask us on WhatsApp if you need delivery elsewhere.`;
  document.getElementById('pinAsk').href = waLink(`Hello Dhartiya Natural Foods, do you deliver to PIN code ${pin}?`);
  pinModal.hidden = false; document.getElementById('pinChange').focus();
}
function closePinModal(focusField) { pinModal.hidden = true; if (focusField) { pinInput.focus(); pinInput.select(); } }
pinInput.addEventListener('input', () => { pinInput.value = pinInput.value.replace(/\D/g, '').slice(0, 6); showPinStatus(); });
pinInput.addEventListener('change', () => { // popup as soon as a complete non-Delhi PIN is entered
  const pin = pinInput.value.trim();
  if (/^\d{6}$/.test(pin) && !isDelhiPin(pin) && pinModal.hidden) showPinModal(pin);
});
document.getElementById('closePin').addEventListener('click', () => closePinModal(true));
document.getElementById('pinChange').addEventListener('click', () => closePinModal(true));
pinModal.addEventListener('click', event => { if (event.target === pinModal) closePinModal(true); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !pinModal.hidden) closePinModal(true); });

function orderMessage(customer) {
  const lines = cartLines().map(l => `• ${l.product.name} — ${l.size} kg pack × ${l.qty} = ${formatINR(l.unit * l.qty)}${l.unit < l.price ? ` (MRP ${formatINR(l.price * l.qty)})` : ''}`);
  const saved = cartSavingsTotal();
  return [
    '*NEW ORDER — DHARTIYA NATURAL FOODS*', '',
    `*Account:* ${currentUser() ? currentUser().email : 'Guest checkout'}`,
    `*Customer:* ${customer.get('customerName')}`,
    `*Mobile:* ${customer.get('customerPhone')}`,
    `*Delivery address:* ${customer.get('customerAddress')}`,
    `*PIN code:* ${customer.get('customerPincode')}`,
    `*Order notes:* ${customer.get('customerNotes') || 'None'}`, '',
    '*ITEMS*', ...lines, '',
    ...(saved > 0 ? [`Limited-time offer ${OFFER.percent}% off applied — saved ${formatINR(saved)}`] : []),
    `*Subtotal:* ${formatINR(cartTotal())}`,
    'Delivery: To be confirmed', '',
    'Please confirm final pricing and availability.'
  ].join('\n');
}
checkoutForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!cart.size) return;
  const pin = pinInput.value.trim();
  if (!isDelhiPin(pin)) { showPinStatus(); showPinModal(pin); return; } // not a Delhi PIN: block the order
  const link = waLink(orderMessage(new FormData(checkoutForm)));
  const win = window.open(link, '_blank', 'noopener');
  if (!win) window.location.href = link; // pop-up blocked: open WhatsApp in this tab instead
  orderStatus.textContent = 'WhatsApp is opening with your order. Press Send there to place it.';
  window.setTimeout(() => { orderStatus.textContent = orderStatusDefault; }, 8000);
});

/* ---------- Account: login / sign up (local demo, browser storage only) ---------- */
const USERS_KEY = 'dhartiya_users';
const SESSION_KEY = 'dhartiya_session';
const storage = {
  read(key, fallback) { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch (e) { return fallback; } },
  write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; } },
  remove(key) { try { localStorage.removeItem(key); } catch (e) {} }
};
const authModal = document.getElementById('authModal');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const loginError = document.getElementById('loginError');
const signupError = document.getElementById('signupError');
const authTitle = document.getElementById('authTitle');
const openAuthBtn = document.getElementById('openAuth');
const userMenu = document.getElementById('userMenu');
const userGreeting = document.getElementById('userGreeting');

const toHex = buffer => [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');
function randomSalt() {
  const bytes = new Uint8Array(16);
  if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(bytes); else bytes.forEach((_, i) => bytes[i] = Math.floor(Math.random() * 256));
  return toHex(bytes);
}
async function hashPassword(password, salt) {
  if (window.crypto && crypto.subtle) {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 100000, hash: 'SHA-256' }, key, 256);
    return toHex(bits);
  }
  // Weak fallback for browsers without Web Crypto. Demo only.
  let h = 5381; const text = salt + password;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return 'weak' + h;
}
const normalizeEmail = value => value.trim().toLowerCase();
function currentUser() {
  const session = storage.read(SESSION_KEY, null);
  if (!session) return null;
  return storage.read(USERS_KEY, []).find(u => u.email === session.email) || null;
}
function showError(el, message) { el.textContent = message; el.hidden = false; }
function clearErrors() { loginError.hidden = true; signupError.hidden = true; }

function showTab(tab) {
  const isLogin = tab === 'login';
  loginForm.hidden = !isLogin; signupForm.hidden = isLogin;
  document.getElementById('tabLogin').setAttribute('aria-selected', String(isLogin));
  document.getElementById('tabSignup').setAttribute('aria-selected', String(!isLogin));
  authTitle.textContent = isLogin ? 'Welcome back' : 'Create your account';
  clearErrors();
  (isLogin ? document.getElementById('loginEmail') : document.getElementById('signupName')).focus();
}
function openAuth(tab = 'login') { authModal.hidden = false; document.body.classList.add('cart-open'); showTab(tab); }
function closeAuth() {
  authModal.hidden = true; clearErrors(); loginForm.reset(); signupForm.reset();
  if (!cartPanel.classList.contains('open')) document.body.classList.remove('cart-open');
}
openAuthBtn.addEventListener('click', () => { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); openAuth('login'); });
document.getElementById('closeAuth').addEventListener('click', closeAuth);
authModal.addEventListener('click', event => { if (event.target === authModal) closeAuth(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !authModal.hidden) closeAuth(); });
authModal.querySelectorAll('[data-tab]').forEach(btn => btn.addEventListener('click', () => showTab(btn.dataset.tab)));

function fillCheckout(user) {
  const set = (id, value) => { const el = document.getElementById(id); if (el && !el.value && value) el.value = value; };
  set('customerName', user.name); set('customerPhone', user.phone); set('customerAddress', user.address); set('customerPincode', user.pincode); showPinStatus();
}
function updateAuthUI() {
  const user = currentUser();
  openAuthBtn.hidden = !!user; userMenu.hidden = !user;
  if (user) { userGreeting.textContent = 'Hi, ' + user.name.split(' ')[0]; fillCheckout(user); }
}

signupForm.addEventListener('submit', async event => {
  event.preventDefault(); clearErrors();
  const name = document.getElementById('signupName').value.trim();
  const email = normalizeEmail(document.getElementById('signupEmail').value);
  const phone = document.getElementById('signupPhone').value.trim();
  const password = document.getElementById('signupPassword').value;
  const confirm = document.getElementById('signupConfirm').value;
  if (!name) return showError(signupError, 'Please enter your name.');
  if (password.length < 8) return showError(signupError, 'Password must be at least 8 characters.');
  if (password !== confirm) return showError(signupError, 'Passwords do not match.');
  const users = storage.read(USERS_KEY, []);
  if (users.some(u => u.email === email)) return showError(signupError, 'An account with this email already exists. Please log in.');
  const salt = randomSalt();
  users.push({ name, email, phone, address: '', salt, hash: await hashPassword(password, salt), createdAt: new Date().toISOString() });
  if (!storage.write(USERS_KEY, users) || !storage.write(SESSION_KEY, { email })) return showError(signupError, 'Could not save your account. Browser storage may be disabled or in private mode.');
  closeAuth(); updateAuthUI();
});

loginForm.addEventListener('submit', async event => {
  event.preventDefault(); clearErrors();
  const email = normalizeEmail(document.getElementById('loginEmail').value);
  const password = document.getElementById('loginPassword').value;
  const user = storage.read(USERS_KEY, []).find(u => u.email === email);
  const ok = user && (await hashPassword(password, user.salt)) === user.hash;
  if (!ok) return showError(loginError, 'Incorrect email or password.');
  if (!storage.write(SESSION_KEY, { email })) return showError(loginError, 'Could not start your session. Browser storage may be disabled.');
  closeAuth(); updateAuthUI();
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  storage.remove(SESSION_KEY); checkoutForm.reset(); updateAuthUI();
});

// Remember phone and address on the account when a logged-in customer places an order.
checkoutForm.addEventListener('submit', () => {
  const user = currentUser(); if (!user) return;
  const users = storage.read(USERS_KEY, []);
  const record = users.find(u => u.email === user.email); if (!record) return;
  record.phone = document.getElementById('customerPhone').value.trim() || record.phone;
  record.address = document.getElementById('customerAddress').value.trim() || record.address;
  record.pincode = document.getElementById('customerPincode').value.trim() || record.pincode;
  storage.write(USERS_KEY, users);
});

updateAuthUI();


/* ---------- Hero slideshow ---------- */
(function () {
  const slider = document.getElementById('heroSlider');
  if (!slider) return;
  const slides = [...slider.querySelectorAll('.slide')];
  const dotsWrap = slider.querySelector('.slider-dots');
  const toggleBtn = slider.querySelector('.slider-toggle');
  const counter = document.querySelector('.hero-caption span');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let index = 0, timer = null, userPaused = reduceMotion, hoverPaused = false;
  const pad = n => String(n).padStart(2, '0');

  const dots = slides.map((_, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.setAttribute('aria-label', 'Go to slide ' + (i + 1));
    b.addEventListener('click', () => { goTo(i); restart(); });
    dotsWrap.appendChild(b); return b;
  });
  function goTo(i) {
    index = (i + slides.length) % slides.length;
    slides.forEach((slide, n) => {
      const on = n === index;
      slide.classList.toggle('active', on);
      slide.setAttribute('aria-hidden', String(!on));
      const link = slide.querySelector('a'); if (link) link.tabIndex = on ? 0 : -1;
    });
    dots.forEach((d, n) => d.setAttribute('aria-current', String(n === index)));
    if (typeof fitFrame === 'function') fitFrame();
    if (counter) {
      const img = slides[index].querySelector('img:not(.slide-bg)');
      const name = img ? img.alt.replace(/ pack$/i, '').toUpperCase() : '';
      counter.textContent = name;
    }
  }
  function stop() { clearInterval(timer); timer = null; }
  function start() { stop(); if (!userPaused && !hoverPaused && !document.hidden) timer = setInterval(() => goTo(index + 1), 4500); }
  const restart = start;
  function setToggle() {
    toggleBtn.textContent = userPaused ? '▶' : '❚❚';
    toggleBtn.setAttribute('aria-label', userPaused ? 'Play slideshow' : 'Pause slideshow');
  }

  slider.querySelector('.prev').addEventListener('click', () => { goTo(index - 1); restart(); });
  slider.querySelector('.next').addEventListener('click', () => { goTo(index + 1); restart(); });
  toggleBtn.addEventListener('click', () => { userPaused = !userPaused; setToggle(); start(); });
  slider.addEventListener('mouseenter', () => { hoverPaused = true; stop(); });
  slider.addEventListener('mouseleave', () => { hoverPaused = false; start(); });
  slider.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { goTo(index - 1); restart(); }
    if (e.key === 'ArrowRight') { goTo(index + 1); restart(); }
  });
  let touchX = null;
  slider.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
  slider.addEventListener('touchend', e => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX; touchX = null;
    if (Math.abs(dx) > 40) { goTo(index + (dx < 0 ? 1 : -1)); restart(); }
  });
  document.addEventListener('visibilitychange', start);
  // Frame takes the shape of the picture on show, so every picture fills it exactly (no bars, no cropping)
  const mainImgs = slides.map(sl => sl.querySelector('img:not(.slide-bg)'));
  const ratios = slides.map(() => 0.75);
  const visual = slider.closest('.hero-visual');
  function measure() { mainImgs.forEach((img, i) => { if (img.naturalWidth && img.naturalHeight) ratios[i] = img.naturalWidth / img.naturalHeight; }); }
  function fitFrame() {
    const w = slider.getBoundingClientRect().width; if (!w) return;
    measure();
    slider.style.height = Math.round(w / ratios[index]) + 'px';
    // keep the hero the same height on every slide so the page never jumps
    visual.style.minHeight = (Math.round(w / Math.min(...ratios)) + 110) + 'px';
  }
  mainImgs.forEach(img => { img.loading = 'eager'; if (!img.complete) img.addEventListener('load', fitFrame); });
  window.addEventListener('resize', fitFrame);
  window.addEventListener('load', fitFrame);
  fitFrame();
  goTo(0); setToggle(); start();
})();


/* ---------- Limited-time offer: prices, banner, countdown ---------- */
function renderCardPrice(card) {
  const product = products.find(p => p.id === card.dataset.id);
  const size = selectedSize.get(product.id) || 1;
  const variant = product.sizes.find(v => v.size === size) || product.sizes[0];
  const on = offerActive();
  const amount = card.querySelector('.price-amount');
  amount.textContent = formatINR(on ? unitPrice(variant.price) : variant.price);
  let old = card.querySelector('.price-old');
  if (!old) { old = document.createElement('s'); old.className = 'price-old'; amount.after(old); }
  old.textContent = formatINR(variant.price); old.hidden = !on;
  card.querySelector('.price-unit').textContent = ` / ${size} kg`;
  let pill = card.querySelector('.offer-pill');
  if (!pill) { pill = document.createElement('span'); pill.className = 'offer-pill'; card.querySelector('.size-options').append(pill); }
  pill.textContent = `${OFFER.percent}% OFF`; pill.hidden = !on;
}
const announcementBar = document.querySelector('.announcement');
const announcementDefault = announcementBar.textContent;
const offerBanner = document.getElementById('offerBanner');
let offerWasActive = null;
function refreshOffer() {
  const on = offerActive();
  document.querySelectorAll('.product-card[data-id]').forEach(renderCardPrice);
  renderCart();
  offerBanner.hidden = !on;
  const endText = new Date(offerEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  document.getElementById('offerEndText').textContent = endText;
  offerBanner.querySelector('.offer-percent').textContent = `${OFFER.percent}% OFF`;
  announcementBar.textContent = on ? `LIMITED TIME OFFER · ${OFFER.percent}% OFF ON ALL ATTA · ENDS ${endText.toUpperCase()}` : announcementDefault;
  offerWasActive = on;
}
function tickCountdown() {
  if (offerActive() !== offerWasActive) refreshOffer();
  if (!offerActive()) return;
  const left = Math.max(0, offerEnd - Date.now());
  const two = n => String(n).padStart(2, '0');
  document.getElementById('cdD').textContent = two(Math.floor(left / 864e5));
  document.getElementById('cdH').textContent = two(Math.floor(left % 864e5 / 36e5));
  document.getElementById('cdM').textContent = two(Math.floor(left % 36e5 / 6e4));
  document.getElementById('cdS').textContent = two(Math.floor(left % 6e4 / 1e3));
}
refreshOffer(); tickCountdown(); setInterval(tickCountdown, 1000);



/* ---------- WhatsApp: contact form and quick chat ---------- */
document.getElementById('contactForm').addEventListener('submit', event => {
  event.preventDefault();
  const f = new FormData(event.currentTarget);
  const text = ['*NEW ENQUIRY — DHARTIYA NATURAL FOODS*', '', `*Name:* ${f.get('name')}`, `*Phone or email:* ${f.get('email')}`, `*Interested in:* ${f.get('interest')}`, '', f.get('message') || ''].join('\n').trim();
  window.open(waLink(text), '_blank', 'noopener');
});
document.getElementById('waFloat').href = waLink('Hello Dhartiya Natural Foods, I would like to know more about your atta range.');


/* ---------- Product pictures: tiles share one shape (the typical picture shape) and never crop ---------- */
(function () {
  const grid = document.querySelector('.product-grid');
  if (!grid) return;
  const imgs = [...grid.querySelectorAll('.product-image img')];
  imgs.forEach(img => {
    const tile = img.closest('.product-image');
    tile.style.setProperty('--bg', `url("${img.getAttribute('src')}")`); // blurred copy fills any spare space
  });
  function fitTiles() {
    const r = imgs.filter(i => i.naturalWidth && i.naturalHeight).map(i => i.naturalWidth / i.naturalHeight).sort((a, b) => a - b);
    if (!r.length) return;
    const median = r[Math.floor(r.length / 2)];
    grid.style.setProperty('--tile-ratio', String(Math.round(median * 1000) / 1000));
  }
  imgs.forEach(img => { if (img.complete) fitTiles(); else img.addEventListener('load', fitTiles); });
  fitTiles();
})();
