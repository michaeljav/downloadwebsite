const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

/**
 * URL inicial del sitio.
 * No usar el nombre "URL" porque choca con la clase nativa URL de JavaScript.
 */
const START_URL = "https://downstreamcasinoresortportal.tpiwebservices.com/";

/**
 * Carpeta donde se guardará todo.
 */
const OUTPUT_DIR = path.join(__dirname, "site");

/**
 * Perfil persistente de Chrome.
 * Esto guarda cookies/sesión para que no tengas que loguearte cada vez.
 */
const CHROME_PROFILE_DIR = path.join(__dirname, "chrome-profile");

/**
 * Convierte una URL en una ruta local segura.
 * El query string no se usa en el nombre del archivo.
 * Ejemplo: /ClientPortalAssets/dsc/style.css?13 se guarda como style.css.
 */
function getFilePath(resourceUrl) {
  const parsedUrl = new URL(resourceUrl);

  let pathname = decodeURIComponent(parsedUrl.pathname);

  if (pathname === "/" || pathname === "") {
    pathname = "/index.html";
  }

  if (pathname.endsWith("/")) {
    pathname += "index.html";
  }

  // Limpia caracteres inválidos en Windows
  pathname = pathname.replace(/[<>:"|?*]/g, "_");

  return path.join(OUTPUT_DIR, parsedUrl.hostname, pathname);
}

/**
 * Espera hasta que presiones ENTER en la terminal.
 */
function waitForEnter() {
  return new Promise((resolve) => {
    process.stdin.resume();
    process.stdin.once("data", resolve);
  });
}

/**
 * Obtiene las URLs de imagen que quedaron referenciadas en el HTML final.
 * Esto ayuda con imagenes lazy-load que no llegaron a descargarse mientras navegabas.
 */
function getImageUrlsFromHtml(html, baseUrl) {
  const urls = new Set();
  const imgTags = html.match(/<img\b[^>]*>/gi) || [];

  for (const tag of imgTags) {
    const srcMatch = tag.match(/\bsrc=["']([^"']+)["']/i);

    if (srcMatch) {
      urls.add(new URL(srcMatch[1], baseUrl).href);
    }

    const srcsetMatch = tag.match(/\bsrcset=["']([^"']+)["']/i);

    if (srcsetMatch) {
      for (const item of srcsetMatch[1].split(",")) {
        const srcsetUrl = item.trim().split(/\s+/)[0];

        if (srcsetUrl) {
          urls.add(new URL(srcsetUrl, baseUrl).href);
        }
      }
    }
  }

  return [...urls].filter((url) => url.startsWith("http"));
}

/**
 * Guarda una respuesta de red en disco.
 */
async function saveResponse(response) {
  try {
    const resourceUrl = response.url();

    if (!resourceUrl.startsWith("http")) return;

    const request = response.request();

    // Guardamos solo GET porque POST normalmente son APIs/login/formularios
    if (request.method() !== "GET") return;

    const status = response.status();

    if (status < 200 || status >= 300) return;

    const filePath = getFilePath(resourceUrl);

    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    const buffer = await response.buffer();
    fs.writeFileSync(filePath, buffer);

    console.log("✔ Saved:", resourceUrl);
  } catch (error) {
    console.log("Skip:", response.url(), "-", error.message);
  }
}

/**
 * Descarga imagenes que estan en el HTML final pero no fueron capturadas antes.
 */
async function downloadMissingImages(browser, html, baseUrl) {
  const imageUrls = getImageUrlsFromHtml(html, baseUrl);

  if (imageUrls.length === 0) return;

  const assetPage = await browser.newPage();
  assetPage.on("response", saveResponse);

  for (const imageUrl of imageUrls) {
    const filePath = getFilePath(imageUrl);

    if (fs.existsSync(filePath)) continue;

    try {
      await assetPage.goto(imageUrl, {
        waitUntil: "networkidle2",
        timeout: 60000,
      });
    } catch (error) {
      console.log("Skip image:", imageUrl, "-", error.message);
    }
  }

  await assetPage.close();
}

(async () => {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    userDataDir: CHROME_PROFILE_DIR,
  });

  const page = await browser.newPage();

  /**
   * Captura todo lo que Chrome descargue:
   * CSS, JS, imágenes, fuentes, archivos de Blazor, etc.
   */
  page.on("response", saveResponse);

  console.log("Opening site...");

  await page.goto(START_URL, {
    waitUntil: "networkidle2",
    timeout: 120000,
  });

  console.log("");
  console.log("1. Si aparece login, haz login manualmente.");
  console.log("2. Navega al dashboard o menú que quieres descargar.");
  console.log("3. Cuando estés en la página correcta, vuelve aquí.");
  console.log("4. Presiona ENTER para guardar el HTML final.");
  console.log("");

  await waitForEnter();

  /**
   * Importante:
   * NO recargamos la página aquí.
   * Así guarda exactamente la página donde tú estás parado.
   */
  console.log("Waiting a few seconds for late resources...");

  await new Promise((resolve) => setTimeout(resolve, 8000));

  const currentPageUrl = page.url();
  const currentHost = new URL(currentPageUrl).hostname;

  /**
   * Guarda el HTML renderizado actual.
   */
  const html = await page.content();

  const indexPath = path.join(OUTPUT_DIR, currentHost, "index.html");

  fs.mkdirSync(path.dirname(indexPath), { recursive: true });
  fs.writeFileSync(indexPath, html, "utf8");

  console.log("✔ HTML saved:", indexPath);

  console.log("Checking referenced images...");

  await downloadMissingImages(browser, html, currentPageUrl);

  await browser.close();

  console.log("");
  console.log("✅ DONE");
  console.log("Files saved in:", OUTPUT_DIR);
})();
