import express from "express";
import puppeteer from "puppeteer";

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Servidor de AliExpress Reviews Scraper funcionando");
});

app.get("/ae/product-meta", async (req, res) => {
  const { productId } = req.query;
  if (!productId) return res.status(400).json({ error: "Falta productId" });

  const url = `https://www.aliexpress.us/item/${productId}.html`;

  let browser;
  try {
    browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: true,
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36"
    );

    await page.goto(url, { waitUntil: "networkidle2" });

    // Extraemos datos
    const data = await page.evaluate(() => {
      const ratingEl = document.querySelector('a[class*="reviewer--rating"] strong');
      const reviewsEl = document.querySelector('a[class*="reviewer--reviews"]');
      const soldEl = document.querySelector('span[class*="reviewer--sold"]');
    
      const rating = ratingEl ? parseFloat(ratingEl.textContent.trim()) : 0;
      const reviews = reviewsEl ? parseInt(reviewsEl.textContent.replace(/\D/g, "")) : 0;
      const soldText = soldEl ? soldEl.textContent.replace(/[,+]/g, "") : "0";
      const sold = parseInt(soldText.match(/\d+/)?.[0] || "0");
    
      return { rating, reviews, sold };
    });

    res.json({ product_id: productId, ...data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al scrapear AliExpress", details: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server corriendo en puerto ${PORT}`));
