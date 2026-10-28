const { createServer } = require("node:http");
const { readFile, writeFile, mkdir } = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const publicDirectory = path.join(__dirname, "public");
const dataDirectory = path.join(__dirname, "data");
const storeFilePath = path.join(dataDirectory, "store.json");
const adminUsername = process.env.ADMIN_USERNAME || "adm";
const adminPassword = process.env.ADMIN_PASSWORD || "priscila123";
const adminSessions = new Map();

const defaultStore = {
  products: [
    {
      id: "blusa-azul-shorts-jeans",
      name: "Bata modal + short jeans",
      category: "Casual",
      price: 0,
      sizes: ["Único", "36", "38", "40", "42", "44"],
      image: "/assets/produtos/look-blusa-azul-shorts-jeans.png",
      featured: true,
      active: true,
      description: "Bata tamanho único e short jeans em vários tamanhos.",
      createdAt: new Date().toISOString(),
    },
    {
      id: "conjunto-vinho",
      name: "Conjunto pantalona vinho",
      category: "Conjunto",
      price: 0,
      sizes: ["Único"],
      image: "/assets/produtos/look-conjunto-vinho.png",
      featured: true,
      active: true,
      description: "Conjunto elegante e sofisticado para ocasiões especiais.",
      createdAt: new Date().toISOString(),
    },
  ],
  orders: [
    {
      id: "PED-1001",
      customer: "Marina S.",
      status: "Pendente",
      total: "A confirmar",
      items: 2,
      createdAt: "2026-10-20T15:20:00.000Z",
    },
    {
      id: "PED-1002",
      customer: "Ana L.",
      status: "Em produção",
      total: "A confirmar",
      items: 1,
      createdAt: "2026-10-25T10:00:00.000Z",
    },
  ],
};

const allowedFiles = new Map([
  ["/", "index.html"],
  ["/index.html", "index.html"],
  ["/css/styles.css", "css/styles.css"],
  ["/js/navigation.js", "js/navigation.js"],
  ["/js/cart.js", "js/cart.js"],
  ["/admin", "admin/index.html"],
  ["/admin/", "admin/index.html"],
  ["/admin/index.html", "admin/index.html"],
  ["/admin/styles.css", "admin/styles.css"],
  ["/admin/app.js", "admin/app.js"],
  ["/assets/logo-priscila-modas.png", "assets/logo-priscila-modas.png"],
  ["/assets/produtos/look-blusa-azul-shorts-jeans.png", "assets/produtos/look-blusa-azul-shorts-jeans.png"],
  ["/assets/produtos/look-conjunto-vinho.png", "assets/produtos/look-conjunto-vinho.png"],
  ["/assets/produtos/look-macaquinho-azul.png", "assets/produtos/look-macaquinho-azul.png"],
  ["/assets/produtos/look-vestido-longo-floral.png", "assets/produtos/look-vestido-longo-floral.png"],
  ["/assets/produtos/look-blusa-azul-calca-vinho.png", "assets/produtos/look-blusa-azul-calca-vinho.png"],
  ["/assets/produtos/look-vestido-midi-preto.png", "assets/produtos/look-vestido-midi-preto.png"],
]);

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".png", "image/png"],
]);

async function ensureStoreFile() {
  await mkdir(dataDirectory, { recursive: true });

  try {
    await readFile(storeFilePath, "utf8");
  } catch {
    await writeFile(storeFilePath, `${JSON.stringify(defaultStore, null, 2)}\n`, "utf8");
  }
}

async function readStoreFile() {
  await ensureStoreFile();
  const raw = await readFile(storeFilePath, "utf8");
  return JSON.parse(raw);
}

async function writeStoreFile(store) {
  await ensureStoreFile();
  await writeFile(storeFilePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function setSecurityHeaders(response) {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' https://images.unsplash.com; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self'; base-uri 'self'; frame-ancestors 'none'"
  );
}

function sendText(response, statusCode, message, contentType = "text/plain; charset=utf-8") {
  response.writeHead(statusCode, { "Content-Type": contentType });
  response.end(message);
}

function sendJson(response, statusCode, payload, extraHeaders = {}) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    ...extraHeaders,
  });
  response.end(JSON.stringify(payload));
}

function getSessionIdFromCookie(request) {
  const cookieHeader = request.headers.cookie || "";
  const match = cookieHeader.split(";").find((entry) => entry.trim().startsWith("admin_session="));
  return match ? decodeURIComponent(match.trim().slice("admin_session=".length)) : null;
}

function getSessionUser(request) {
  const sessionId = getSessionIdFromCookie(request);
  if (!sessionId) return null;
  const session = adminSessions.get(sessionId);
  return session ? session.user : null;
}

function serializeProduct(product) {
  return {
    id: String(product.id || crypto.randomUUID()),
    name: String(product.name || "Produto sem nome"),
    category: String(product.category || "Geral"),
    price: Number(product.price || 0),
    sizes: Array.isArray(product.sizes) ? product.sizes.map((size) => String(size)) : [],
    image: String(product.image || ""),
    description: String(product.description || ""),
    featured: Boolean(product.featured),
    active: product.active !== false,
    createdAt: product.createdAt || new Date().toISOString(),
  };
}

async function handleAdminApi(request, response, pathname) {
  if (pathname === "/api/admin/login") {
    if (request.method !== "POST") {
      response.setHeader("Allow", "POST");
      sendJson(response, 405, { error: "Método não permitido." });
      return;
    }

    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        const username = String(payload.username || "");
        const password = String(payload.password || "");

        if (username !== adminUsername || password !== adminPassword) {
          sendJson(response, 401, { error: "Credenciais inválidas." });
          return;
        }

        const sessionId = crypto.randomBytes(24).toString("hex");
        adminSessions.set(sessionId, { user: username, createdAt: Date.now() });
        response.setHeader(
          "Set-Cookie",
          `admin_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`
        );
        sendJson(response, 200, { ok: true, user: username });
      } catch {
        sendJson(response, 400, { error: "Corpo da requisição inválido." });
      }
    });
    return;
  }

  if (pathname === "/api/admin/logout") {
    const sessionId = getSessionIdFromCookie(request);
    if (sessionId) adminSessions.delete(sessionId);
    response.setHeader(
      "Set-Cookie",
      "admin_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
    );
    sendJson(response, 200, { ok: true });
    return;
  }

  if (pathname === "/api/admin/session") {
    const user = getSessionUser(request);
    sendJson(response, 200, { authenticated: Boolean(user), user: user || null });
    return;
  }

  const isAuthenticated = Boolean(getSessionUser(request));
  if (!isAuthenticated && pathname.startsWith("/api/admin/")) {
    sendJson(response, 401, { error: "Sessão de administrador inválida ou expirada." });
    return;
  }

  if (pathname === "/api/admin/dashboard") {
    const store = await readStoreFile();
    const products = Array.isArray(store.products) ? store.products : [];
    const orders = Array.isArray(store.orders) ? store.orders : [];
    const activeProducts = products.filter((product) => product.active !== false).length;
    const summary = {
      totalProducts: products.length,
      activeProducts,
      totalOrders: orders.length,
      pendingOrders: orders.filter((order) => String(order.status).toLowerCase().includes("pendente")).length,
      totalRevenue: "A confirmar",
    };
    sendJson(response, 200, { summary, products, orders });
    return;
  }

  if (pathname === "/api/admin/products") {
    const store = await readStoreFile();
    if (request.method === "GET") {
      sendJson(response, 200, { products: Array.isArray(store.products) ? store.products : [] });
      return;
    }

    if (request.method !== "POST") {
      response.setHeader("Allow", "GET, POST");
      sendJson(response, 405, { error: "Método não permitido." });
      return;
    }

    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", async () => {
      try {
        const payload = JSON.parse(body || "{}");
        const nextProduct = serializeProduct({
          ...payload,
          id: payload.id || crypto.randomUUID(),
          createdAt: payload.createdAt || new Date().toISOString(),
        });

        const products = Array.isArray(store.products) ? store.products : [];
        products.push(nextProduct);
        store.products = products;
        await writeStoreFile(store);
        sendJson(response, 201, { product: nextProduct });
      } catch {
        sendJson(response, 400, { error: "Dados do produto inválidos." });
      }
    });
    return;
  }

  const productMatch = pathname.match(/^\/api\/admin\/products\/([^/]+)$/);
  if (productMatch) {
    const productId = decodeURIComponent(productMatch[1]);
    const store = await readStoreFile();
    const products = Array.isArray(store.products) ? store.products : [];
    const productIndex = products.findIndex((product) => String(product.id) === String(productId));

    if (request.method === "PUT") {
      let body = "";
      request.on("data", (chunk) => {
        body += chunk;
      });
      request.on("end", async () => {
        try {
          const payload = JSON.parse(body || "{}");
          if (productIndex === -1) {
            sendJson(response, 404, { error: "Produto não encontrado." });
            return;
          }

          products[productIndex] = serializeProduct({
            ...products[productIndex],
            ...payload,
            id: String(productId),
            createdAt: products[productIndex].createdAt || new Date().toISOString(),
          });
          store.products = products;
          await writeStoreFile(store);
          sendJson(response, 200, { product: products[productIndex] });
        } catch {
          sendJson(response, 400, { error: "Dados do produto inválidos." });
        }
      });
      return;
    }

    if (request.method === "DELETE") {
      if (productIndex === -1) {
        sendJson(response, 404, { error: "Produto não encontrado." });
        return;
      }

      const [removedProduct] = products.splice(productIndex, 1);
      store.products = products;
      await writeStoreFile(store);
      sendJson(response, 200, { deleted: true, product: removedProduct });
      return;
    }

    response.setHeader("Allow", "PUT, DELETE");
    sendJson(response, 405, { error: "Método não permitido." });
    return;
  }

  sendJson(response, 404, { error: "Endpoint do painel não encontrado." });
}

const server = createServer(async (request, response) => {
  setSecurityHeaders(response);

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  } catch {
    sendText(response, 400, "Requisição inválida.");
    return;
  }

  if (pathname === "/api/health") {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.setHeader("Allow", "GET, HEAD");
      sendText(response, 405, "Método não permitido.");
      return;
    }

    response.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end(request.method === "HEAD" ? undefined : JSON.stringify({ status: "ok" }));
    return;
  }

  if (pathname.startsWith("/api/admin/")) {
    await handleAdminApi(request, response, pathname);
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.setHeader("Allow", "GET, HEAD");
    sendText(response, 405, "Método não permitido.");
    return;
  }

  const relativePath = allowedFiles.get(pathname);
  if (!relativePath) {
    sendText(response, 404, "Página não encontrada.");
    return;
  }

  try {
    const filePath = path.join(publicDirectory, relativePath);
    const file = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": contentTypes.get(path.extname(filePath)),
      "Cache-Control": /\.(?:html|css|js)$/i.test(relativePath) ? "no-cache" : "public, max-age=3600",
      "Content-Length": file.length,
    });
    response.end(request.method === "HEAD" ? undefined : file);
  } catch (error) {
    console.error(`Falha ao carregar ${relativePath}:`, error);
    sendText(response, 500, "Não foi possível carregar esta página.");
  }
});

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || "0.0.0.0";

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error("A variável PORT precisa ser um número entre 1 e 65535.");
    process.exitCode = 1;
  } else {
    server.listen(port, host, () => {
      const address = server.address();
      const localHost = host === "0.0.0.0" ? "localhost" : host;
      console.log(`Priscila Modas disponível em http://${localHost}:${address.port}`);
      console.log(`Verificação do servidor: http://${localHost}:${address.port}/api/health`);
    });
    server.on("error", (error) => {
      console.error("Não foi possível iniciar o servidor:", error);
      process.exitCode = 1;
    });
  }
}

module.exports = { server };
