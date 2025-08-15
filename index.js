import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Servidor de AliExpress Reviews Scraper funcionando");
});

app.get("/ae/product-meta", async (req, res) => {
  const { productId } = req.query;
  if (!productId) return res.status(400).json({ error: "Falta productId" });

  try {
    const url = `https://www.aliexpress.us/item/${productId}.html`;

    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36"
      }
    });

    const $ = cheerio.load(html);

    // Extraemos rating, reviews y sold
    const ratingText = $(".reviewer--rating--xrWWFzx strong").text().trim() || "0";
    const reviewsText = $(".reviewer--reviews--cx7Zs_V").text().trim() || "0";
    const soldText = $(".reviewer--sold--ytPeoEy").text().trim() || "0";

    const rating = parseFloat(ratingText);
    const reviews = parseInt(reviewsText.replace(/\D/g, ""));
    const sold = parseInt(soldText.replace(/\D/g, ""));

    res.json({ product_id: productId, rating, reviews, sold });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al scrapear AliExpress", details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server corriendo en puerto ${PORT}`));
