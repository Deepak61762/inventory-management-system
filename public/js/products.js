requireAuth();

const role = localStorage.getItem('role');
const username = localStorage.getItem('username');
document.getElementById('userInfo').textContent = `${username} (${role})`;

const isAdmin = role === 'ADMIN';
if (isAdmin) {
  document.getElementById('adminPanel').style.display = 'block';
  document.getElementById('categoryAdminPanel').style.display = 'block';
  document.getElementById('supplierAdminPanel').style.display = 'block';
  document.getElementById('loginHistoryNav').style.display = 'block';
  document.getElementById('usersNav').style.display = 'block';
}

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.clear();
  window.location.href = 'login.html';
});

// ===== Sidebar navigation (no page reloads, just show/hide sections) =====
const navItems = document.querySelectorAll('.nav-item');
const views = document.querySelectorAll('.view');

navItems.forEach(btn => {
  btn.addEventListener('click', () => {
    navItems.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    views.forEach(v => v.style.display = 'none');
    document.getElementById(`view-${btn.dataset.section}`).style.display = 'block';
  });
});

// ===== Shared state (loaded once, reused across sections) =====
let allProducts = [];
let allCategories = [];
let allSuppliers = [];

// ===== Products =====
async function loadProducts() {
  try {
    allProducts = await apiRequest('/products');
    renderProducts();
    renderStats();
    populateProductDropdowns();
  } catch (err) {
    console.error(err);
  }
}

function renderProducts() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const categoryFilter = document.getElementById('filterCategory').value;

  const filtered = allProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search) || p.sku.toLowerCase().includes(search);
    const matchesCategory = !categoryFilter || p.category_name === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const tbody = document.getElementById('productsBody');
  tbody.innerHTML = '';

  filtered.forEach(p => {
    const row = document.createElement('tr');
    if (p.quantity < p.reorder_level / 2) {
      row.classList.add('status-critical');
    } else if (p.quantity < p.reorder_level) {
      row.classList.add('status-low');
    }

    row.innerHTML = `
      <td class="stock-cell">${p.name}</td>
      <td>${p.sku}</td>
      <td>${p.category_name || '-'}</td>
      <td>${p.supplier_name || '-'}</td>
      <td>${p.price}</td>
      <td>${p.quantity}</td>
      <td>${p.reorder_level}</td>
      <td class="actions-cell">
        ${isAdmin ? `<button class="edit-btn" onclick="openEditModal(${p.id})">Edit</button>` : ''}
        ${isAdmin ? `<button class="delete-btn" onclick="deleteProduct(${p.id})">Delete</button>` : ''}
      </td>
    `;
    tbody.appendChild(row);
  });
}

document.getElementById('searchInput').addEventListener('input', renderProducts);
document.getElementById('filterCategory').addEventListener('change', renderProducts);

async function loadLowStock() {
  try {
    const lowStock = await apiRequest('/products/low-stock');
    const banner = document.getElementById('lowStockBanner');
    if (lowStock.length > 0) {
      banner.style.display = 'block';
      banner.textContent = `⚠ Low stock alert: ${lowStock.map(p => p.name).join(', ')}`;
    } else {
      banner.style.display = 'none';
    }
  } catch (err) {
    console.error(err);
  }
}

async function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  try {
    await apiRequest(`/products/${id}`, 'DELETE');
    loadProducts();
    loadLowStock();
  } catch (err) {
    alert(err.message);
  }
}

const addProductForm = document.getElementById('addProductForm');
if (addProductForm) {
  addProductForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      name: document.getElementById('p_name').value,
      sku: document.getElementById('p_sku').value,
      category_id: document.getElementById('p_category').value || null,
      supplier_id: document.getElementById('p_supplier').value || null,
      price: parseFloat(document.getElementById('p_price').value),
      quantity: parseInt(document.getElementById('p_quantity').value) || 0,
      reorder_level: parseInt(document.getElementById('p_reorder').value) || 10
    };
    try {
      await apiRequest('/products', 'POST', body);
      addProductForm.reset();
      loadProducts();
      loadLowStock();
    } catch (err) {
      alert(err.message);
    }
  });
}

// ===== Edit product (modal) =====
function openEditModal(id) {
  const product = allProducts.find(p => p.id === id);
  if (!product) return;

  document.getElementById('e_id').value = product.id;
  document.getElementById('e_name').value = product.name;
  document.getElementById('e_sku').value = product.sku;
  document.getElementById('e_price').value = product.price;
  document.getElementById('e_reorder').value = product.reorder_level;

  const categorySelect = document.getElementById('e_category');
  const category = allCategories.find(c => c.name === product.category_name);
  categorySelect.value = category ? category.id : '';

  const supplierSelect = document.getElementById('e_supplier');
  const supplier = allSuppliers.find(s => s.name === product.supplier_name);
  supplierSelect.value = supplier ? supplier.id : '';

  document.getElementById('editModalBackdrop').style.display = 'flex';
}

document.getElementById('cancelEditBtn').addEventListener('click', () => {
  document.getElementById('editModalBackdrop').style.display = 'none';
});

document.getElementById('editProductForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('e_id').value;
  const body = {
    name: document.getElementById('e_name').value,
    sku: document.getElementById('e_sku').value,
    category_id: document.getElementById('e_category').value || null,
    supplier_id: document.getElementById('e_supplier').value || null,
    price: parseFloat(document.getElementById('e_price').value),
    reorder_level: parseInt(document.getElementById('e_reorder').value)
  };
  try {
    await apiRequest(`/products/${id}`, 'PUT', body);
    document.getElementById('editModalBackdrop').style.display = 'none';
    loadProducts();
    loadLowStock();
  } catch (err) {
    alert(err.message);
  }
});

// ===== Dashboard stats =====
function renderStats() {
  document.getElementById('statTotalProducts').textContent = allProducts.length;

  const lowStockCount = allProducts.filter(p => p.quantity < p.reorder_level).length;
  document.getElementById('statLowStock').textContent = lowStockCount;

  const totalValue = allProducts.reduce((sum, p) => sum + (parseFloat(p.price) * p.quantity), 0);
  document.getElementById('statTotalValue').textContent = totalValue.toLocaleString(undefined, { style: 'currency', currency: 'USD' });

  document.getElementById('statCategories').textContent = allCategories.length;
}

// ===== Categories =====
async function loadCategories() {
  try {
    allCategories = await apiRequest('/categories');
    renderCategories();
    populateCategoryDropdowns();
    renderStats();
  } catch (err) {
    console.error(err);
  }
}

function renderCategories() {
  const tbody = document.getElementById('categoriesBody');
  tbody.innerHTML = '';
  allCategories.forEach(c => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${c.name}</td>
      <td>${isAdmin ? `<button class="delete-btn" onclick="deleteCategory(${c.id})">Delete</button>` : ''}</td>
    `;
    tbody.appendChild(row);
  });
}

async function deleteCategory(id) {
  if (!confirm('Delete this category? Products using it will keep their category_id but it will show as unlinked.')) return;
  try {
    await apiRequest(`/categories/${id}`, 'DELETE');
    loadCategories();
  } catch (err) {
    alert(err.message);
  }
}

const addCategoryForm = document.getElementById('addCategoryForm');
if (addCategoryForm) {
  addCategoryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/categories', 'POST', { name: document.getElementById('c_name').value });
      addCategoryForm.reset();
      loadCategories();
    } catch (err) {
      alert(err.message);
    }
  });
}

function populateCategoryDropdowns() {
  const selects = [
    document.getElementById('p_category'),
    document.getElementById('e_category'),
    document.getElementById('filterCategory')
  ];
  selects.forEach(select => {
    const isFilter = select.id === 'filterCategory';
    const currentValue = select.value;
    select.innerHTML = isFilter
      ? '<option value="">All categories</option>'
      : '<option value="">No category</option>';
    allCategories.forEach(c => {
      const opt = document.createElement('option');
      opt.value = isFilter ? c.name : c.id;
      opt.textContent = c.name;
      select.appendChild(opt);
    });
    select.value = currentValue;
  });
}

// ===== Suppliers =====
async function loadSuppliers() {
  try {
    allSuppliers = await apiRequest('/suppliers');
    renderSuppliers();
    populateSupplierDropdowns();
  } catch (err) {
    console.error(err);
  }
}

function renderSuppliers() {
  const tbody = document.getElementById('suppliersBody');
  tbody.innerHTML = '';
  allSuppliers.forEach(s => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${s.name}</td>
      <td>${s.contact_email || '-'}</td>
      <td>${s.phone || '-'}</td>
      <td>${isAdmin ? `<button class="delete-btn" onclick="deleteSupplier(${s.id})">Delete</button>` : ''}</td>
    `;
    tbody.appendChild(row);
  });
}

async function deleteSupplier(id) {
  if (!confirm('Delete this supplier?')) return;
  try {
    await apiRequest(`/suppliers/${id}`, 'DELETE');
    loadSuppliers();
  } catch (err) {
    alert(err.message);
  }
}

const addSupplierForm = document.getElementById('addSupplierForm');
if (addSupplierForm) {
  addSupplierForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      name: document.getElementById('s_name').value,
      contact_email: document.getElementById('s_email').value,
      phone: document.getElementById('s_phone').value
    };
    try {
      await apiRequest('/suppliers', 'POST', body);
      addSupplierForm.reset();
      loadSuppliers();
    } catch (err) {
      alert(err.message);
    }
  });
}

function populateSupplierDropdowns() {
  const selects = [document.getElementById('p_supplier'), document.getElementById('e_supplier')];
  selects.forEach(select => {
    const currentValue = select.value;
    select.innerHTML = '<option value="">No supplier</option>';
    allSuppliers.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name;
      select.appendChild(opt);
    });
    select.value = currentValue;
  });
}

// ===== Stock movement + history =====
function populateProductDropdowns() {
  const selects = [document.getElementById('s_productId'), document.getElementById('historyProductSelect')];
  selects.forEach(select => {
    const currentValue = select.value;
    select.innerHTML = '';
    allProducts.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.name} (${p.sku})`;
      select.appendChild(opt);
    });
    select.value = currentValue;
  });
}

const stockForm = document.getElementById('stockForm');
stockForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    product_id: parseInt(document.getElementById('s_productId').value),
    type: document.getElementById('s_type').value,
    quantity: parseInt(document.getElementById('s_quantity').value),
    note: document.getElementById('s_note').value
  };
  try {
    const result = await apiRequest('/stock/transaction', 'POST', body);
    document.getElementById('stockMsg').textContent = `Success! New quantity: ${result.new_quantity}`;
    stockForm.reset();
    loadProducts();
    loadLowStock();
    loadHistory();
    loadRevenueSummary();
  } catch (err) {
    document.getElementById('stockMsg').textContent = `Error: ${err.message}`;
  }
});

async function loadHistory() {
  const productId = document.getElementById('historyProductSelect').value;
  if (!productId) return;
  try {
    const history = await apiRequest(`/stock/history/${productId}`);
    const tbody = document.getElementById('historyBody');
    tbody.innerHTML = '';
    history.forEach(h => {
      const row = document.createElement('tr');
      const date = new Date(h.created_at).toLocaleString();
      const amount = h.line_total !== null
        ? parseFloat(h.line_total).toLocaleString(undefined, { style: 'currency', currency: 'USD' })
        : '—';
      row.innerHTML = `
        <td>${date}</td>
        <td>${h.type}</td>
        <td>${h.quantity}</td>
        <td>${amount}</td>
        <td>${h.username}</td>
        <td>${h.note || '-'}</td>
      `;
      tbody.appendChild(row);
    });
  } catch (err) {
    console.error(err);
  }
}

async function loadRevenueSummary() {
  try {
    const summary = await apiRequest('/stock/revenue-summary');
    const fmt = (n) => n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
    document.getElementById('statSalesRevenue').textContent = fmt(summary.totalSalesRevenue);
    document.getElementById('statRestockCost').textContent = fmt(summary.totalRestockCost);
    document.getElementById('statNetRevenue').textContent = fmt(summary.netRevenue);
  } catch (err) {
    console.error(err);
  }
}

document.getElementById('historyProductSelect').addEventListener('change', loadHistory);

// ===== Login history (ADMIN only) =====
async function loadLoginHistory() {
  if (!isAdmin) return;
  try {
    const history = await apiRequest('/auth/login-history');
    const tbody = document.getElementById('loginHistoryBody');
    tbody.innerHTML = '';
    history.forEach(h => {
      const row = document.createElement('tr');
      const date = new Date(h.login_at).toLocaleString();
      row.innerHTML = `<td>${h.username}</td><td>${h.role}</td><td>${date}</td>`;
      tbody.appendChild(row);
    });
  } catch (err) {
    console.error(err);
  }
}

const clearHistoryBtn = document.getElementById('clearHistoryBtn');
if (clearHistoryBtn) {
  clearHistoryBtn.addEventListener('click', async () => {
    if (!confirm('Clear all login history? This cannot be undone.')) return;
    try {
      await apiRequest('/auth/login-history', 'DELETE');
      loadLoginHistory();
    } catch (err) {
      alert(err.message);
    }
  });
}

// ===== Users (ADMIN only) =====
let allUsers = [];

async function loadUsers() {
  if (!isAdmin) return;
  try {
    allUsers = await apiRequest('/auth/users');
    renderUsers();
  } catch (err) {
    console.error(err);
  }
}

function renderUsers() {
  const search = document.getElementById('userSearchInput').value.toLowerCase();
  const filtered = allUsers.filter(u => u.username.toLowerCase().includes(search));

  const tbody = document.getElementById('usersBody');
  tbody.innerHTML = '';
  filtered.forEach(u => {
      const row = document.createElement('tr');
      const joined = new Date(u.created_at).toLocaleDateString();
      const statusLabel = u.is_active ? '<span style="color:var(--pine);">Active</span>' : '<span style="color:var(--brick);">Inactive</span>';

      let actionsHtml = '<span style="color:var(--muted); font-size:13px;">Self-service only</span>';
      if (u.role === 'STAFF') {
        if (u.is_active) {
          actionsHtml = `
            <button class="edit-btn" onclick="openResetPasswordModal(${u.id}, '${u.username}')">Reset Password</button>
            <button class="delete-btn" onclick="openDeactivateUserModal(${u.id}, '${u.username}')">Deactivate</button>
          `;
        } else {
          actionsHtml = `<button class="edit-btn" onclick="reactivateUser(${u.id})">Reactivate</button>`;
        }
      }

      row.innerHTML = `
        <td>${u.username}</td>
        <td>${u.role}</td>
        <td>${statusLabel}</td>
        <td>${joined}</td>
        <td class="actions-cell">${actionsHtml}</td>
      `;
      tbody.appendChild(row);
  });
}

document.getElementById('userSearchInput').addEventListener('input', renderUsers);

function openResetPasswordModal(userId, username) {
  document.getElementById('rp_userId').value = userId;
  document.getElementById('rp_newPassword').value = '';
  document.getElementById('resetPasswordTargetLabel').textContent = `Setting a new password for: ${username}`;
  document.getElementById('resetPasswordModalBackdrop').style.display = 'flex';
}

document.getElementById('cancelResetPasswordBtn').addEventListener('click', () => {
  document.getElementById('resetPasswordModalBackdrop').style.display = 'none';
});

document.getElementById('resetPasswordForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const userId = document.getElementById('rp_userId').value;
  const newPassword = document.getElementById('rp_newPassword').value;
  try {
    await apiRequest(`/auth/users/${userId}/reset-password`, 'PUT', { newPassword });
    document.getElementById('resetPasswordModalBackdrop').style.display = 'none';
    alert('Password reset. Let the staff member know their new password.');
  } catch (err) {
    alert(err.message);
  }
});

function openDeactivateUserModal(userId, username) {
  document.getElementById('du_userId').value = userId;
  document.getElementById('du_accessKey').value = '';
  document.getElementById('deleteUserTargetLabel').textContent = `Deactivating: ${username}. They won't be able to log in until reactivated. Their history stays intact.`;
  document.getElementById('deleteUserModalBackdrop').style.display = 'flex';
}

document.getElementById('cancelDeleteUserBtn').addEventListener('click', () => {
  document.getElementById('deleteUserModalBackdrop').style.display = 'none';
});

document.getElementById('deleteUserForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const userId = document.getElementById('du_userId').value;
  const accessKey = document.getElementById('du_accessKey').value;
  try {
    await apiRequest(`/auth/users/${userId}/deactivate`, 'PUT', { accessKey });
    document.getElementById('deleteUserModalBackdrop').style.display = 'none';
    loadUsers();
  } catch (err) {
    alert(err.message);
  }
});

async function reactivateUser(userId) {
  try {
    await apiRequest(`/auth/users/${userId}/reactivate`, 'PUT');
    loadUsers();
  } catch (err) {
    alert(err.message);
  }
}

// ===== Initial load =====
async function init() {
  await loadCategories();
  await loadSuppliers();
  await loadProducts();
  loadLowStock();
  loadHistory();
  loadRevenueSummary();
  loadLoginHistory();
  loadUsers();
}

init();
