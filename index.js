import express from "express";
import axios from "axios";
import cheerio from "cheerio";

const app = express();
const PORT = process.env.PORT || 5500;

// Middleware para parsear JSON (para futuros POST)
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
// Scraping por URL
// =====================
app.get("/scrape/url", async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: "Falta el parámetro 'url'" });
  }

  try {
    const { data: html } = await axios.get(url);
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
// Scraping por productId (AliExpress)
// =====================
app.get("/scrape/product", async (req, res) => {
  const { productId } = req.query;
  if (!productId) {
    return res.status(400).json({ error: "Falta el parámetro 'productId'" });
  }

  const url = `https://www.aliexpress.us/item/${productId}.html`;

  try {
    const { data: html } = await axios.get(url);
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
// Arrancar servidor
// =====================
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
