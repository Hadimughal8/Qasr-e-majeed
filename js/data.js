/* Qasr e Majeed — Firestore-backed data layer.
   Menu items, categories and orders live in Firebase Firestore, so
   every device (customer or admin) sees the same live data. The cart
   stays in localStorage since it's just this browser's current session. */

const QEM_ADMIN_KEY = "qem_admin_auth";

const QEM_DEFAULT_CATEGORIES = [
  { id: "pizza", name: "Pizza", icon: "🍕", tagline: "Wood-fired, stone-baked" },
  { id: "burger", name: "Burger", icon: "🍔", tagline: "Flame-grilled patties" },
  { id: "drinks", name: "Drinks", icon: "🥤", tagline: "Chilled & fresh" },
  { id: "deals", name: "Deals", icon: "🍽️", tagline: "Feasts for the table" },
];

const QEM_SEED_ITEMS = [
  { name: "Shahi Chicken Tikka Pizza", price: 1290, category: "pizza",
    description: "Smoked chicken tikka, capsicum, onion, mozzarella on a saffron-brushed crust.",
    image: "https://images.unsplash.com/photo-1601924582970-9238bcb495d9?w=500&q=80",
    isAvailable: true, isMostSelling: true, showOnHome: true },
  { name: "Malai Boti Pizza", price: 1350, category: "pizza",
    description: "Creamy malai boti, jalapenos, double cheese, garlic drizzle.",
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&q=80",
    isAvailable: true, isMostSelling: true, showOnHome: true },
  { name: "Classic Cheese Pizza", price: 990, category: "pizza",
    description: "Loaded mozzarella, tangy tomato base, oregano finish.",
    image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500&q=80",
    isAvailable: true, isMostSelling: false, showOnHome: true },
  { name: "Fajita Supreme Pizza", price: 1290, category: "pizza",
    description: "Spiced chicken fajita, bell peppers, onion rings, smoked sauce.",
    image: "https://images.unsplash.com/photo-1548369937-47519962c11a?w=500&q=80",
    isAvailable: true, isMostSelling: false, showOnHome: false },
  { name: "Qasr Zinger Burger", price: 650, category: "burger",
    description: "Crispy fried zinger fillet, house sauce, pickles, brioche bun.",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80",
    isAvailable: true, isMostSelling: true, showOnHome: true },
  { name: "Beef Seekh Burger", price: 700, category: "burger",
    description: "Char-grilled beef seekh patty, mint chutney, fresh salad.",
    image: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=500&q=80",
    isAvailable: true, isMostSelling: false, showOnHome: true },
  { name: "Double Cheese Burger", price: 780, category: "burger",
    description: "Two beef patties, double cheddar, caramelized onions.",
    image: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&q=80",
    isAvailable: true, isMostSelling: true, showOnHome: false },
  { name: "Spicy Chicken Burger", price: 620, category: "burger",
    description: "Peri-peri fried chicken, spicy mayo, lettuce crunch.",
    image: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=500&q=80",
    isAvailable: true, isMostSelling: false, showOnHome: false },
  { name: "Rooh Afza Sharbat", price: 180, category: "drinks",
    description: "Chilled rose-flavoured classic, served palace-style.",
    image: "https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=500&q=80",
    isAvailable: true, isMostSelling: false, showOnHome: false },
  { name: "Fresh Lime Soda", price: 200, category: "drinks",
    description: "Sweet, salted or mixed — a citrus refresher.",
    image: "https://images.unsplash.com/photo-1497534446932-c925b458314e?w=500&q=80",
    isAvailable: true, isMostSelling: false, showOnHome: false },
  { name: "Mango Shake", price: 350, category: "drinks",
    description: "Thick, creamy, made with real mango pulp.",
    image: "https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=500&q=80",
    isAvailable: true, isMostSelling: false, showOnHome: false },
  { name: "Chilled Soft Drink", price: 150, category: "drinks",
    description: "Ice-cold Coke, Sprite, or Fanta — your choice.",
    image: "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=500&q=80",
    isAvailable: true, isMostSelling: false, showOnHome: false },
  { name: "Qasr Family Feast", price: 2800, category: "deals",
    description: "1 large pizza, 2 zinger burgers, 4 sharbat, fries for the table.",
    image: "https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?w=500&q=80",
    isAvailable: true, isMostSelling: false, showOnHome: false },
  { name: "Duo Deal", price: 1450, category: "deals",
    description: "2 zinger burgers, 2 fresh lime sodas, fries to share.",
    image: "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=500&q=80",
    isAvailable: true, isMostSelling: false, showOnHome: false },
  { name: "Pizza & Drink Combo", price: 1490, category: "deals",
    description: "1 medium pizza of your choice + 2 chilled drinks.",
    image: "https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=500&q=80",
    isAvailable: true, isMostSelling: false, showOnHome: false },
];

const QEM_GALLERY_IMAGES = [
  { src: "assets/gallery/gallery-2.webp", caption: "Grand Hall — royal gold interior" },
  { src: "assets/gallery/gallery-4.webp", caption: "Lounge seating area" },
  { src: "assets/gallery/gallery-5.webp", caption: "Reception area" },
  { src: "assets/gallery/gallery-1.webp", caption: "Live buffet & food station" },
];

function qemSlugify(name) {
  return (
    name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") ||
    "cat-" + Date.now()
  );
}

/* ---------- Categories (Firestore collection: "categories") ---------- */
let qemCategoriesSeeded = false;

async function qemGetCategories() {
  const snap = await qemDb.collection("categories").get();
  if (snap.empty && !qemCategoriesSeeded) {
    qemCategoriesSeeded = true;
    const batch = qemDb.batch();
    QEM_DEFAULT_CATEGORIES.forEach((c) => {
      const ref = qemDb.collection("categories").doc(c.id);
      batch.set(ref, { name: c.name, icon: c.icon, tagline: c.tagline });
    });
    await batch.commit();
    return [...QEM_DEFAULT_CATEGORIES];
  }
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function qemCreateCategory(cat) {
  const existing = await qemGetCategories();
  let id = qemSlugify(cat.name);
  let suffix = 1;
  while (existing.some((c) => c.id === id)) id = qemSlugify(cat.name) + "-" + suffix++;
  await qemDb.collection("categories").doc(id).set({
    name: cat.name, icon: cat.icon || "", tagline: cat.tagline || "",
  });
  return id;
}

async function qemUpdateCategory(id, updates) {
  await qemDb.collection("categories").doc(id).update(updates);
}

async function qemDeleteCategory(id) {
  await qemDb.collection("categories").doc(id).delete();
}

/* ---------- Menu items (Firestore collection: "menuItems") ---------- */
let qemMenuSeeded = false;

async function qemGetMenu() {
  const snap = await qemDb.collection("menuItems").get();
  if (snap.empty && !qemMenuSeeded) {
    qemMenuSeeded = true;
    const batch = qemDb.batch();
    QEM_SEED_ITEMS.forEach((item) => {
      const ref = qemDb.collection("menuItems").doc();
      batch.set(ref, item);
    });
    await batch.commit();
    return qemGetMenu();
  }
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function qemCreateMenuItem(item) {
  const ref = await qemDb.collection("menuItems").add(item);
  return ref.id;
}

async function qemUpdateMenuItem(id, updates) {
  await qemDb.collection("menuItems").doc(id).update(updates);
}

async function qemDeleteMenuItem(id) {
  await qemDb.collection("menuItems").doc(id).delete();
}

/* ---------- Orders (Firestore collection: "orders") ---------- */
async function qemGetOrders() {
  const snap = await qemDb.collection("orders").orderBy("createdAt", "desc").get();
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
    };
  });
}

function qemListenOrders(callback) {
  return qemDb.collection("orders").orderBy("createdAt", "desc").onSnapshot((snap) => {
    const orders = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
      };
    });
    callback(orders);
  });
}

async function qemAddOrder(order) {
  await qemDb.collection("orders").add({
    ...order,
    status: "pending",
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

async function qemUpdateOrderStatus(id, status) {
  await qemDb.collection("orders").doc(id).update({ status });
}

async function qemDeleteOrder(id) {
  await qemDb.collection("orders").doc(id).delete();
}

function qemFormatPrice(n) {
  return "Rs " + Number(n).toLocaleString("en-PK");
}
