import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import cheerio from "cheerio";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para parsear JSON
app.use(express.json());

// =====================
// Función para extraer datos del HTML
// =====================
function extractProductData(html) {
  const $ = cheerio.load(html);

  const title =
    $("h1.product-title-text").text().trim() ||
    $("title").text().trim();

  const price =
    $("div.product-price-current span").first().text().trim() ||
    $("span.uniform-banner-box-price").text().trim();

  const ratingText = $('span.product-review-average').first().text().trim();
  const reviewsText = $('a.product-reviewer-reviews').first().text().trim();

  let rating = 0, reviews = 0;
  if (ratingText) rating = parseFloat(ratingText);
  if (reviewsText) {
    const match = reviewsText.match(/\d+/);
    if (match) reviews = parseInt(match[0]);
  }

  return { title, price, rating, reviews };
}

// =====================
// Endpoint raíz
// =====================
app.get("/", (req, res) => {
  res.send("Servidor de AliExpress HTML Scraper funcionando");
});

// =====================
// Scraping por URL
// =====================
app.get("/scrape/url", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Falta parámetro 'url'" });
  if (!url.includes("aliexpress")) return res.status(400).json({ error: "URL debe ser de AliExpress" });

  try {
    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    const productData = extractProductData(html);
    res.json({ success: true, data: productData, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString() });
  }
});

// =====================
// Scraping por productId
// =====================
app.get("/scrape/product", async (req, res) => {
  const { productId } = req.query;
  if (!productId) return res.status(400).json({ error: "Falta parámetro 'productId'" });

  const url = `https://www.aliexpress.us/item/${productId}.html`;

  try {
    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    const productData = extractProductData(html);
    res.json({ success: true, data: productData, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString() });
  }
});

// =====================
// Scraping HTML directamente
// =====================
app.post("/scrape/html", (req, res) => {
  const { html } = req.body;
  if (!html) return res.status(400).json({ error: "Falta 'html' en body" });

  try {
    const data = extractProductData(html);
    res.json({ success: true, data, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString() });
  }
});

// =====================
// Scraping en lote
// =====================
app.post("/scrape/batch", async (req, res) => {
  const { urls } = req.body;
  if (!urls || !Array.isArray(urls)) return res.status(400).json({ error: "Se requiere un array de 'urls'" });
  if (urls.length > 10) return res.status(400).json({ error: "Máximo 10 URLs por batch" });

  const results = [];
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      const { data: html } = await axios.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });

      const productData = extractProductData(html);
      results.push({ index: i, url, success: true, data: productData, timestamp: new Date().toISOString() });
      if (i < urls.length - 1) await new Promise(r => setTimeout(r, 2000)); // delay
    } catch (error) {
      results.push({ index: i, url, success: false, error: error.message, timestamp: new Date().toISOString() });
    }
  }

  res.json({
    batch_summary: { total_urls: urls.length, successful: results.filter(r => r.success).length, failed: results.filter(r => !r.success).length },
    results,
    timestamp: new Date().toISOString()
  });
});

// =====================
// Iniciar servidor
// =====================
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log("\n=== ENDPOINTS DISPONIBLES ===");
  console.log("GET  /                     - Status del servidor");
  console.log("GET  /scrape/url?url=...   - Scraping por URL completa");
  console.log("GET  /scrape/product?productId=... - Scraping por Product ID");
  console.log("POST /scrape/html          - Procesar HTML directamente");
  console.log("POST /scrape/batch         - Scraping en lote");
  console.log("==============================\n");
});
