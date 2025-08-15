import express from "express";
import axios from "axios";
import cheerio from "cheerio";

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Servidor de AliExpress Reviews Scraper funcionando");
});

app.get("/ae/product-meta", async (req, res) => {
  const { productId } = req.query;
  if (!productId) return res.status(400).json({ error: "Falta productId" });

  try {
    // URL del producto
    const url = `https://www.aliexpress.us/item/${productId}.html`;

    // Obtener HTML
    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36"
      }
    });

    const $ = cheerio.load(html);

    // Seleccionar rating, reviews y ventas desde el DOM
    // Estos selectores pueden cambiar según AliExpress
    const ratingText = $('[data-review-star-rating]').attr("data-review-star-rating") || "0";
    const reviewsText = $('[data-review-count]').attr("data-review-count") || "0";
    const soldText = $('[data-sold-count]').attr("data-sold-count") || "0";

    const rating = parseFloat(ratingText);
    const reviews = parseInt(reviewsText);
    const sold = parseInt(soldText);

    res.json({ product_id: productId, rating, reviews, sold });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al scrapear AliExpress", details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server corriendo en puerto ${PORT}`));
