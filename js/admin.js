/* Qasr e Majeed — Admin panel logic (Firestore-backed)
   NOTE: Login below is a simple client-side check, not real Firebase
   Authentication — fine for managing your own restaurant, but don't
   rely on it to hide anything sensitive. See FIREBASE_SETUP.md for
   more secure options later. */

const ADMIN_USER = "admin";
const ADMIN_PASS = "qasr123";

let ordersUnsubscribe = null;

function checkAdminAuth() {
  const isAuth = sessionStorage.getItem(QEM_ADMIN_KEY) === "true";
  document.getElementById("loginScreen").style.display = isAuth ? "none" : "flex";
  document.getElementById("adminShell").classList.toggle("visible", isAuth);
  if (isAuth) {
    startOrdersListener();
    renderAdminMenu();
    renderAdminCategories();
  }
}

function handleLogin(e) {
  e.preventDefault();
  const u = document.getElementById("loginUser").value.trim();
  const p = document.getElementById("loginPass").value.trim();
  const err = document.getElementById("loginError");
  if (u === ADMIN_USER && p === ADMIN_PASS) {
    sessionStorage.setItem(QEM_ADMIN_KEY, "true");
    err.textContent = "";
    checkAdminAuth();
  } else {
    err.textContent = "Incorrect username or password.";
  }
}

function handleLogout() {
  sessionStorage.removeItem(QEM_ADMIN_KEY);
  if (ordersUnsubscribe) ordersUnsubscribe();
  checkAdminAuth();
}

function switchTab(tab) {
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("active", p.id === "tab-" + tab));
}

/* ---------- Orders (live updates via Firestore listener) ---------- */
const STATUS_FLOW = ["pending", "preparing", "out for delivery", "delivered"];
const STATUS_LABEL = {
  pending: "Pending",
  preparing: "Preparing",
  "out for delivery": "Out for Delivery",
  delivered: "Delivered",
};
const STATUS_CLASS = {
  pending: "status-pending",
  preparing: "status-preparing",
  "out for delivery": "status-out",
  delivered: "status-delivered",
};

function startOrdersListener() {
  const wrap = document.getElementById("ordersList");
  wrap.innerHTML = '<div class="empty-state">Loading orders...</div>';
  if (ordersUnsubscribe) ordersUnsubscribe();
  try {
    ordersUnsubscribe = qemListenOrders((orders) => renderOrders(orders));
  } catch (err) {
    console.error(err);
    wrap.innerHTML = '<div class="empty-state">Orders could not load. Check Firebase setup in js/firebase-config.js.</div>';
  }
}

function renderOrders(orders) {
  const wrap = document.getElementById("ordersList");
  if (orders.length === 0) {
    wrap.innerHTML = '<div class="empty-state">No orders yet.</div>';
    return;
  }
  wrap.innerHTML = orders
    .map((o) => {
      const itemsHtml = o.items
        .map((i) => `<div><span>${i.name} × ${i.quantity}</span><span>${qemFormatPrice(i.price * i.quantity)}</span></div>`)
        .join("");
      const optionsHtml = STATUS_FLOW.map(
        (s) => `<option value="${s}" ${o.status === s ? "selected" : ""}>${STATUS_LABEL[s]}</option>`
      ).join("");
      const time = new Date(o.createdAt).toLocaleString("en-PK", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" });
      return `
      <div class="order-card">
        <div class="order-card-top">
          <div>
            <div class="order-id">#${o.id.slice(-6).toUpperCase()} · ${time}</div>
            <div class="order-customer">${o.customerName}</div>
            <div class="order-meta">${o.phone} · ${o.address}</div>
          </div>
          <span class="status-badge ${STATUS_CLASS[o.status]}">${STATUS_LABEL[o.status]}</span>
        </div>
        <div class="order-items">${itemsHtml}</div>
        <div class="order-footer">
          <span class="order-total">Total: ${qemFormatPrice(o.totalAmount)}</span>
          <div class="order-actions">
            <select class="status-select" onchange="updateOrderStatus('${o.id}', this.value)">${optionsHtml}</select>
            <button class="del-order-btn" onclick="deleteOrder('${o.id}')" title="Delete order">🗑 Delete</button>
          </div>
        </div>
      </div>`;
    })
    .join("");
}

async function updateOrderStatus(id, status) {
  try {
    await qemUpdateOrderStatus(id, status);
  } catch (err) {
    alert("Status update failed — check your internet connection");
  }
}

async function deleteOrder(id) {
  if (!confirm("Delete this order? This cannot be undone.")) return;
  try {
    await qemDeleteOrder(id);
  } catch (err) {
    alert("Delete failed — check your internet connection");
  }
}

/* ---------- Categories management ---------- */
let editingCategoryId = null;
let cachedCategories = [];

async function renderAdminCategories() {
  const grid = document.getElementById("adminCategoryGrid");
  grid.innerHTML = '<div class="empty-state">Loading categories...</div>';
  try {
    cachedCategories = await qemGetCategories();
  } catch (err) {
    grid.innerHTML = '<div class="empty-state">Categories could not load. Check Firebase setup.</div>';
    return;
  }
  if (cachedCategories.length === 0) {
    grid.innerHTML = '<div class="empty-state">No categories yet. Use "Add Category" to start.</div>';
    return;
  }
  grid.innerHTML = cachedCategories
    .map(
      (c) => `
    <div class="category-admin-card">
      <div class="category-admin-icon">${c.icon || "🍴"}</div>
      <h4>${c.name}</h4>
      <p>${c.tagline || ""}</p>
      <div class="admin-item-actions">
        <button class="edit-btn" onclick="openCategoryModal('${c.id}')">Edit</button>
        <button class="del-btn" onclick="deleteCategory('${c.id}')">Delete</button>
      </div>
    </div>`
    )
    .join("");
}

function openCategoryModal(id) {
  editingCategoryId = id || null;
  const modal = document.getElementById("categoryModal");
  const title = document.getElementById("catModalTitle");
  if (id) {
    const cat = cachedCategories.find((c) => c.id === id);
    title.textContent = "Edit Category";
    document.getElementById("catName").value = cat.name;
    document.getElementById("catIcon").value = cat.icon || "";
    document.getElementById("catTagline").value = cat.tagline || "";
  } else {
    title.textContent = "Add Category";
    document.getElementById("categoryForm").reset();
  }
  modal.classList.add("open");
}

function closeCategoryModal() {
  document.getElementById("categoryModal").classList.remove("open");
  editingCategoryId = null;
}

async function saveCategory(e) {
  e.preventDefault();
  const name = document.getElementById("catName").value.trim();
  const icon = document.getElementById("catIcon").value.trim();
  const tagline = document.getElementById("catTagline").value.trim();
  if (!name) return;

  const saveBtn = e.target.querySelector(".btn-save");
  saveBtn.disabled = true;
  try {
    if (editingCategoryId) {
      await qemUpdateCategory(editingCategoryId, { name, icon, tagline });
    } else {
      await qemCreateCategory({ name, icon, tagline });
    }
    await renderAdminCategories();
    closeCategoryModal();
  } catch (err) {
    alert("Save failed — check your internet connection");
  } finally {
    saveBtn.disabled = false;
  }
}

async function deleteCategory(id) {
  if (!confirm("Delete this category?")) return;
  try {
    await qemDeleteCategory(id);
    renderAdminCategories();
  } catch (err) {
    alert("Delete failed — check your internet connection");
  }
}

/* ---------- Menu management ---------- */
let editingItemId = null;
let cachedMenu = [];

async function renderAdminMenu() {
  const grid = document.getElementById("adminMenuGrid");
  grid.innerHTML = '<div class="empty-state">Loading menu...</div>';
  try {
    cachedMenu = await qemGetMenu();
  } catch (err) {
    grid.innerHTML = '<div class="empty-state">Menu could not load. Check Firebase setup.</div>';
    return;
  }
  const categories = cachedCategories.length ? cachedCategories : await qemGetCategories();
  if (cachedMenu.length === 0) {
    grid.innerHTML = '<div class="empty-state">No menu items yet. Use "Add New Item" to start.</div>';
    return;
  }
  grid.innerHTML = cachedMenu
    .map(
      (i) => `
    <div class="admin-item-card">
      <img src="${i.image}" alt="${i.name}">
      <div class="admin-item-body">
        <span class="cat-tag">${(categories.find((c) => c.id === i.category) || {}).name || i.category}</span>
        <h4>${i.name}</h4>
        <div class="price">${qemFormatPrice(i.price)}</div>
        <label class="avail-toggle">
          <input type="checkbox" ${i.isAvailable ? "checked" : ""} onchange="toggleItemFlag('${i.id}', 'isAvailable', this.checked)">
          Available
        </label>
        <label class="avail-toggle">
          <input type="checkbox" ${i.isMostSelling ? "checked" : ""} onchange="toggleItemFlag('${i.id}', 'isMostSelling', this.checked)">
          Show in "Most Selling"
        </label>
        <label class="avail-toggle">
          <input type="checkbox" ${i.showOnHome ? "checked" : ""} onchange="toggleItemFlag('${i.id}', 'showOnHome', this.checked)">
          Show under its category on Home
        </label>
        <div class="admin-item-actions">
          <button class="edit-btn" onclick="openItemModal('${i.id}')">Edit</button>
          <button class="del-btn" onclick="deleteItem('${i.id}')">Delete</button>
        </div>
      </div>
    </div>`
    )
    .join("");
}

async function toggleItemFlag(id, flag, checked) {
  try {
    await qemUpdateMenuItem(id, { [flag]: checked });
  } catch (err) {
    alert("Update failed — check your internet connection");
    renderAdminMenu();
  }
}

async function deleteItem(id) {
  if (!confirm("Delete this item?")) return;
  try {
    await qemDeleteMenuItem(id);
    renderAdminMenu();
  } catch (err) {
    alert("Delete failed — check your internet connection");
  }
}

function openItemModal(id) {
  editingItemId = id || null;
  const modal = document.getElementById("itemModal");
  const title = document.getElementById("modalTitle");
  const catSelect = document.getElementById("fCategory");
  catSelect.innerHTML = cachedCategories.map((c) => `<option value="${c.id}">${c.icon || ""} ${c.name}</option>`).join("");

  if (id) {
    const item = cachedMenu.find((i) => i.id === id);
    title.textContent = "Edit Item";
    document.getElementById("fName").value = item.name;
    document.getElementById("fPrice").value = item.price;
    document.getElementById("fCategory").value = item.category;
    document.getElementById("fImage").value = item.image;
    document.getElementById("fDesc").value = item.description;
  } else {
    title.textContent = "Add New Item";
    document.getElementById("itemForm").reset();
  }
  modal.classList.add("open");
}

function closeItemModal() {
  document.getElementById("itemModal").classList.remove("open");
  editingItemId = null;
}

async function saveItem(e) {
  e.preventDefault();
  const name = document.getElementById("fName").value.trim();
  const price = Number(document.getElementById("fPrice").value);
  const category = document.getElementById("fCategory").value;
  const image = document.getElementById("fImage").value.trim();
  const description = document.getElementById("fDesc").value.trim();

  if (!name || !price || !image) return;

  const saveBtn = e.target.querySelector(".btn-save");
  saveBtn.disabled = true;
  try {
    if (editingItemId) {
      await qemUpdateMenuItem(editingItemId, { name, price, category, image, description });
    } else {
      await qemCreateMenuItem({
        name, price, category, image, description,
        isAvailable: true, isMostSelling: false, showOnHome: false,
      });
    }
    await renderAdminMenu();
    closeItemModal();
  } catch (err) {
    alert("Save failed — check your internet connection");
  } finally {
    saveBtn.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", checkAdminAuth);
