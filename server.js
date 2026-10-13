const { createServer } = require("node:http");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

const publicDirectory = path.join(__dirname, "public");
const allowedFiles = new Map([
  ["/", "index.html"],
  ["/index.html", "index.html"],
  ["/css/styles.css", "css/styles.css"],
  ["/js/navigation.js", "js/navigation.js"],
  ["/js/cart.js", "js/cart.js"],
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
