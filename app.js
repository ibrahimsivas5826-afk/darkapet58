[app.js](https://github.com/user-attachments/files/30993807/app.js)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-app.js";
import { getFirestore, collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, writeBatch, getDocs } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyALr-2dpQb25ozPgoN-VFiFGze5gQSyYSU",
  authDomain: "flutter-ai-playground-dde4d.firebaseapp.com",
  projectId: "flutter-ai-playground-dde4d",
  storageBucket: "flutter-ai-playground-dde4d.firebasestorage.app",
  messagingSenderId: "550030262104",
  appId: "1:550030262104:web:763c1e3c5c30ca6ac2ef2d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const defaultProducts = [
  { id: 1, name: 'Pro Plan Köpek Maması 3kg', category: 'Mama', price: 450, stock: 15, image: '' },
  { id: 2, name: 'Royal Canin Kedi Maması 2kg', category: 'Mama', price: 380, stock: 10, image: '' },
  { id: 3, name: 'Pro Line Bentonit Kedi Kumu 10L', category: 'Kum', price: 160, stock: 25, image: '' },
  { id: 4, name: 'Dayanıklı Köpek Tasması', category: 'Aksesuar', price: 220, stock: 30, image: '' },
  { id: 5, name: 'Kedi Tırmalama Tahtası', category: 'Aksesuar', price: 150, stock: 20, image: '' }
];

const defaultCategories = [
  { id: 'cat_1', name: 'Mama', image: '' },
  { id: 'cat_2', name: 'Kum', image: '' },
  { id: 'cat_3', name: 'Aksesuar', image: '' },
  { id: 'cat_4', name: 'Bakım', image: '' }
];

const PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgZmlsbD0iIzFlMjkzYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE2IiBmaWxsPSIjZjU5ZTBiIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+R29yc2VsIFlva3V0PC90ZXh0Pjwvc3ZnPg==';

window.products = [];
window.categories = [];
window.sepet = JSON.parse(localStorage.getItem('darkapet_cart')) || [];
window.orders = [];
window.usersList = [];
window.currentUser = JSON.parse(localStorage.getItem('darkapet_user')) || null;
window.isAdmin = JSON.parse(localStorage.getItem('darkapet_admin')) || false;
window.editingProductId = null;
window.editingCategoryId = null;
window.currentCategoryFilter = '';
window.currentOrderSubTab = 'pending';

// Telefon numarasını formatlayan yardımcı fonksiyon
function formatPhoneNumber(raw) {
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 10 && digits.charAt(0) !== '0') {
    digits = '0' + digits;
  }
  if (digits.length === 11 && digits.charAt(0) === '0') {
    return digits.replace(/(\d{4})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4');
  }
  return null;
}

// Durum metnini Türkçeleştir ve badge class'ı döndür
function getStatusInfo(status) {
  switch(status) {
    case 'pending': return { text: 'Onay Bekliyor', class: 'status-pending' };
    case 'approved': return { text: 'Onaylandı', class: 'status-approved' };
    case 'delivered': return { text: 'Teslim Edildi', class: 'status-delivered' };
    case 'cancelled': return { text: 'İptal Edildi', class: 'status-cancelled' };
    default: return { text: status, class: '' };
  }
}

async function seedDefaults() {
  const pSnap = await getDocs(collection(db, "products"));
  if (pSnap.empty) {
    const batch = writeBatch(db);
    defaultProducts.forEach(p => {
      const docRef = doc(db, "products", String(p.id));
      batch.set(docRef, p);
    });
    await batch.commit();
  }

  const cSnap = await getDocs(collection(db, "categories"));
  if (cSnap.empty) {
    const batch = writeBatch(db);
    defaultCategories.forEach(c => {
      const docRef = doc(db, "categories", c.id);
      batch.set(docRef, c);
    });
    await batch.commit();
  }
}

function initFirestoreSync() {
  onSnapshot(collection(db, "products"), (snapshot) => {
    window.products = [];
    snapshot.forEach((docSnap) => {
      window.products.push({ firestoreId: docSnap.id, ...docSnap.data() });
    });
    if (!document.getElementById('products-page').classList.contains('hidden')) {
      renderProducts();
    }
    if (window.isAdmin && !document.getElementById('admin-tab-products').classList.contains('hidden')) {
      renderAdminTable();
    }
  });

  onSnapshot(collection(db, "categories"), (snapshot) => {
    window.categories = [];
    snapshot.forEach((docSnap) => {
      window.categories.push({ firestoreId: docSnap.id, ...docSnap.data() });
    });
    renderHomeCategories();
    updateCategorySelectOptions();
    if (window.isAdmin && !document.getElementById('admin-tab-categories').classList.contains('hidden')) {
      renderAdminCategories();
    }
  });

  onSnapshot(collection(db, "orders"), (snapshot) => {
    window.orders = [];
    snapshot.forEach((docSnap) => {
      window.orders.push({ firestoreId: docSnap.id, ...docSnap.data() });
    });
    window.orders.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (window.isAdmin && !document.getElementById('admin-tab-orders').classList.contains('hidden')) {
      switchOrderSubTab(window.currentOrderSubTab);
    }
    // Profil sayfası açıksa siparişleri güncelle
    if (!document.getElementById('profile-page').classList.contains('hidden')) {
      renderMyOrders();
    }
    updateNotificationBadge();
  });

  onSnapshot(collection(db, "users"), (snapshot) => {
    window.usersList = [];
    snapshot.forEach((docSnap) => {
      window.usersList.push({ firestoreId: docSnap.id, ...docSnap.data() });
    });
    if (window.currentUser) {
      const freshUser = window.usersList.find(u => u.email === window.currentUser.email);
      if (freshUser) {
        window.currentUser = freshUser;
        localStorage.setItem('darkapet_user', JSON.stringify(window.currentUser));
      }
    }
    if (window.isAdmin && !document.getElementById('admin-tab-users').classList.contains('hidden')) {
      renderAdminUsers();
    }
  });
}

window.saveCart = function() {
  localStorage.setItem('darkapet_cart', JSON.stringify(window.sepet));
}

window.showPage = function(page) {
  document.querySelectorAll('.container > div').forEach(el => el.classList.add('hidden'));
  const target = document.getElementById(page + '-page');
  if (target) target.classList.remove('hidden');

  if (page === 'home') renderHomeCategories();
  if (page === 'products') renderProducts();
  if (page === 'cart') renderCart();
  if (page === 'checkout') renderCheckout();
  if (page === 'profile') {
    if (!window.currentUser) {
      alert('Lütfen önce giriş yapın.');
      showPage('login');
      return;
    }
    renderProfile();
    renderMyOrders();
  }
  if (page === 'admin' && window.isAdmin) {
    switchAdminTab('orders');
  }
  updateCartCount();
  updateNotificationBadge();
  
  const userLink = document.getElementById('user-link');
  if (window.currentUser) {
    userLink.textContent = window.currentUser.name.split(' ')[0];
    userLink.onclick = () => showPage('profile');
  } else {
    userLink.textContent = 'Giriş';
    userLink.onclick = () => showPage('login');
  }
}

window.renderProfile = function() {
  if (!window.currentUser) return;
  document.getElementById('profile-name').textContent = window.currentUser.name || '-';
  document.getElementById('profile-email').textContent = window.currentUser.email || '-';
  document.getElementById('profile-phone').textContent = window.currentUser.phone || '-';
  document.getElementById('profile-address').textContent = window.currentUser.address || '-';
}

window.renderMyOrders = function() {
  if (!window.currentUser) return;
  const myOrders = window.orders.filter(o => o.customerEmail === window.currentUser.email);
  const tableWrapper = document.getElementById('my-orders-table-wrapper');
  const tbody = document.querySelector('#my-orders-table tbody');
  const noMsg = document.getElementById('no-my-orders-msg');

  if (myOrders.length === 0) {
    noMsg.classList.remove('hidden');
    tableWrapper.classList.add('hidden');
    return;
  }

  noMsg.classList.add('hidden');
  tableWrapper.classList.remove('hidden');

  tbody.innerHTML = myOrders.map(o => {
    const statusInfo = getStatusInfo(o.status);
    const dateStr = new Date(o.date).toLocaleString('tr-TR');
    const canCancel = o.status === 'pending';
    return `
      <tr>
        <td><strong>${o.code}</strong></td>
        <td>${dateStr}</td>
        <td style="color:var(--accent);">${o.total} TL</td>
        <td>${o.paymentMethod}</td>
        <td><span class="status-badge ${statusInfo.class}">${statusInfo.text}</span></td>
        <td>
          <div style="display:flex; gap:5px; align-items:center;">
            <button class="secondary" style="width:auto; padding:4px 8px; font-size:0.8em;" onclick="toggleOrderDetail(this, '${o.firestoreId}')">📋 Detay</button>
            ${canCancel ? `<button class="danger" style="width:auto; padding:4px 8px; font-size:0.8em;" onclick="cancelOrder('${o.firestoreId}')">✖ İptal</button>` : ''}
          </div>
        </td>
      </tr>
      <tr id="detail-${o.firestoreId}" class="hidden" style="background: var(--bg-card);">
        <td colspan="6">
          <div style="display:flex; flex-direction:column; gap:4px; padding:10px;">
            <p><strong>Ürünler:</strong></p>
            <ul style="margin-left:20px;">
              ${o.items.map(i => `<li>${i.name} - ${i.quantity} adet (${i.price} TL)</li>`).join('')}
            </ul>
            ${o.customerLocation ? `<button class="secondary" style="width:auto; padding:4px 8px; font-size:0.8em; margin-top:5px;" onclick="showQrModal('${o.customerName}', '${o.customerLocation}')">📍 Konum QR</button>` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.toggleOrderDetail = function(btn, firestoreId) {
  const detailRow = document.getElementById('detail-' + firestoreId);
  if (detailRow) {
    detailRow.classList.toggle('hidden');
    btn.textContent = detailRow.classList.contains('hidden') ? '📋 Detay' : '🔼 Gizle';
  }
}

window.cancelOrder = async function(firestoreId) {
  if (!confirm('Bu siparişi iptal etmek istediğinize emin misiniz?')) return;
  
  const order = window.orders.find(o => o.firestoreId === firestoreId);
  if (!order || order.status !== 'pending') {
    alert('Bu sipariş iptal edilemez.');
    return;
  }

  try {
    const batch = writeBatch(db);

    // Stokları geri ekle
    for (const item of order.items) {
      const product = window.products.find(p => p.firestoreId === item.firestoreId);
      if (product) {
        const newStock = product.stock + item.quantity;
        const prodRef = doc(db, "products", product.firestoreId);
        batch.update(prodRef, { stock: newStock });
      }
    }

    // Sipariş durumunu iptal olarak güncelle
    const orderRef = doc(db, "orders", firestoreId);
    batch.update(orderRef, { status: 'cancelled' });

    await batch.commit();
    alert('Siparişiniz iptal edildi.');
  } catch (err) {
    console.error("İptal hatası:", err);
    alert('İptal sırasında bir hata oluştu.');
  }
}

window.renderHomeCategories = function() {
  const container = document.getElementById('home-categories-grid');
  if (!container) return;

  if (window.categories.length === 0) {
    container.innerHTML = '<p style="color: var(--text-muted); grid-column: 1/-1;">Henüz kategori eklenmemiş.</p>';
    return;
  }

  container.innerHTML = window.categories.map(c => `
    <div class="category-card" onclick="filterByCategory('${c.name}')">
      ${c.image ? `<img src="${c.image}" alt="${c.name}">` : `<span class="emoji-icon">📦</span>`}
      <h4>${c.name}</h4>
    </div>
  `).join('');
}

window.updateCategorySelectOptions = function() {
  const select = document.getElementById('prod-category');
  if (!select) return;
  select.innerHTML = window.categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
}

window.switchAdminTab = function(tabName) {
  document.querySelectorAll('#admin-page > div[id^="admin-tab-"]').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.admin-tab-btn').forEach(el => el.classList.remove('active'));
  
  document.getElementById('admin-tab-' + tabName).classList.remove('hidden');
  const activeTabButton = document.querySelector(`.admin-tab-btn[onclick*="${tabName}"]`);
  if (activeTabButton) activeTabButton.classList.add('active');

  if (tabName === 'orders') switchOrderSubTab(window.currentOrderSubTab);
  if (tabName === 'products') renderAdminTable();
  if (tabName === 'categories') renderAdminCategories();
  if (tabName === 'users') renderAdminUsers();
}

window.switchOrderSubTab = function(subTab) {
  window.currentOrderSubTab = subTab;
  document.querySelectorAll('#admin-tab-orders > div[id^="order-subtab-"]').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.order-subtab-btn').forEach(el => el.classList.remove('active'));

  document.getElementById('order-subtab-' + subTab).classList.remove('hidden');
  const activeSubTabButton = document.querySelector(`.order-subtab-btn[onclick*="${subTab}"]`);
  if (activeSubTabButton) activeSubTabButton.classList.add('active');
  
  renderAdminOrders(subTab);
}

window.renderProducts = function() {
  const container = document.getElementById('product-container');
  const title = document.getElementById('products-title');
  if (!container) return;

  let filtered = window.products;
  if (window.currentCategoryFilter) {
    filtered = window.products.filter(p => p.category === window.currentCategoryFilter);
    if (title) title.textContent = window.currentCategoryFilter + ' Ürünleri';
  } else {
    if (title) title.textContent = 'Tüm Ürünler';
  }

  if (filtered.length === 0) {
    container.innerHTML = '<p style="color: var(--text-muted); grid-column: 1/-1; text-align: center; padding: 30px;">Bu kategoride ürün bulunmuyor.</p>';
    return;
  }

  container.innerHTML = filtered.map(p => `
    <div class="product-card">
      <div>
        <img src="${p.image || PLACEHOLDER}" alt="${p.name}" class="product-img">
        <h4>${p.name}</h4>
        <div class="price">${p.price} TL</div>
        <div class="stock">Stok: ${p.stock}</div>
      </div>
      <button onclick="addToCart('${p.firestoreId}')" ${p.stock <= 0 ? 'disabled style="background:var(--bg-card); color:var(--text-muted); cursor:not-allowed;"' : ''}>
        ${p.stock > 0 ? 'Sepete Ekle' : 'Tükendi'}
      </button>
    </div>
  `).join('');
}

window.filterByCategory = function(categoryName) {
  window.currentCategoryFilter = categoryName;
  showPage('products');
}

window.addToCart = function(firestoreId) {
  const product = window.products.find(p => p.firestoreId === firestoreId);
  if (!product || product.stock <= 0) return;

  const existing = window.sepet.find(item => item.firestoreId === firestoreId);
  if (existing) {
    if (existing.quantity < product.stock) {
      existing.quantity++;
    } else {
      alert('Yeterli stok bulunmuyor.');
      return;
    }
  } else {
    window.sepet.push({ firestoreId: product.firestoreId, name: product.name, price: product.price, quantity: 1, stock: product.stock });
  }
  saveCart();
  updateCartCount();
  alert('Ürün sepete eklendi.');
}

window.updateCartCount = function() {
  const countEl = document.getElementById('cart-count');
  const totalCount = window.sepet.reduce((sum, item) => sum + item.quantity, 0);
  if (countEl) countEl.textContent = totalCount;
}

window.renderCart = function() {
  const container = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');
  const checkoutBtn = document.getElementById('checkout-btn');
  const emptyMsg = document.getElementById('empty-cart-msg');

  if (!container) return;

  if (window.sepet.length === 0) {
    container.innerHTML = '';
    if (totalEl) totalEl.textContent = '0';
    if (checkoutBtn) checkoutBtn.disabled = true;
    if (emptyMsg) emptyMsg.classList.remove('hidden');
    return;
  }

  if (emptyMsg) emptyMsg.classList.add('hidden');
  if (checkoutBtn) checkoutBtn.disabled = false;

  let total = 0;
  container.innerHTML = window.sepet.map((item, index) => {
    const subtotal = item.price * item.quantity;
    total += subtotal;
    return `
      <div class="sepet-item">
        <div>
          <h4 style="color:var(--text-main); font-size:1em;">${item.name}</h4>
          <p style="color:var(--text-muted); font-size:0.85em;">${item.price} TL x ${item.quantity} = <strong>${subtotal} TL</strong></p>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <button class="secondary" style="width:auto; padding:4px 10px; margin:0;" onclick="changeQuantity(${index}, 1)">+</button>
          <span>${item.quantity}</span>
          <button class="secondary" style="width:auto; padding:4px 10px; margin:0;" onclick="changeQuantity(${index}, -1)">-</button>
          <button class="danger" style="width:auto; padding:6px 10px; margin:0;" onclick="removeFromCart(${index})">🗑️</button>
        </div>
      </div>
    `;
  }).join('');

  if (totalEl) totalEl.textContent = total;
}

window.changeQuantity = function(index, delta) {
  const item = window.sepet[index];
  const product = window.products.find(p => p.firestoreId === item.firestoreId);
  const newQty = item.quantity + delta;

  if (newQty <= 0) {
    removeFromCart(index);
    return;
  }

  if (product && newQty > product.stock) {
    alert('Stok sınırına ulaşıldı.');
    return;
  }

  item.quantity = newQty;
  saveCart();
  renderCart();
  updateCartCount();
}

window.removeFromCart = function(index) {
  window.sepet.splice(index, 1);
  saveCart();
  renderCart();
  updateCartCount();
}

window.renderCheckout = function() {
  const addressBox = document.getElementById('address-select');
  if (!addressBox) return;

  if (!window.currentUser) {
    alert('Lütfen önce giriş yapın.');
    showPage('login');
    return;
  }

  addressBox.innerHTML = `
    <p><strong>Alıcı:</strong> ${window.currentUser.name}</p>
    <p><strong>Telefon:</strong> ${window.currentUser.phone}</p>
    <p><strong>Teslimat Adresi:</strong> ${window.currentUser.address || 'Adres belirtilmemiş'}</p>
  `;
}

window.placeOrder = async function() {
  if (!window.currentUser || window.sepet.length === 0) return;

  const paymentMethod = document.getElementById('payment-method').value;
  const total = window.sepet.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const orderCode = 'DKP-' + Math.floor(100000 + Math.random() * 900000);

  for (const item of window.sepet) {
    const product = window.products.find(p => p.firestoreId === item.firestoreId);
    if (!product || product.stock < item.quantity) {
      alert(`${item.name} için yeterli stok kalmadı. Mevcut stok: ${product ? product.stock : 0}`);
      return;
    }
  }

  const newOrder = {
    code: orderCode,
    customerEmail: window.currentUser.email,
    customerName: window.currentUser.name,
    customerPhone: window.currentUser.phone,
    customerAddress: window.currentUser.address || '',
    customerLocation: window.currentUser.location || '',
    items: window.sepet,
    total: total,
    paymentMethod: paymentMethod === 'cash' ? 'Kapıda Nakit' : 'Kapıda POS',
    status: 'pending',
    date: new Date().toISOString()
  };

  try {
    const batch = writeBatch(db);
    
    for (const item of window.sepet) {
      const product = window.products.find(p => p.firestoreId === item.firestoreId);
      if (product) {
        const newStock = Math.max(0, product.stock - item.quantity);
        const prodRef = doc(db, "products", product.firestoreId);
        batch.update(prodRef, { stock: newStock });
      }
    }

    const orderRef = doc(collection(db, "orders"));
    batch.set(orderRef, newOrder);

    await batch.commit();

    window.sepet = [];
    saveCart();
    updateCartCount();
    showPage('order-success');
  } catch (err) {
    console.error("Sipariş hatası:", err);
    alert('Sipariş oluşturulurken bir hata oluştu.');
  }
}

window.renderAdminOrders = function(subTab) {
  let targetStatus = 'pending';
  let tableId = 'orders-table';
  let msgId = 'no-orders-msg';

  if (subTab === 'approved') {
    targetStatus = 'approved';
    tableId = 'approved-orders-table';
    msgId = 'no-approved-orders-msg';
  } else if (subTab === 'delivered') {
    targetStatus = 'delivered';
    tableId = 'delivered-orders-table';
    msgId = 'no-delivered-orders-msg';
  }

  const table = document.getElementById(tableId);
  const tbody = table.querySelector('tbody');
  const msg = document.getElementById(msgId);

  const filtered = window.orders.filter(o => o.status === targetStatus);

  if (filtered.length === 0) {
    msg.classList.remove('hidden');
    table.classList.add('hidden');
    return;
  }

  msg.classList.add('hidden');
  table.classList.remove('hidden');

  tbody.innerHTML = filtered.map(o => {
    const dateStr = new Date(o.date).toLocaleString('tr-TR');
    const itemsList = o.items.map(i => `<li>${i.name} - ${i.quantity} adet (${i.price} TL)</li>`).join('');
    
    let actionButtons = '';
    if (targetStatus === 'pending') {
      actionButtons = `<button class="success" onclick="updateOrderStatus('${o.firestoreId}', 'approved')">Onayla</button>`;
    } else if (targetStatus === 'approved') {
      actionButtons = `<button class="info" onclick="updateOrderStatus('${o.firestoreId}', 'delivered')">Teslim Et</button>`;
    } else {
      actionButtons = `<span style="color:var(--success); font-weight:bold;">Tamamlandı</span>`;
    }

    actionButtons += `<button class="secondary" style="width:auto; padding:6px 10px; margin-top:5px;" onclick="printOrder('${o.code}')">🖨️ Yazdır</button>`;

    return `
      <tr>
        <td>
          <div style="margin-bottom:6px;"><strong>Kod:</strong> ${o.code} | <strong>Tarih:</strong> ${dateStr}</div>
          <div style="margin-bottom:6px;"><strong>Müşteri:</strong> ${o.customerName} (${o.customerPhone})</div>
          <div style="margin-bottom:6px;"><strong>Adres:</strong> ${o.customerAddress}</div>
          <div style="margin-bottom:6px;"><strong>Ödeme:</strong> ${o.paymentMethod} | <strong>Toplam:</strong> <span style="color:var(--accent);">${o.total} TL</span></div>
          <ul style="margin-left:20px; font-size:0.9em; color:var(--text-muted);">${itemsList}</ul>
          ${o.customerLocation ? `<button class="secondary" style="width:auto; padding:4px 8px; font-size:0.8em; margin-top:8px;" onclick="showQrModal('${o.customerName}', '${o.customerLocation}')">📍 Konum QR</button>` : ''}
        </td>
        <td style="text-align:center; min-width:120px;">
          ${actionButtons}
        </td>
      </tr>
    `;
  }).join('');
}

window.printOrder = function(orderCode) {
  const order = window.orders.find(o => o.code === orderCode);
  if (!order) return;

  const printWindow = window.open('', '', 'height=600,width=800');
  printWindow.document.write(`
    <html>
      <head>
        <title>Sipariş Fişi - ${order.code}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          h2 { color: #f59e0b; border-bottom: 2px solid #eee; padding-bottom: 10px; }
          .info { margin-bottom: 15px; line-height: 1.5; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 14px; }
          th { background: #f8fafc; }
          .total { margin-top: 20px; font-size: 16px; font-weight: bold; text-align: right; }
        </style>
      </head>
      <body>
        <h2>Darkapet - Sipariş Fişi</h2>
        <div class="info">
          <p><strong>Sipariş Kodu:</strong> ${order.code}</p>
          <p><strong>Tarih:</strong> ${new Date(order.date).toLocaleString('tr-TR')}</p>
          <p><strong>Müşteri:</strong> ${order.customerName} (${order.customerPhone})</p>
          <p><strong>Adres:</strong> ${order.customerAddress}</p>
          <p><strong>Ödeme Yöntemi:</strong> ${order.paymentMethod}</p>
        </div>
        <table>
          <thead>
            <tr><th>Ürün Adı</th><th>Adet</th><th>Birim Fiyat</th><th>Toplam</th></tr>
          </thead>
          <tbody>
            ${order.items.map(i => `
              <tr>
                <td>${i.name}</td>
                <td>${i.quantity}</td>
                <td>${i.price} TL</td>
                <td>${i.price * i.quantity} TL</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="total">Genel Toplam: ${order.total} TL</div>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
}

window.updateOrderStatus = async function(firestoreId, newStatus) {
  try {
    await updateDoc(doc(db, "orders", firestoreId), { status: newStatus });
  } catch (err) {
    console.error("Durum güncellenemedi:", err);
    alert('Güncelleme sırasında hata oluştu.');
  }
}

window.updateNotificationBadge = function() {
  const badge = document.getElementById('notification-badge');
  if (!badge) return;
  const pendingCount = window.orders.filter(o => o.status === 'pending').length;
  if (pendingCount > 0) {
    badge.textContent = pendingCount;
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
}

window.renderAdminTable = function() {
  const tbody = document.querySelector('#admin-product-table tbody');
  if (!tbody) return;

  tbody.innerHTML = window.products.map(p => `
    <tr>
      <td>
        <div style="display:flex; align-items:center; gap:10px;">
          <img src="${p.image || PLACEHOLDER}" alt="" style="width:40px; height:40px; object-fit:cover; border-radius:6px;">
          <span>${p.name}</span>
        </div>
      </td>
      <td>${p.category}</td>
      <td>${p.price} TL</td>
      <td class="${p.stock <= 5 ? 'stock-low' : ''}">${p.stock}</td>
      <td>
        <div style="display:flex; gap:5px;">
          <button class="secondary" style="width:auto; padding:6px 10px; margin:0;" onclick="editProduct('${p.firestoreId}')">✏️</button>
          <button class="danger" style="width:auto; padding:6px 10px; margin:0;" onclick="deleteProduct('${p.firestoreId}')">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.renderAdminCategories = function() {
  const tbody = document.querySelector('#admin-category-table tbody');
  if (!tbody) return;

  tbody.innerHTML = window.categories.map(c => `
    <tr>
      <td><img src="${c.image || PLACEHOLDER}" alt="" style="width:40px; height:40px; object-fit:cover; border-radius:6px;"></td>
      <td>${c.name}</td>
      <td>
        <div style="display:flex; gap:5px;">
          <button class="secondary" style="width:auto; padding:6px 10px; margin:0;" onclick="editCategory('${c.firestoreId}')">✏️</button>
          <button class="danger" style="width:auto; padding:6px 10px; margin:0;" onclick="deleteCategory('${c.firestoreId}')">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.renderAdminUsers = function() {
  const tbody = document.querySelector('#admin-users-table tbody');
  if (!tbody) return;

  tbody.innerHTML = window.usersList.map(u => `
    <tr>
      <td>${u.name}</td>
      <td>${u.email}</td>
      <td>${u.phone || '-'}</td>
      <td>${u.address || '-'}</td>
      <td>${u.location ? `<button class="secondary" style="width:auto; padding:4px 8px; font-size:0.8em;" onclick="showQrModal('${u.name}', '${u.location}')">Konum Gör</button>` : '-'}</td>
    </tr>
  `).join('');
}

window.showAddProductForm = function() {
  window.editingProductId = null;
  document.getElementById('form-title').textContent = 'Yeni Ürün Ekle';
  document.getElementById('prod-name').value = '';
  document.getElementById('prod-price').value = '';
  document.getElementById('prod-stock').value = '';
  document.getElementById('prod-image-data').value = '';
  document.getElementById('image-preview').style.display = 'none';
  document.getElementById('add-product-form').classList.remove('hidden');
}

window.cancelAddProduct = function() {
  document.getElementById('add-product-form').classList.add('hidden');
}

window.editProduct = function(firestoreId) {
  const p = window.products.find(item => item.firestoreId === firestoreId);
  if (!p) return;

  window.editingProductId = firestoreId;
  document.getElementById('form-title').textContent = 'Ürünü Düzenle';
  document.getElementById('prod-name').value = p.name;
  document.getElementById('prod-category').value = p.category;
  document.getElementById('prod-price').value = p.price;
  document.getElementById('prod-stock').value = p.stock;
  document.getElementById('prod-image-data').value = p.image || '';
  
  const preview = document.getElementById('image-preview');
  if (p.image) {
    preview.src = p.image;
    preview.style.display = 'block';
  } else {
    preview.style.display = 'none';
  }

  document.getElementById('add-product-form').classList.remove('hidden');
}

window.saveProduct = async function() {
  const name = document.getElementById('prod-name').value.trim();
  const category = document.getElementById('prod-category').value;
  const price = parseFloat(document.getElementById('prod-price').value);
  const stock = parseInt(document.getElementById('prod-stock').value);
  const image = document.getElementById('prod-image-data').value;

  if (!name || isNaN(price) || isNaN(stock)) {
    alert('Lütfen tüm alanları eksiksiz doldurun.');
    return;
  }

  const productData = { name, category, price, stock, image };

  try {
    if (window.editingProductId) {
      await updateDoc(doc(db, "products", window.editingProductId), productData);
    } else {
      const newDocRef = doc(collection(db, "products"));
      await setDoc(newDocRef, productData);
    }
    cancelAddProduct();
  } catch (err) {
    console.error("Ürün kaydedilemedi:", err);
    alert('Kayıt sırasında hata oluştu.');
  }
}

window.deleteProduct = async function(firestoreId) {
  if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) return;
  try {
    await deleteDoc(doc(db, "products", firestoreId));
  } catch (err) {
    console.error("Ürün silinemedi:", err);
  }
}

window.showAddCategoryForm = function() {
  window.editingCategoryId = null;
  document.getElementById('cat-form-title').textContent = 'Yeni Kategori Ekle';
  document.getElementById('cat-name').value = '';
  document.getElementById('cat-image-data').value = '';
  document.getElementById('cat-image-preview').style.display = 'none';
  document.getElementById('add-category-form').classList.remove('hidden');
}

window.cancelAddCategory = function() {
  document.getElementById('add-category-form').classList.add('hidden');
}

window.editCategory = function(firestoreId) {
  const cat = window.categories.find(c => c.firestoreId === firestoreId);
  if (!cat) return;

  window.editingCategoryId = firestoreId;
  document.getElementById('cat-form-title').textContent = 'Kategori Düzenle';
  document.getElementById('cat-name').value = cat.name;
  document.getElementById('cat-image-data').value = cat.image || '';
  
  const preview = document.getElementById('cat-image-preview');
  if (cat.image) {
    preview.src = cat.image;
    preview.style.display = 'block';
  } else {
    preview.style.display = 'none';
  }

  document.getElementById('add-category-form').classList.remove('hidden');
}

window.saveCategory = async function() {
  const name = document.getElementById('cat-name').value.trim();
  const image = document.getElementById('cat-image-data').value;

  if (!name) {
    alert('Lütfen kategori adı girin.');
    return;
  }

  const categoryData = { name, image };

  try {
    if (window.editingCategoryId) {
      await updateDoc(doc(db, "categories", window.editingCategoryId), categoryData);
    } else {
      const newDocRef = doc(collection(db, "categories"));
      await setDoc(newDocRef, categoryData);
    }
    cancelAddCategory();
  } catch (err) {
    console.error("Kategori kaydedilemedi:", err);
    alert('Kayıt sırasında hata oluştu.');
  }
}

window.deleteCategory = async function(firestoreId) {
  if (!confirm('Bu kategoriyi silmek istediğinize emin misiniz?')) return;
  try {
    await deleteDoc(doc(db, "categories", firestoreId));
  } catch (err) {
    console.error("Kategori silinemedi:", err);
  }
}

window.handleFileSelect = function(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const base64 = e.target.result;
    document.getElementById('prod-image-data').value = base64;
    const preview = document.getElementById('image-preview');
    preview.src = base64;
    preview.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

window.handleCatFileSelect = function(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const base64 = e.target.result;
    document.getElementById('cat-image-data').value = base64;
    const preview = document.getElementById('cat-image-preview');
    preview.src = base64;
    preview.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

window.openCamera = function() {
  document.getElementById('camera-input').click();
}

window.togglePassword = function(id, btn) {
  const input = document.getElementById(id);
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🔒';
  } else {
    input.type = 'password';
    btn.textContent = '👁️';
  }
}

window.toggleForms = function() {
  document.getElementById('login-form').classList.toggle('hidden');
  document.getElementById('register-form').classList.toggle('hidden');
}

window.getLocation = function() {
  if (!navigator.geolocation) {
    alert('Tarayıcınız konum servislerini desteklemiyor.');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      document.getElementById('reg-location').value = `${lat}, ${lon}`;
    },
    () => {
      alert('Konum bilgisi alınamadı.');
    }
  );
}

window.register = async function() {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const rawPhone = document.getElementById('reg-phone').value.trim();
  const password = document.getElementById('reg-password').value;
  const location = document.getElementById('reg-location').value;
  const address = document.getElementById('reg-address').value.trim();

  if (!name || !email || !password || !address) {
    alert('Lütfen ad soyad, e-posta, şifre ve adres alanlarını doldurun.');
    return;
  }

  if (!rawPhone) {
    alert('Telefon numarası zorunludur.');
    return;
  }

  const formattedPhone = formatPhoneNumber(rawPhone);
  if (!formattedPhone) {
    alert('Telefon numarası geçerli değil. Lütfen 05XX XXX XX XX formatında girin.');
    return;
  }

  document.getElementById('reg-phone').value = formattedPhone;

  const existingUser = window.usersList.find(u => u.email === email);
  if (existingUser) {
    alert('Bu e-posta adresiyle kayıtlı bir hesap zaten var.');
    return;
  }

  const newUser = { name, email, phone: formattedPhone, password, location, address };

  try {
    const docRef = doc(collection(db, "users"));
    await setDoc(docRef, newUser);
    window.currentUser = newUser;
    localStorage.setItem('darkapet_user', JSON.stringify(newUser));
    alert('Kayıt başarılı!');
    showPage('home');
  } catch (err) {
    console.error("Kayıt hatası:", err);
    alert('Kayıt oluşturulamadı.');
  }
}

window.login = async function() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  const user = window.usersList.find(u => u.email === email && u.password === password);
  if (!user) {
    alert('E-posta veya şifre hatalı.');
    return;
  }

  window.currentUser = user;
  localStorage.setItem('darkapet_user', JSON.stringify(user));
  alert('Giriş yapıldı.');
  showPage('home');
}

window.logout = function() {
  window.currentUser = null;
  localStorage.removeItem('darkapet_user');
  showPage('home');
}

window.adminLogin = function() {
  const user = document.getElementById('admin-username').value.trim();
  const pass = document.getElementById('admin-password').value;

  if (user === 'admin' && pass === 'dark123') {
    window.isAdmin = true;
    localStorage.setItem('darkapet_admin', JSON.stringify(true));
    showPage('admin');
  } else {
    alert('Yönetici adı veya şifresi hatalı.');
  }
}

window.logoutAdmin = function() {
  window.isAdmin = false;
  localStorage.removeItem('darkapet_admin');
  showPage('home');
}

window.changePassword = async function() {
  const oldPass = document.getElementById('old-password').value;
  const newPass = document.getElementById('new-password').value;

  if (!window.currentUser) return;
  if (oldPass !== window.currentUser.password) {
    alert('Mevcut şifreniz yanlış.');
    return;
  }
  if (!newPass) {
    alert('Lütfen yeni şifre girin.');
    return;
  }

  try {
    const userDoc = window.usersList.find(u => u.email === window.currentUser.email);
    if (userDoc) {
      await updateDoc(doc(db, "users", userDoc.firestoreId), { password: newPass });
      window.currentUser.password = newPass;
      localStorage.setItem('darkapet_user', JSON.stringify(window.currentUser));
      alert('Şifreniz güncellendi.');
      document.getElementById('old-password').value = '';
      document.getElementById('new-password').value = '';
    }
  } catch (err) {
    console.error("Şifre güncellenemedi:", err);
  }
}

window.showQrModal = function(customerName, coords) {
  document.getElementById('qr-modal-customer').textContent = customerName;
  document.getElementById('qr-modal-coords').textContent = coords;
  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(coords)}`;
  document.getElementById('qr-code-img').src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(mapsUrl)}`;
  document.getElementById('qr-modal').classList.remove('hidden');
}

window.closeQrModal = function(e) {
  if (e.target.id === 'qr-modal') {
    document.getElementById('qr-modal').classList.add('hidden');
  }
}

window.onload = async function() {
  await seedDefaults();
  initFirestoreSync();
  showPage('home');
};
