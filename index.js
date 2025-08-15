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
// Función para extraer datos
// =====================
function extractProductData(html) {
  const $ = cheerio.load(html);

  const title =
    $("h1.product-title-text").text().trim() ||
    $("title").text().trim();

  const price =
    $("div.product-price-current span").first().text().trim() ||
    $("span.uniform-banner-box-price").text().trim();

  return { title, price };
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
  if (!url) {
    return res.status(400).json({ error: "Falta el parámetro 'url'" });
  }

  try {
    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    const productData = extractProductData(html);

    res.json({
      success: true,
      data: productData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// =====================
// Scraping por productId
// =====================
app.get("/scrape/product", async (req, res) => {
  const { productId } = req.query;
  if (!productId) {
    return res.status(400).json({ error: "Falta el parámetro 'productId'" });
  }

  const url = `https://www.aliexpress.us/item/${productId}.html`;

  try {
    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    const productData = extractProductData(html);

    res.json({
      success: true,
      data: productData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
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
  console.log("==============================\n");
});
