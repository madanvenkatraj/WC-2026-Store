'use strict';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0));
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const safeHex = (value, fallback) => /^#[0-9a-f]{6}$/i.test(String(value)) ? value : fallback;
const validPatterns = new Set(['stripes', 'sunburst', 'diagonal', 'geo', 'stars', 'waves', 'blocks', 'pinstripe']);
const CART_KEY = 'ninetyplus-cart-v1';
const WISHLIST_KEY = 'ninetyplus-wishlist-v1';
const FREE_SHIPPING_AT = 120;
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

let products = [];
let category = 'All';
let searchTerm = '';
let selectedNation = '';
let sortOrder = 'featured';
let selectedProduct = null;
let selectedSize = '';
let selectedQuantity = 1;
let activeModal = null;
let modalReturnTo = null;
let toastTimer = null;
let wishlist = readStorage(WISHLIST_KEY, []);
let cart = normalizeCart(readStorage(CART_KEY, []));

function readStorage(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value == null ? fallback : value;
  } catch { return fallback; }
}
function writeStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* The store remains usable if storage is disabled. */ }
}
function normalizeCart(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((line) => line && typeof line.productId === 'string' && SIZES.includes(line.size) && Number.isInteger(line.quantity) && line.quantity > 0 && line.quantity <= 10)
    .map((line) => ({ productId: line.productId, size: line.size, quantity: line.quantity }));
}
function getProduct(productId) { return products.find((item) => item.id === productId); }
function availableStock(product, size) { return Math.max(0, Number((product && product.stock && product.stock[size]) || 0)); }
function cleanColors(colors) {
  const defaults = ['#77c6ed', '#f8fbff', '#244b81'];
  return Array.isArray(colors) ? defaults.map((fallback, index) => safeHex(colors[index], fallback)) : defaults;
}

function jerseySvg(product, extraClass = '') {
  const [main, accent, detail] = cleanColors(product && product.colors);
  const pattern = validPatterns.has(product && product.pattern) ? product.pattern : 'stripes';
  const id = `shirt-${String(product?.id || 'generic').replace(/[^a-z0-9_-]/gi, '')}-${Math.random().toString(36).slice(2, 7)}`;
  let patternMarkup = '';
  if (pattern === 'stripes') patternMarkup = `<path d="M83 40h14v207H83zM112 47h12v207h-12zM139 47h12v207h-12zM166 40h13v207h-13z" fill="${accent}" opacity=".78"/><path d="M99 43h5v209h-5zM156 43h5v209h-5z" fill="${detail}" opacity=".75"/>`;
  if (pattern === 'sunburst') patternMarkup = `<path d="M130 42 106 255h14l10-206 10 206h14z" fill="${accent}" opacity=".5"/><path d="M130 42 78 249h12L130 42 170 249h12z" fill="${detail}" opacity=".35"/><path d="M70 75 109 250M190 75 151 250" stroke="${accent}" stroke-width="8" opacity=".45"/>`;
  if (pattern === 'diagonal') patternMarkup = `<path d="M45 177 160 35h23L67 211zM86 250 205 91v32L111 250zM61 108 116 40h20L61 134z" fill="${accent}" opacity=".72"/><path d="M125 253 204 149v28l-56 76z" fill="${detail}" opacity=".55"/>`;
  if (pattern === 'geo') patternMarkup = `<path d="M65 72 90 58 111 76 99 97 75 99zM150 59l28 9 6 28-26 9-15-19zM72 132l28-10 15 21-17 24-24-11zM151 137l26-9 18 23-17 20-23-10zM111 194l22-15 25 17-14 28-27-4z" fill="${accent}" opacity=".47"/><path d="M75 67l25 32M151 61l24 34M78 134l32 24M154 137l31 20M111 194l47 30" stroke="${detail}" stroke-width="4" opacity=".5"/>`;
  if (pattern === 'stars') patternMarkup = `<g fill="${detail}" opacity=".9"><path d="m91 73 4 9 10 1-8 7 2 10-8-5-9 5 3-10-8-7 10-1zM151 83l3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1zM121 130l3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1zM173 155l3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1zM92 190l3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1z"/></g><path d="M75 113 181 210" stroke="${accent}" stroke-width="8" opacity=".45"/>`;
  if (pattern === 'waves') patternMarkup = `<path d="M47 76q22-18 44 0t44 0 44 0 38 0M54 97q20-17 40 0t40 0 40 0 34 0M60 118q17-15 34 0t34 0 34 0 34 0M67 139q14-12 28 0t28 0 28 0 28 0" fill="none" stroke="${accent}" stroke-width="5" opacity=".85"/><path d="M67 176q16-13 32 0t32 0 32 0 29 0" fill="none" stroke="${detail}" stroke-width="4" opacity=".6"/>`;
  if (pattern === 'blocks') patternMarkup = `<path d="M65 78h52v47H65zM121 78h30v47h-30zM156 78h34v47h-34zM65 131h27v50H65zM97 131h54v50H97zM156 131h34v50h-34zM73 187h43v45H73zM121 187h30v45h-30zM156 187h26v45h-26z" fill="${accent}" opacity=".65"/><path d="M98 80v154M153 80v154" stroke="${detail}" stroke-width="3" opacity=".55"/>`;
  if (pattern === 'pinstripe') patternMarkup = `<path d="M78 43h4v207h-4zM89 43h2v207h-2zM99 43h4v209h-4zM151 43h4v209h-4zM163 43h2v207h-2zM174 43h4v207h-4z" fill="${accent}" opacity=".8"/><path d="M63 91h132v4H63z" fill="${detail}" opacity=".45"/>`;
  return `<svg class="shirt-svg ${escapeHtml(extraClass)}" viewBox="0 0 260 300" role="img" aria-label="Illustrated ${escapeHtml(product?.name || 'football jersey')}" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="${id}"><path d="M82 31 55 39 24 76 46 98 65 83 65 248Q130 266 195 248V83l19 15 22-22-31-37-27-8q-13 18-48 18T82 31Z"/></clipPath><linearGradient id="${id}-shade" x1="0" y1="0" x2="1" y2=".7"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".49" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#001b14" stop-opacity=".2"/></linearGradient><linearGradient id="${id}-fabric" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#112c21" stop-opacity=".08"/></linearGradient></defs><g clip-path="url(#${id})"><path d="M82 31 55 39 24 76 46 98 65 83 65 248Q130 266 195 248V83l19 15 22-22-31-37-27-8q-13 18-48 18T82 31Z" fill="${main}"/>${patternMarkup}<path d="M65 82 46 98 24 76 55 39 82 31Q98 50 130 49Q163 50 178 31L205 39l31 37-22 22-19-15v165q-65 18-130 0Z" fill="url(#${id}-shade)"/><path d="M65 83v162M195 83v162" stroke="${detail}" stroke-width="2" opacity=".45"/><path d="M63 91 46 98 35 87M197 91l17 7 11-11" fill="none" stroke="${detail}" stroke-width="3" opacity=".75"/><path d="M107 34q23 22 46 0l-8-5q-15 10-30 0z" fill="${detail}" opacity=".88"/><path d="M111 33q19 17 38 0l-4-4q-15 9-30 0z" fill="${main}"/><path d="M117 62h26l-3 16h-20z" fill="${detail}" opacity=".88"/><path d="M120 65h20l-2 11h-16z" fill="${accent}"/><path d="M77 201h25v32H77z" fill="${detail}" opacity=".22"/><path d="M81 205h17v23H81z" fill="${accent}"/><path d="M85 210h9v13h-9z" fill="${detail}"/><path d="M65 244q65 15 130 0v8q-65 17-130 0z" fill="${detail}" opacity=".65"/><path d="M72 46q-12 20-9 51M185 46q12 20 9 51" stroke="#fff" stroke-width="2" opacity=".22" fill="none"/></g><path d="M82 31 55 39 24 76 46 98 65 83 65 248Q130 266 195 248V83l19 15 22-22-31-37-27-8q-13 18-48 18T82 31Z" fill="url(#${id}-fabric)" stroke="#132a2118" stroke-width="2"/><g transform="translate(147 104)"><path d="M0 0 19 5 17 27 9 34 1 27Z" fill="${detail}" stroke="#132a2188" stroke-width="1.3"/><path d="M4 8h11v3H4zM4 14h11v3H4zM4 20h11v3H4z" fill="${main}"/></g><path d="M78 244q52 13 104 0" fill="none" stroke="#fff" stroke-width="1.5" opacity=".17"/></svg>`;
}

function getDisplayedProducts() {
  let list = products.filter((product) => category === 'All' || product.category === category);
  if (selectedNation) list = list.filter((product) => product.nation === selectedNation);
  if (searchTerm) {
    const term = searchTerm.toLocaleLowerCase();
    list = list.filter((product) => [product.name, product.nation, product.category, product.description, product.edition].some((value) => String(value || '').toLocaleLowerCase().includes(term)));
  }
  if (sortOrder === 'price-asc') list.sort((a, b) => a.price - b.price || a.name.localeCompare(b.name));
  if (sortOrder === 'price-desc') list.sort((a, b) => b.price - a.price || a.name.localeCompare(b.name));
  if (sortOrder === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
  if (sortOrder === 'featured') list.sort((a, b) => Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name));
  return list;
}

function productCard(product, index) {
  const originalPrice = Number(product.compareAt || 0);
  const discount = originalPrice > product.price ? Math.round((1 - product.price / originalPrice) * 100) : 0;
  const badgeClass = /limited|new/i.test(product.badge || '') ? ' badge-coral' : '';
  const heart = wishlist.includes(product.id);
  const cardColors = cleanColors(product.colors);
  const artBg = `${cardColors[0]}18`;
  return `<article class="product-card" style="animation-delay:${Math.min(index * 45, 270)}ms"><div class="product-art" role="button" tabindex="0" data-product="${escapeHtml(product.id)}" aria-label="View ${escapeHtml(product.name)}" style="background:${artBg}">${product.badge ? `<span class="product-badge${badgeClass}">${escapeHtml(product.badge)}</span>` : ''}<button class="wishlist-button${heart ? ' liked' : ''}" data-wishlist="${escapeHtml(product.id)}" aria-label="${heart ? 'Remove from' : 'Add to'} wishlist" aria-pressed="${heart}">${heart ? '♥' : '♡'}</button>${jerseySvg(product)}<button class="quick-add" data-quick-add="${escapeHtml(product.id)}">QUICK SHOP <span>↗</span></button></div><div class="product-meta-top"><span class="product-nation">${escapeHtml(product.countryCode)} / ${escapeHtml(product.nation)}</span><span class="product-edition">${escapeHtml(product.category.toUpperCase())}</span></div><h3 class="product-name" role="button" tabindex="0" data-product="${escapeHtml(product.id)}">${escapeHtml(product.name)}</h3><p class="product-description">${escapeHtml(product.description)}</p><div class="product-price-row"><span class="product-price">${money(product.price)}</span>${originalPrice > product.price ? `<span class="product-compare">${money(originalPrice)}</span>` : ''}${discount ? `<span class="product-discount">-${discount}%</span>` : ''}</div></article>`;
}

function renderProducts() {
  const grid = $('#product-grid');
  const list = getDisplayedProducts();
  $('#count-all').textContent = products.length;
  $('#shown-count').textContent = list.length;
  $('#results-copy').textContent = searchTerm ? `RESULTS FOR “${searchTerm.toUpperCase().slice(0, 35)}”` : category === 'All' ? 'THE FULL SQUAD' : `${category.toUpperCase()} COLLECTION`;
  grid.setAttribute('aria-busy', 'false');
  $('#empty-state').hidden = list.length !== 0;
  grid.hidden = list.length === 0;
  if (!list.length) { grid.innerHTML = ''; return; }
  grid.innerHTML = list.map(productCard).join('');
  $$('.category-tab').forEach((button) => button.classList.toggle('selected', button.dataset.category === category));
}

function setCategory(nextCategory) {
  category = nextCategory;
  $$('.category-tab').forEach((button) => {
    const active = button.dataset.category === category;
    button.classList.toggle('selected', active);
    button.setAttribute('aria-pressed', String(active));
  });
  renderProducts();
}

function populateNations() {
  const nations = [...new Set(products.map((product) => product.nation))].sort((a, b) => a.localeCompare(b));
  $('#nation-filter').innerHTML = '<option value="">All countries</option>' + nations.map((nation) => `<option value="${escapeHtml(nation)}">${escapeHtml(nation)}</option>`).join('');
}

function renderCart() {
  cart = normalizeCart(cart);
  const fullLines = cart.map((line) => ({ ...line, product: getProduct(line.productId) })).filter((line) => line.product);
  const count = fullLines.reduce((total, line) => total + line.quantity, 0);
  const subtotal = fullLines.reduce((total, line) => total + line.product.price * line.quantity, 0);
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_AT ? 0 : 6;
  const remaining = Math.max(0, FREE_SHIPPING_AT - subtotal);
  $('#cart-count').textContent = count;
  $('#drawer-item-count').textContent = `(${count})`;
  $('#cart-subtotal').textContent = money(subtotal);
  $('#shipping-remaining').textContent = money(remaining);
  $('#shipping-progress-fill').style.width = `${Math.min(100, subtotal / FREE_SHIPPING_AT * 100)}%`;
  $('#shipping-progress').hidden = count === 0;
  $('#drawer-footer').hidden = count === 0;
  if (!count) {
    $('#cart-items').innerHTML = '<div class="cart-empty"><span>◌</span><h3>YOUR BAG IS ON THE BENCH.</h3><p>Find a kit that feels like your team.</p><button class="button button-dark" id="cart-shop">BROWSE THE COLLECTION</button></div>';
    return;
  }
  $('#cart-items').innerHTML = fullLines.map(({ product, size, quantity }) => `<article class="cart-line"><div class="cart-line-art" style="background:${cleanColors(product.colors)[0]}18">${jerseySvg(product)}</div><div class="cart-line-info"><span class="cart-line-nation">${escapeHtml(product.nation)}</span><h3 class="cart-line-name">${escapeHtml(product.name)}</h3><span class="cart-line-size">SIZE: ${escapeHtml(size)}</span><div class="cart-line-bottom"><div class="mini-quantity"><button data-cart-qty="-1" data-id="${escapeHtml(product.id)}" data-size="${size}" aria-label="Reduce quantity">−</button><span>${quantity}</span><button data-cart-qty="1" data-id="${escapeHtml(product.id)}" data-size="${size}" aria-label="Increase quantity">+</button></div><strong class="cart-line-price">${money(product.price * quantity)}</strong></div></div><button class="remove-line" data-remove-line="${escapeHtml(product.id)}" data-size="${size}" aria-label="Remove ${escapeHtml(product.name)}">×</button></article>`).join('');
}

function addToCart(product, size, quantity = 1) {
  const stock = availableStock(product, size);
  if (!stock) { showToast(`${size} is sold out. Try another size.`); return false; }
  const existing = cart.find((line) => line.productId === product.id && line.size === size);
  const requested = (existing?.quantity || 0) + quantity;
  if (requested > stock) { showToast(`Only ${stock} available in size ${size}.`); return false; }
  if (existing) existing.quantity = requested;
  else cart.push({ productId: product.id, size, quantity });
  writeStorage(CART_KEY, cart);
  renderCart();
  showToast(`${product.name} · ${size} added to your bag.`);
  return true;
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function showOverlay() {
  $('#overlay').hidden = false;
  document.body.classList.add('no-scroll');
}
function hideOverlayIfIdle() {
  const drawerOpen = $('#cart-drawer').classList.contains('open');
  if (!drawerOpen && !activeModal) {
    $('#overlay').hidden = true;
    document.body.classList.remove('no-scroll');
  }
}
function openCart() {
  closeModal(false);
  showOverlay();
  $('#cart-drawer').classList.add('open');
  $('#cart-drawer').setAttribute('aria-hidden', 'false');
  $('#cart-close').focus();
}
function closeCart() {
  $('#cart-drawer').classList.remove('open');
  $('#cart-drawer').setAttribute('aria-hidden', 'true');
  hideOverlayIfIdle();
}
function openModal(id) {
  closeCart();
  $$('.modal-shell').forEach((modal) => { modal.hidden = modal.id !== id; });
  activeModal = id;
  showOverlay();
  const modal = document.getElementById(id);
  modal.hidden = false;
  const closeButton = $('.modal-close', modal);
  if (closeButton) closeButton.focus();
}
function closeModal(updateOverlay = true) {
  if (activeModal) {
    const was = activeModal;
    $('#' + was).hidden = true;
    activeModal = null;
    if (was === 'size-guide-modal' && modalReturnTo) {
      const returnId = modalReturnTo;
      modalReturnTo = null;
      openModal(returnId);
      return;
    }
  }
  if (updateOverlay) hideOverlayIfIdle();
}

function openProduct(productId) {
  const product = getProduct(productId);
  if (!product) return;
  selectedProduct = product;
  selectedSize = SIZES.find((size) => availableStock(product, size) > 0) || 'M';
  selectedQuantity = 1;
  $('#modal-product-art').innerHTML = jerseySvg(product);
  $('#modal-product-art').style.background = `${cleanColors(product.colors)[0]}18`;
  $('#modal-product-category').innerHTML = `<span class="eyebrow-line"></span> ${escapeHtml(product.category.toUpperCase())} / ${escapeHtml(product.edition.toUpperCase())}`;
  $('#modal-product-name').textContent = product.name;
  $('#modal-price').innerHTML = `${money(product.price)}${product.compareAt > product.price ? ` <s>${money(product.compareAt)}</s>` : ''}`;
  $('#modal-description').textContent = product.description;
  $('#modal-quantity').value = '1';
  $('#size-options').innerHTML = SIZES.map((size) => `<button type="button" class="size-option${size === selectedSize ? ' selected' : ''}" data-size-select="${size}" ${availableStock(product, size) <= 0 ? 'disabled aria-label="' + size + ' sold out"' : ''} aria-pressed="${size === selectedSize}">${size}</button>`).join('');
  renderModalStock();
  $('#modal-add-price').textContent = money(product.price);
  $('#modal-add-to-cart').disabled = availableStock(product, selectedSize) < 1;
  openModal('product-modal');
}

function renderModalStock() {
  if (!selectedProduct) return;
  const stock = availableStock(selectedProduct, selectedSize);
  $('#stock-note').textContent = stock === 0 ? 'This size is currently sold out.' : stock <= 5 ? `Only ${stock} left in this size.` : 'Ready for your next match day.';
  $('#stock-note').style.color = stock > 0 && stock <= 5 ? '#c4533e' : '';
  $('#modal-add-to-cart').disabled = stock < 1;
  $('#modal-quantity').max = Math.min(10, stock || 1);
  if (selectedQuantity > Math.min(10, stock || 1)) {
    selectedQuantity = Math.max(1, Math.min(10, stock || 1));
    $('#modal-quantity').value = selectedQuantity;
  }
}

function cartSummary() {
  const lines = cart.map((line) => ({ ...line, product: getProduct(line.productId) })).filter((line) => line.product);
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.product.price, 0);
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_AT ? 0 : 6;
  return { lines, count, subtotal, shipping, total: subtotal + shipping };
}

function startCheckout() {
  if (!cartSummary().count) { showToast('Your bag is empty. Find a kit first.'); return; }
  closeCart();
  const summary = cartSummary();
  $('#checkout-items-count').textContent = String(summary.count);
  $('#checkout-subtotal').textContent = money(summary.subtotal);
  $('#checkout-shipping').textContent = summary.shipping === 0 ? (summary.count ? 'FREE' : money(0)) : money(summary.shipping);
  $('#checkout-total').textContent = money(summary.total);
  $('#checkout-error').hidden = true;
  $('#place-order-button').disabled = false;
  $('#place-order-button').innerHTML = 'PLACE DEMO ORDER <span>↗</span>';
  openModal('checkout-modal');
}

async function placeOrder(event) {
  event.preventDefault();
  const form = $('#checkout-form');
  if (!form.reportValidity()) return;
  const summary = cartSummary();
  if (!summary.count) { closeModal(); showToast('Your bag is empty.'); return; }
  const button = $('#place-order-button');
  const errorBox = $('#checkout-error');
  button.disabled = true;
  button.textContent = 'SAVING YOUR ORDER…';
  errorBox.hidden = true;
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());
  payload.items = summary.lines.map((line) => ({ productId: line.productId, size: line.size, quantity: line.quantity }));
  try {
    const response = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'We could not save your order. Please try again.');
    cart = [];
    writeStorage(CART_KEY, cart);
    renderCart();
    products.forEach((product) => {
      if (data.order && data.order.orderNumber) { /* Product stock will refresh from the database below. */ }
    });
    closeModal(false);
    $('#confirmation-number').textContent = data.order.orderNumber;
    $('#confirmation-total').textContent = money(data.order.total);
    form.reset();
    openModal('confirmation-modal');
    fetch('/api/products').then((r) => r.json()).then((result) => { if (result.products) { products = result.products; renderProducts(); populateNations(); } }).catch(() => {});
  } catch (error) {
    errorBox.textContent = error.message || 'Something went wrong. Please try again.';
    errorBox.hidden = false;
    button.disabled = false;
    button.innerHTML = 'PLACE DEMO ORDER <span>↗</span>';
  }
}

async function subscribeNewsletter(event) {
  event.preventDefault();
  const input = $('#newsletter-email');
  const feedback = $('#newsletter-feedback');
  const button = $('button[type="submit"]', $('#newsletter-form'));
  if (!input.reportValidity()) return;
  button.disabled = true;
  feedback.textContent = 'ADDING YOU TO THE SQUAD…';
  try {
    const response = await fetch('/api/newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: input.value }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Could not subscribe right now.');
    feedback.textContent = data.message;
    input.value = '';
    showToast('You are on the list. Welcome to the squad.');
  } catch (error) {
    feedback.textContent = error.message || 'Could not subscribe right now. Please try again.';
  } finally { button.disabled = false; }
}

function toggleWishlist(productId) {
  if (wishlist.includes(productId)) wishlist = wishlist.filter((id) => id !== productId);
  else wishlist = [...wishlist, productId];
  writeStorage(WISHLIST_KEY, wishlist);
  renderProducts();
  showToast(wishlist.includes(productId) ? 'Saved to your wishlist.' : 'Removed from your wishlist.');
}

function resetFilters() {
  category = 'All'; searchTerm = ''; selectedNation = ''; sortOrder = 'featured';
  $('#search-input').value = '';
  $('#nation-filter').value = '';
  $('#sort-select').value = 'featured';
  $('#search-panel').hidden = true;
  renderProducts();
}

function bindEvents() {
  $('#category-tabs').addEventListener('click', (event) => {
    const button = event.target.closest('[data-category]');
    if (button) setCategory(button.dataset.category);
  });
  $('#product-grid').addEventListener('click', (event) => {
    const wishlistButton = event.target.closest('[data-wishlist]');
    if (wishlistButton) { event.stopPropagation(); toggleWishlist(wishlistButton.dataset.wishlist); return; }
    const quick = event.target.closest('[data-quick-add]');
    if (quick) { openProduct(quick.dataset.quickAdd); return; }
    const product = event.target.closest('[data-product]');
    if (product) openProduct(product.dataset.product);
  });
  $('#product-grid').addEventListener('keydown', (event) => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-product]')) {
      event.preventDefault(); openProduct(event.target.dataset.product);
    }
  });
  $('#nation-filter').addEventListener('change', (event) => { selectedNation = event.target.value; renderProducts(); });
  $('#sort-select').addEventListener('change', (event) => { sortOrder = event.target.value; renderProducts(); });
  $('#search-toggle').addEventListener('click', () => { $('#search-panel').hidden = !$('#search-panel').hidden; if (!$('#search-panel').hidden) $('#search-input').focus(); });
  $('#search-close').addEventListener('click', () => { $('#search-panel').hidden = true; $('#search-input').blur(); });
  $('#search-form').addEventListener('submit', (event) => { event.preventDefault(); searchTerm = $('#search-input').value.trim(); $('#shop').scrollIntoView({ behavior: 'smooth' }); renderProducts(); });
  $('#search-input').addEventListener('input', (event) => { searchTerm = event.target.value.trim(); renderProducts(); });
  $('#mobile-menu-toggle').addEventListener('click', () => {
    const nav = $('#main-nav');
    const open = nav.classList.toggle('is-open');
    $('#mobile-menu-toggle').setAttribute('aria-expanded', String(open));
    $('#mobile-menu-toggle').setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  });
  $$('.main-nav a, .footer-column a[data-nav-category]').forEach((link) => link.addEventListener('click', () => {
    if (link.dataset.navCategory) setCategory(link.dataset.navCategory);
    $('#main-nav').classList.remove('is-open');
    $('#mobile-menu-toggle').setAttribute('aria-expanded', 'false');
  }));
  $('#cart-open').addEventListener('click', openCart);
  $('#cart-close').addEventListener('click', closeCart);
  $('#cart-items').addEventListener('click', (event) => {
    if (event.target.closest('#cart-shop')) { closeCart(); $('#shop').scrollIntoView({ behavior: 'smooth' }); return; }
    const quantityButton = event.target.closest('[data-cart-qty]');
    if (quantityButton) {
      const line = cart.find((item) => item.productId === quantityButton.dataset.id && item.size === quantityButton.dataset.size);
      const product = line && getProduct(line.productId);
      if (!line || !product) return;
      const delta = Number(quantityButton.dataset.cartQty);
      const next = line.quantity + delta;
      if (next < 1) cart = cart.filter((item) => item !== line);
      else if (next > availableStock(product, line.size)) showToast(`Only ${availableStock(product, line.size)} available in size ${line.size}.`);
      else if (next > 10) showToast('The maximum quantity per size is 10.');
      else line.quantity = next;
      writeStorage(CART_KEY, cart); renderCart(); return;
    }
    const remove = event.target.closest('[data-remove-line]');
    if (remove) {
      cart = cart.filter((line) => !(line.productId === remove.dataset.removeLine && line.size === remove.dataset.size));
      writeStorage(CART_KEY, cart); renderCart(); showToast('Item removed from your bag.');
    }
  });
  $('#overlay').addEventListener('click', () => { closeCart(); closeModal(); });
  $('#modal-add-to-cart').addEventListener('click', () => {
    if (!selectedProduct) return;
    const qty = Math.max(1, Math.min(10, Number($('#modal-quantity').value) || 1));
    if (addToCart(selectedProduct, selectedSize, qty)) closeModal();
  });
  $('#size-options').addEventListener('click', (event) => {
    const button = event.target.closest('[data-size-select]');
    if (!button || button.disabled) return;
    selectedSize = button.dataset.sizeSelect;
    selectedQuantity = 1;
    $$('.size-option').forEach((item) => { item.classList.toggle('selected', item === button); item.setAttribute('aria-pressed', String(item === button)); });
    $('#modal-quantity').value = '1';
    renderModalStock();
  });
  $('#modal-quantity').addEventListener('change', () => {
    const max = Math.min(10, availableStock(selectedProduct, selectedSize));
    selectedQuantity = Math.max(1, Math.min(max || 1, Number($('#modal-quantity').value) || 1));
    $('#modal-quantity').value = String(selectedQuantity);
  });
  $('#quantity-minus').addEventListener('click', () => { selectedQuantity = Math.max(1, selectedQuantity - 1); $('#modal-quantity').value = String(selectedQuantity); });
  $('#quantity-plus').addEventListener('click', () => { selectedQuantity = Math.min(10, availableStock(selectedProduct, selectedSize), selectedQuantity + 1); $('#modal-quantity').value = String(selectedQuantity); });
  $('#size-guide-button').addEventListener('click', () => { modalReturnTo = activeModal; openModal('size-guide-modal'); });
  $('#checkout-open').addEventListener('click', startCheckout);
  $('#checkout-form').addEventListener('submit', placeOrder);
  $('#newsletter-form').addEventListener('submit', subscribeNewsletter);
  $('#reset-filters').addEventListener('click', resetFilters);
  $('#load-all').addEventListener('click', () => { resetFilters(); $('#shop').scrollIntoView({ behavior: 'smooth' }); });
  $('#confirmation-done').addEventListener('click', () => { closeModal(); $('#shop').scrollIntoView({ behavior: 'smooth' }); });
  $$('[data-close-modal]').forEach((button) => button.addEventListener('click', () => closeModal()));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (activeModal) closeModal();
      else if ($('#cart-drawer').classList.contains('open')) closeCart();
      else $('#search-panel').hidden = true;
    }
  });
}

function makeHeroProduct() {
  const product = products.find((item) => item.id === 'argentina-skyline-home') || products[0];
  if (product) {
    $('#hero-jersey').innerHTML = jerseySvg(product);
    $('#feature-jersey').innerHTML = jerseySvg(products.find((item) => item.id === 'brazil-canary-home') || product);
  }
}

async function boot() {
  bindEvents();
  renderCart();
  try {
    const response = await fetch('/api/products');
    const data = await response.json();
    if (!response.ok || !Array.isArray(data.products)) throw new Error(data.error || 'The product list could not be loaded.');
    products = data.products;
    populateNations();
    makeHeroProduct();
    renderProducts();
    renderCart();
    // Mark active nav links for category selections.
    $$('.nav-link[data-nav-category]').forEach((link) => link.classList.toggle('active', link.dataset.navCategory === category));
  } catch (error) {
    $('#product-grid').setAttribute('aria-busy', 'false');
    $('#product-grid').innerHTML = `<div class="loading-card" style="grid-column:1/-1;min-height:240px"><strong>WE COULDN'T LOAD THE LINE-UP.</strong><span>${escapeHtml(error.message || 'Check your database connection and refresh the page.')}</span><button class="button button-dark" id="retry-products">TRY AGAIN ↻</button></div>`;
    $('#product-grid').addEventListener('click', async (event) => {
      if (event.target.closest('#retry-products')) { event.target.disabled = true; event.target.textContent = 'LOADING…'; await bootProductsOnly(); }
    });
  }
}
async function bootProductsOnly() {
  try {
    const response = await fetch('/api/products');
    const data = await response.json();
    if (!response.ok || !Array.isArray(data.products)) throw new Error(data.error || 'Unable to load the collection.');
    products = data.products; populateNations(); makeHeroProduct(); renderProducts(); renderCart();
  } catch (error) { showToast(error.message || 'Connection failed.'); }
}

boot();
