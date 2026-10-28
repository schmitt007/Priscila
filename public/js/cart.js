const cartDrawer = document.querySelector("#shopping-cart");
const cartBackdrop = document.querySelector(".cart-backdrop");
const cartItemsContainer = document.querySelector(".cart-items");
const cartEmpty = document.querySelector(".cart-empty");
const cartStatus = document.querySelector(".cart-status");
const cartCount = document.querySelector(".cart-count");
const cartTriggers = document.querySelectorAll(".cart-trigger");
const cartCloseButton = document.querySelector(".cart-close");
const checkoutButton = document.querySelector(".checkout-button");
const catalogGrid = document.querySelector("#product-grid");
const cartStorageKey = "priscila-modas-cart";
const whatsappNumber = "5515997302132";
const products = new Map();

function syncProductsMap() {
  const productCards = [...document.querySelectorAll(".product-card")];
  productCards.forEach((card) => {
    const button = card.querySelector(".add-to-cart");
    if (!button || !button.dataset.productId) return;

    const selectors = [...card.querySelectorAll(".product-size")].map((select) => ({
      label:
        select.dataset.sizeLabel ||
        select.closest("label").childNodes[0].textContent.trim(),
      options: [...select.options].map((option) => option.value).filter(Boolean),
    }));
    const variants = selectors.reduce(
      (combinations, selector) =>
        combinations.flatMap((combination) =>
          selector.options.map((value) => [...combination, { label: selector.label, value }])
        ),
      [[]]
    );

    products.set(button.dataset.productId, {
      id: button.dataset.productId,
      name: card.querySelector("h3").textContent.trim(),
      image: card.querySelector(".product-image img")?.getAttribute("src") || "",
      variants: variants.map((variant) =>
        variant.length === 1
          ? variant[0].value
          : variant.map(({ label, value }) => `${label}: ${value}`).join(" | ")
      ),
    });
  });
}

function renderProductCard(product) {
  const article = document.createElement("article");
  article.className = "product-card";

  const imageUrl = product.image || "/assets/produtos/look-vestido-midi-preto.png";
  const productSizes = Array.isArray(product.sizes) && product.sizes.length > 0 ? product.sizes : ["Único"];
  const sizeOptions = productSizes
    .map((size) => `<option value="${size}">${size}</option>`)
    .join("");

  article.innerHTML = `
    <a class="product-image product-image--centered" href="${imageUrl}" target="_blank" rel="noopener noreferrer" aria-label="Ampliar ${product.name}">
      <img src="${imageUrl}" alt="${product.name}" loading="lazy" />
      <span class="product-category">${product.category || "Produto"}</span>
    </a>
    <div class="product-info">
      <div><h3>${product.name}</h3><p>${product.description || "Produto disponível na Priscila Modas."}</p></div>
      <p class="product-price">Preço: <strong>${Number(product.price || 0) > 0 ? Number(product.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "A confirmar"}</strong></p>
      <label class="size-picker">Tamanho
        <select class="product-size" data-size-label="Tamanho" aria-label="Tamanho: ${product.name}">
          <option value="">Escolha o tamanho</option>
          ${sizeOptions}
        </select>
      </label>
      <button class="add-to-cart" type="button" data-product-id="${product.id}">Adicionar ao carrinho</button>
    </div>
  `;

  return article;
}

async function loadProducts() {
  if (!catalogGrid) return;

  try {
    const response = await fetch("/api/products", { headers: { Accept: "application/json" } });
    if (!response.ok) {
      throw new Error("Não foi possível carregar o catálogo.");
    }
    const data = await response.json();
    const productsList = Array.isArray(data.products) ? data.products : [];
    catalogGrid.replaceChildren(...productsList.map(renderProductCard));
    syncProductsMap();
    bindAddToCartButtons();
  } catch (error) {
    console.error("Falha ao carregar produtos:", error);
    catalogGrid.innerHTML = '<div class="empty-state">Não foi possível carregar os produtos no momento.</div>';
  }
}

let cart = [];
let lastCartTrigger = null;

function setCartStatus(message) {
  cartStatus.textContent = message;
}

function isValidCartItem(item) {
  if (!item || typeof item !== "object") return false;
  const product = products.get(item.id);
  return (
    product &&
    product.variants.includes(item.size) &&
    Number.isInteger(item.quantity) &&
    item.quantity > 0 &&
    item.quantity <= 99
  );
}

function loadCart() {
  try {
    const savedCart = localStorage.getItem(cartStorageKey);
    if (!savedCart) return [];

    const parsedCart = JSON.parse(savedCart);
    if (!Array.isArray(parsedCart)) {
      throw new Error("Os dados salvos do carrinho estão inválidos.");
    }

    const validItems = parsedCart.filter(isValidCartItem);
    if (validItems.length !== parsedCart.length) {
      setCartStatus("Alguns itens salvos foram removidos porque os tamanhos disponíveis foram atualizados.");
    }
    return validItems;
  } catch (error) {
    console.error("Não foi possível carregar o carrinho salvo:", error);
    setCartStatus("Não foi possível recuperar o carrinho salvo. Você pode montar o pedido novamente.");
    return [];
  }
}

function saveCart() {
  try {
    localStorage.setItem(cartStorageKey, JSON.stringify(cart));
  } catch (error) {
    console.error("Não foi possível salvar o carrinho:", error);
    setCartStatus("O navegador não conseguiu salvar o carrinho. Ele ficará disponível enquanto esta página estiver aberta.");
  }
}

function updateCartCount() {
  const count = cart.reduce((total, item) => total + item.quantity, 0);
  cartCount.textContent = String(count);
  cartTriggers.forEach((trigger) => {
    trigger.setAttribute(
      "aria-label",
      `Abrir carrinho, ${count} ${count === 1 ? "item" : "itens"}`
    );
  });
}

function createCartItemElement(item) {
  const product = products.get(item.id);
  const row = document.createElement("article");
  row.className = "cart-item";

  const image = document.createElement("img");
  image.src = product.image;
  image.alt = "";

  const details = document.createElement("div");
  details.className = "cart-item-details";
  const name = document.createElement("h3");
  name.textContent = product.name;
  const size = document.createElement("p");
  size.textContent = product.variants.length === 1 || item.size.includes(":")
    ? item.size
    : `Tamanho ${item.size}`;
  const price = document.createElement("p");
  price.className = "cart-item-price";
  price.textContent = "Preço a confirmar";
  details.append(name, size, price);

  const actions = document.createElement("div");
  actions.className = "cart-item-actions";
  const decrease = document.createElement("button");
  decrease.type = "button";
  decrease.className = "quantity-button";
  decrease.textContent = "−";
  decrease.setAttribute("aria-label", `Diminuir quantidade de ${product.name}`);
  decrease.dataset.action = "decrease";
  decrease.dataset.productId = item.id;
  decrease.dataset.size = item.size;
  const quantity = document.createElement("span");
  quantity.textContent = String(item.quantity);
  quantity.setAttribute("aria-label", `Quantidade: ${item.quantity}`);
  const increase = document.createElement("button");
  increase.type = "button";
  increase.className = "quantity-button";
  increase.textContent = "+";
  increase.setAttribute("aria-label", `Aumentar quantidade de ${product.name}`);
  increase.dataset.action = "increase";
  increase.dataset.productId = item.id;
  increase.dataset.size = item.size;
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "remove-item";
  remove.textContent = "Remover";
  remove.dataset.action = "remove";
  remove.dataset.productId = item.id;
  remove.dataset.size = item.size;
  actions.append(decrease, quantity, increase, remove);

  row.append(image, details, actions);
  return row;
}

function renderCart() {
  cartItemsContainer.replaceChildren(...cart.map(createCartItemElement));
  cartEmpty.hidden = cart.length > 0;
  cartItemsContainer.hidden = cart.length === 0;
  checkoutButton.disabled = cart.length === 0;
  updateCartCount();
}

function openCart(trigger) {
  lastCartTrigger = trigger;
  cartBackdrop.hidden = false;
  cartDrawer.hidden = false;
  document.body.classList.add("cart-open");
  cartCloseButton.focus();
}

function closeCart() {
  cartBackdrop.hidden = true;
  cartDrawer.hidden = true;
  document.body.classList.remove("cart-open");
  if (lastCartTrigger) lastCartTrigger.focus();
}

function persistAndRender() {
  saveCart();
  renderCart();
}

cart = loadCart();
renderCart();

if (catalogGrid) {
  loadProducts();
}

cartTriggers.forEach((trigger) => {
  trigger.addEventListener("click", () => openCart(trigger));
});

cartCloseButton.addEventListener("click", closeCart);
cartBackdrop.addEventListener("click", closeCart);

document.addEventListener("keydown", (event) => {
  if (cartDrawer.hidden) return;

  if (event.key === "Escape") {
    closeCart();
    return;
  }

  if (event.key === "Tab") {
    const focusableElements = cartDrawer.querySelectorAll(
      'button:not(:disabled), select:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }
});

function bindAddToCartButtons() {
  document.querySelectorAll(".add-to-cart").forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest(".product-card");
      const sizeSelects = [...card.querySelectorAll(".product-size")];
      const emptySelect = sizeSelects.find((select) => !select.value);

      if (emptySelect) {
        emptySelect.setCustomValidity("Escolha um tamanho para cada peça.");
        emptySelect.reportValidity();
        emptySelect.addEventListener("change", () => emptySelect.setCustomValidity(""), { once: true });
        return;
      }

      const selections = sizeSelects.map((select) => ({
        label:
          select.dataset.sizeLabel ||
          select.closest("label").childNodes[0].textContent.trim(),
        value: select.value,
      }));
      const size =
        selections.length === 1
          ? selections[0].value
          : selections.map(({ label, value }) => `${label}: ${value}`).join(" | ");
      const existingItem = cart.find(
        (item) => item.id === button.dataset.productId && item.size === size
      );
      if (existingItem) {
        if (existingItem.quantity === 99) {
          setCartStatus("O limite por produto é 99 unidades.");
          return;
        }
        existingItem.quantity += 1;
      } else {
        cart.push({ id: button.dataset.productId, size, quantity: 1 });
      }

      setCartStatus(`${products.get(button.dataset.productId)?.name || "Produto"} adicionado ao carrinho.`);
      persistAndRender();
      openCart(button);
    });
  });
}

bindAddToCartButtons();

cartItemsContainer.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const { action, productId, size } = button.dataset;
  const item = cart.find((cartItem) => cartItem.id === productId && cartItem.size === size);
  if (!item) {
    setCartStatus("Este item não está mais no carrinho. Atualize a página e tente novamente.");
    return;
  }

  if (action === "increase") {
    if (item.quantity === 99) {
      setCartStatus("O limite por produto é 99 unidades.");
      return;
    }
    item.quantity += 1;
  } else if (action === "decrease" && item.quantity > 1) {
    item.quantity -= 1;
  } else if (action === "remove" || (action === "decrease" && item.quantity === 1)) {
    cart = cart.filter((cartItem) => cartItem !== item);
  }

  setCartStatus("");
  persistAndRender();
});

checkoutButton.addEventListener("click", async () => {
  if (cart.length === 0) return;

  const orderPayload = {
    customer: "Cliente do site",
    items: cart.map((item) => ({
      id: item.id,
      size: item.size,
      quantity: item.quantity,
    })),
  };

  try {
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Não foi possível registrar o pedido.");
    }

    const orderLines = cart.map((item) => {
      const product = products.get(item.id);
      return `- ${product?.name || "Produto"} | Tamanho ${item.size} | Quantidade: ${item.quantity} | Preço a confirmar`;
    });

    const message = [
      "Olá! Quero consultar e fazer este pedido pela Priscila Modas:",
      "",
      ...orderLines,
      "",
      `Pedido registrado no painel: ${payload.order?.id || "PED-NEW"}`,
      "",
      "Pode confirmar os preços, a disponibilidade dos tamanhos e o valor total?",
    ].join("\n");

    cart = [];
    persistAndRender();
    setCartStatus("Pedido registrado no painel administrativo.");
    const checkoutUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(checkoutUrl, "_blank", "noopener,noreferrer");
  } catch (error) {
    setCartStatus(error.message || "Não foi possível registrar este pedido.");
  }
});
