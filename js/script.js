/* Qasr e Majeed — customer site logic (Firestore-backed menu/orders) */

const CART_KEY = "qem_cart";

function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch (e) { return []; }
}
function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  renderCartCount();
}
function addToCart(item) {
  const cart = getCart();
  const existing = cart.find((c) => c.id === item.id);
  if (existing) existing.qty += 1;
  else cart.push({ id: item.id, name: item.name, price: item.price, image: item.image, qty: 1 });
  saveCart(cart);
  renderCartDrawer();
  showToast(item.name + " added to cart");
}
function changeQty(id, delta) {
  let cart = getCart();
  const line = cart.find((c) => c.id === id);
  if (!line) return;
  line.qty += delta;
  if (line.qty <= 0) cart = cart.filter((c) => c.id !== id);
  saveCart(cart);
  renderCartDrawer();
}
function cartTotal() {
  return getCart().reduce((sum, l) => sum + l.price * l.qty, 0);
}

function renderCartCount() {
  const el = document.getElementById("cartCount");
  if (!el) return;
  const count = getCart().reduce((s, l) => s + l.qty, 0);
  el.textContent = count;
  el.style.display = count > 0 ? "inline-block" : "none";
}

function renderCartDrawer() {
  const wrap = document.getElementById("cartItems");
  if (!wrap) return;
  const cart = getCart();
  if (cart.length === 0) {
    wrap.innerHTML = '<div class="cart-empty">Your cart is empty — add something from the menu.</div>';
  } else {
    wrap.innerHTML = cart
      .map(
        (l) => `
      <div class="cart-line">
        <img src="${l.image}" alt="${l.name}">
        <div class="cart-line-info">
          <h4>${l.name}</h4>
          <div class="qty-controls">
            <button onclick="changeQty('${l.id}', -1)">−</button>
            <span>${l.qty}</span>
            <button onclick="changeQty('${l.id}', 1)">+</button>
          </div>
        </div>
        <div class="price">${qemFormatPrice(l.price * l.qty)}</div>
      </div>`
      )
      .join("");
  }
  document.getElementById("cartTotal").textContent = qemFormatPrice(cartTotal());
}

function toggleCart(open) {
  document.getElementById("cartDrawer").classList.toggle("open", open);
  document.getElementById("cartOverlay").classList.toggle("open", open);
  if (open) renderCartDrawer();
}

function showToast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2200);
}

async function placeOrder(e) {
  e.preventDefault();
  const cart = getCart();
  if (cart.length === 0) {
    showToast("Add something to your cart first");
    return;
  }
  const name = document.getElementById("custName").value.trim();
  const phone = document.getElementById("custPhone").value.trim();
  const address = document.getElementById("custAddress").value.trim();
  if (!name || !phone || !address) {
    showToast("Name, phone and address are required");
    return;
  }
  const order = {
    customerName: name,
    phone,
    address,
    items: cart.map((l) => ({ menuItemId: l.id, name: l.name, price: l.price, quantity: l.qty })),
    totalAmount: cartTotal(),
  };
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = "Placing Order...";
  try {
    await qemAddOrder(order);
    saveCart([]);
    document.getElementById("checkoutForm").reset();
    toggleCart(false);
    showToast("Order placed! Qasr e Majeed will deliver soon.");
  } catch (err) {
    console.error(err);
    showToast("Could not place order — check your internet connection");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Place Order";
  }
}

function itemCardHtml(i, badge) {
  return `
    <div class="item-card">
      <div class="item-media">
        <img src="${i.image}" alt="${i.name}">
        ${badge ? `<span class="best-tag">${badge}</span>` : ""}
        ${!i.isAvailable ? '<div class="unavailable-tag">Not Available</div>' : ""}
      </div>
      <div class="item-body">
        <h3>${i.name}</h3>
        <p class="desc">${i.description}</p>
        <div class="item-footer">
          <span class="price">${qemFormatPrice(i.price)}</span>
          <button class="add-btn" ${!i.isAvailable ? "disabled" : ""} onclick='addToCart(${JSON.stringify(i)})'>Add to Cart</button>
        </div>
      </div>
    </div>`;
}

/* ---------- Home page: most selling products ---------- */
async function renderMostSelling() {
  const grid = document.getElementById("mostSellingGrid");
  const section = document.getElementById("mostSellingSection");
  if (!grid || !section) return;
  const menu = await qemGetMenu();
  const items = menu.filter((i) => i.isMostSelling);
  if (items.length === 0) {
    section.style.display = "none";
    return;
  }
  section.style.display = "";
  grid.innerHTML = items.map((i) => itemCardHtml(i, "Best Seller")).join("");
  return menu;
}

/* ---------- Home page: category preview rows ---------- */
async function renderHomeCategorySections(menu) {
  const wrap = document.getElementById("homeCategorySections");
  if (!wrap) return;
  const categories = await qemGetCategories();
  const items = menu || (await qemGetMenu());

  const blocks = categories
    .map((cat) => {
      const catItems = items.filter((i) => i.category === cat.id && i.showOnHome);
      if (catItems.length === 0) return "";
      return `
      <div class="home-category-block">
        <div class="home-category-head">
          <h2>${cat.icon || ""} ${cat.name}</h2>
          <a class="view-all-link" href="menu.html?cat=${cat.id}">View All →</a>
        </div>
        <div class="menu-grid">${catItems.map((i) => itemCardHtml(i)).join("")}</div>
      </div>`;
    })
    .join("");

  wrap.innerHTML = blocks || '<p style="text-align:center;color:var(--charcoal-soft);">No items selected for the Home page yet.</p>';
}

/* ---------- Home page: gallery slider ---------- */
let galleryIndex = 0;
let galleryTimer = null;

function renderGallery() {
  const track = document.getElementById("galleryTrack");
  const dots = document.getElementById("galleryDots");
  if (!track || !dots) return;
  track.innerHTML = QEM_GALLERY_IMAGES.map(
    (g) => `<div class="gallery-slide"><img src="${g.src}" alt="${g.caption}"><div class="gallery-caption">${g.caption}</div></div>`
  ).join("");
  dots.innerHTML = QEM_GALLERY_IMAGES.map(
    (_, i) => `<button class="gallery-dot ${i === 0 ? "active" : ""}" onclick="goToSlide(${i})"></button>`
  ).join("");
  startGalleryAutoplay();
}

function updateGallery() {
  const track = document.getElementById("galleryTrack");
  if (!track) return;
  track.style.transform = `translateX(-${galleryIndex * 100}%)`;
  document.querySelectorAll(".gallery-dot").forEach((d, i) => d.classList.toggle("active", i === galleryIndex));
}

function goToSlide(i) {
  galleryIndex = i;
  updateGallery();
  startGalleryAutoplay();
}
function nextSlide() {
  galleryIndex = (galleryIndex + 1) % QEM_GALLERY_IMAGES.length;
  updateGallery();
}
function prevSlide() {
  galleryIndex = (galleryIndex - 1 + QEM_GALLERY_IMAGES.length) % QEM_GALLERY_IMAGES.length;
  updateGallery();
}
function startGalleryAutoplay() {
  clearInterval(galleryTimer);
  galleryTimer = setInterval(nextSlide, 4000);
}

/* ---------- Menu page ---------- */
let activeCategory = "all";
let allMenuItems = [];

async function renderMenu() {
  const grid = document.getElementById("menuGrid");
  if (!grid) return;
  const items = allMenuItems.filter((i) => activeCategory === "all" || i.category === activeCategory);
  if (items.length === 0) {
    grid.innerHTML = '<p style="text-align:center;color:var(--charcoal-soft);grid-column:1/-1;">No items in this category yet.</p>';
    return;
  }
  grid.innerHTML = items.map((i) => itemCardHtml(i)).join("");
}

function setFilter(cat) {
  activeCategory = cat;
  document.querySelectorAll(".filter-chip").forEach((el) => {
    el.classList.toggle("active", el.dataset.cat === cat);
  });
  renderMenu();
}

async function initMenuPage() {
  const chipsWrap = document.getElementById("filterBar");
  const grid = document.getElementById("menuGrid");
  grid.innerHTML = '<p style="text-align:center;color:var(--charcoal-soft);grid-column:1/-1;">Loading menu...</p>';

  let categories, menu;
  try {
    [categories, menu] = await Promise.all([qemGetCategories(), qemGetMenu()]);
  } catch (err) {
    console.error(err);
    grid.innerHTML = '<p style="text-align:center;color:var(--maroon);grid-column:1/-1;">Menu could not load. Check your Firebase setup in js/firebase-config.js and your internet connection.</p>';
    return;
  }
  allMenuItems = menu;

  const chips = ['<button class="filter-chip active" data-cat="all" onclick="setFilter(\'all\')">All</button>']
    .concat(
      categories.map(
        (c) => `<button class="filter-chip" data-cat="${c.id}" onclick="setFilter('${c.id}')">${c.icon || ""} ${c.name}</button>`
      )
    )
    .join("");
  chipsWrap.innerHTML = chips;

  const params = new URLSearchParams(window.location.search);
  const catParam = params.get("cat");
  if (catParam && categories.some((c) => c.id === catParam)) {
    setFilter(catParam);
  } else {
    renderMenu();
  }
}

/* ---------- Nav toggle (mobile) ---------- */
function toggleNav() {
  document.getElementById("mainNav").classList.toggle("open");
}

document.addEventListener("DOMContentLoaded", () => {
  renderCartCount();
  renderCartDrawer();
});
