const loginScreen = document.querySelector("#login-screen");
const adminScreen = document.querySelector("#admin-screen");
const loginForm = document.querySelector("#login-form");
const loginError = document.querySelector("#login-error");
const userPill = document.querySelector("#user-pill");
const productForm = document.querySelector("#product-form");
const productMessage = document.querySelector("#product-message");
const productList = document.querySelector("#product-list");
const ordersList = document.querySelector("#orders-list");
const productsSummary = document.querySelector("#products-summary");
const orderTable = document.querySelector("#order-table");
const navButtons = document.querySelectorAll(".nav-button");
const adminViews = document.querySelectorAll(".admin-view");
const dashboardTitle = document.querySelector("#dashboard-title");
const productIdField = productForm?.querySelector('input[name="productId"]');
const submitButton = productForm?.querySelector('button[type="submit"]');
const orderStatusOptions = ["Pendente", "Em produção", "Concluído", "Cancelado"];

const state = {
  user: null,
  products: [],
  orders: [],
  currentView: "dashboard",
};

function setMessage(element, message, type = "") {
  element.textContent = message;
  element.className = `form-message ${type}`.trim();
}

function resetProductForm() {
  productForm.reset();
  if (productIdField) productIdField.value = "";
  if (submitButton) submitButton.textContent = "Salvar produto";
}

function populateProductForm(product) {
  if (!product) return;
  if (productIdField) productIdField.value = product.id;
  if (submitButton) submitButton.textContent = "Atualizar produto";

  const formData = new FormData(productForm);
  formData.set("name", product.name || "");
  formData.set("category", product.category || "Geral");
  formData.set("price", Number(product.price || 0));
  formData.set("image", product.image || "");
  formData.set("description", product.description || "");
  formData.set("featured", product.featured ? "on" : "");
  formData.set("active", product.active === false ? "" : "on");
  formData.set("sizes", Array.isArray(product.sizes) ? product.sizes.join(", ") : "");

  productForm.querySelector('[name="name"]').value = product.name || "";
  productForm.querySelector('[name="category"]').value = product.category || "Geral";
  productForm.querySelector('[name="price"]').value = Number(product.price || 0);
  productForm.querySelector('[name="image"]').value = product.image || "";
  productForm.querySelector('[name="description"]').value = product.description || "";
  productForm.querySelector('[name="featured"]').checked = Boolean(product.featured);
  productForm.querySelector('[name="active"]').checked = product.active !== false;
  productForm.querySelector('[name="sizes"]').value = Array.isArray(product.sizes) ? product.sizes.join(", ") : "";

  showView("products");
  productForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function showView(viewName) {
  state.currentView = viewName;
  dashboardTitle.textContent = viewName === "dashboard" ? "Dashboard" : viewName === "products" ? "Produtos" : "Pedidos";

  navButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewName);
  });

  adminViews.forEach((view) => {
    const shouldShow = view.id === `view-${viewName}`;
    view.hidden = !shouldShow;
    view.classList.toggle("active", shouldShow);
  });
}

function renderProducts({ products, summaryTarget = productList }) {
  if (!Array.isArray(products) || products.length === 0) {
    summaryTarget.innerHTML = '<div class="empty-state">Nenhum produto encontrado.</div>';
    return;
  }

  const rows = products
    .map((product) => {
      const status = product.active === false ? "Inativo" : "Ativo";
      const price = Number(product.price || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });

      return `
        <div class="list-row">
          <div class="product-meta">
            <strong>${product.name}</strong>
            <small>${product.category} · ${product.sizes?.length ? product.sizes.join(", ") : "Sem tamanhos"}</small>
            <small>${price}</small>
          </div>
          <div class="product-actions">
            <span class="status-pill">${status}</span>
            <button type="button" class="action-button edit" data-edit-product="${product.id}">Editar</button>
            <button type="button" class="action-button delete" data-delete-product="${product.id}">Excluir</button>
          </div>
        </div>
      `;
    })
    .join("");

  summaryTarget.innerHTML = rows;
}

function renderOrders(orders) {
  if (!Array.isArray(orders) || orders.length === 0) {
    ordersList.innerHTML = '<div class="empty-state">Nenhum pedido registrado.</div>';
    orderTable.innerHTML = '<div class="empty-state">Nenhum pedido registrado.</div>';
    return;
  }

  const renderOption = (status) => `
    <option value="${status}" ${status === order.status ? "selected" : ""}>${status}</option>
  `;

  ordersList.innerHTML = orders
    .slice(0, 4)
    .map((order) => `
      <div class="list-row">
        <div>
          <strong>${order.id}</strong>
          <small>${order.customer}</small>
        </div>
        <select class="order-status-select" data-order-id="${order.id}" aria-label="Status do pedido ${order.id}">
          ${orderStatusOptions.map((status) => `<option value="${status}" ${status === order.status ? "selected" : ""}>${status}</option>`).join("")}
        </select>
      </div>
    `)
    .join("");

  orderTable.innerHTML = orders
    .map((order) => `
      <div class="list-row">
        <div>
          <strong>${order.id}</strong>
          <small>${order.customer}</small>
        </div>
        <div>
          <small>${order.items} itens</small>
          <small>${order.total}</small>
        </div>
        <select class="order-status-select" data-order-id="${order.id}" aria-label="Status do pedido ${order.id}">
          ${orderStatusOptions.map((status) => `<option value="${status}" ${status === order.status ? "selected" : ""}>${status}</option>`).join("")}
        </select>
      </div>
    `)
    .join("");
}

function renderSummary(data) {
  const summary = data?.summary || {};
  const products = data?.products || [];
  const orders = data?.orders || [];

  document.querySelector("#stat-total-products").textContent = String(summary.totalProducts ?? products.length ?? 0);
  document.querySelector("#stat-active-products").textContent = String(summary.activeProducts ?? 0);
  document.querySelector("#stat-total-orders").textContent = String(summary.totalOrders ?? orders.length ?? 0);
  document.querySelector("#stat-pending-orders").textContent = String(summary.pendingOrders ?? 0);

  renderProducts({ products: products.slice(0, 5), summaryTarget: productsSummary });
  renderOrders(orders);
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    const message = payload?.error || "Erro inesperado.";
    throw new Error(message);
  }

  return payload;
}

async function loadDashboard() {
  const data = await fetchJson("/api/admin/dashboard");
  state.products = Array.isArray(data.products) ? data.products : [];
  state.orders = Array.isArray(data.orders) ? data.orders : [];
  renderProducts({ products: state.products, summaryTarget: productList });
  renderSummary(data);
}

async function login(username, password) {
  const result = await fetchJson("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  state.user = result.user;
  userPill.textContent = state.user;
  loginScreen.classList.remove("active");
  loginScreen.hidden = true;
  adminScreen.hidden = false;
  showView("dashboard");
  await loadDashboard();
}

async function checkSession() {
  try {
    const result = await fetchJson("/api/admin/session");
    if (!result.authenticated) {
      loginScreen.hidden = false;
      loginScreen.classList.add("active");
      adminScreen.hidden = true;
      return;
    }

    state.user = result.user;
    userPill.textContent = state.user;
    loginScreen.hidden = true;
    loginScreen.classList.remove("active");
    adminScreen.hidden = false;
    showView("dashboard");
    await loadDashboard();
  } catch {
    loginScreen.hidden = false;
    loginScreen.classList.add("active");
    adminScreen.hidden = true;
  }
}

async function logout() {
  await fetchJson("/api/admin/logout", { method: "POST" });
  state.user = null;
  loginError.textContent = "";
  loginScreen.hidden = false;
  loginScreen.classList.add("active");
  adminScreen.hidden = true;
  resetProductForm();
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");

  try {
    loginError.textContent = "";
    await login(username, password);
  } catch (error) {
    loginError.textContent = error.message;
    loginError.classList.add("error");
  }
});

navButtons.forEach((button) => {
  button.addEventListener("click", () => showView(button.dataset.view));
});

productForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(productForm);
  const productId = String(formData.get("productId") || "").trim();
  const payload = {
    name: String(formData.get("name") || "").trim(),
    category: String(formData.get("category") || "Geral").trim(),
    price: Number(formData.get("price") || 0),
    image: String(formData.get("image") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    featured: Boolean(formData.get("featured")),
    active: formData.get("active") !== null,
    sizes: String(formData.get("sizes") || "")
      .split(",")
      .map((size) => size.trim())
      .filter(Boolean),
  };

  try {
    let result;
    if (productId) {
      result = await fetchJson(`/api/admin/products/${encodeURIComponent(productId)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setMessage(productMessage, `Produto “${result.product.name}” atualizado com sucesso.`, "success");
    } else {
      result = await fetchJson("/api/admin/products", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setMessage(productMessage, `Produto “${result.product.name}” salvo com sucesso.`, "success");
    }

    resetProductForm();
    await loadDashboard();
  } catch (error) {
    setMessage(productMessage, error.message, "error");
  }
});

productList.addEventListener("click", async (event) => {
  const editButton = event.target.closest("[data-edit-product]");
  if (editButton) {
    const productId = editButton.dataset.editProduct;
    const product = state.products.find((entry) => String(entry.id) === String(productId));
    populateProductForm(product);
    return;
  }

  const deleteButton = event.target.closest("[data-delete-product]");
  if (!deleteButton) return;

  const productId = deleteButton.dataset.deleteProduct;
  if (!productId) return;

  try {
    await fetchJson(`/api/admin/products/${encodeURIComponent(productId)}`, {
      method: "DELETE",
    });
    resetProductForm();
    await loadDashboard();
  } catch (error) {
    setMessage(productMessage, error.message, "error");
  }
});

document.addEventListener("change", async (event) => {
  const select = event.target.closest(".order-status-select");
  if (!select) return;

  const { orderId } = select.dataset;
  const status = select.value;
  if (!orderId || !status) return;

  try {
    await fetchJson(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
    await loadDashboard();
  } catch (error) {
    setMessage(productMessage, error.message, "error");
  }
});

document.querySelector("#logout-button").addEventListener("click", logout);

checkSession();
