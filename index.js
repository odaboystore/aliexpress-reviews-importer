import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import crypto from "crypto";

dotenv.config();

const app = express();
app.use(express.json());

const { AE_APP_KEY, AE_APP_SECRET, BASE_URL } = process.env;

app.get("/", (req, res) => {
  res.send("Servidor de AliExpress Reviews Importer funcionando");
});

// Función para generar sign de AliExpress
function generateSign(params) {
  const sortedKeys = Object.keys(params).sort();
  let str = AE_APP_SECRET;
  for (let key of sortedKeys) {
    str += key + params[key];
  }
  str += AE_APP_SECRET;
  return crypto.createHash("sha256").update(str).digest("hex").toUpperCase();
}

// Endpoint para traer meta de producto
app.get("/ae/product-meta", async (req, res) => {
  const productId = req.query.productId;
  if (!productId) return res.status(400).json({ error: "Falta productId" });

  try {
    const params = {
      method: "aliexpress.product.get",
      app_key: AE_APP_KEY,
      timestamp: new Date().toISOString(),
      format: "json",
      v: "2.0",
      product_id: productId
    };

    params.sign = generateSign(params);

    const response = await axios.get("https://openapi.aliexpress.com/gateway.do", { params });

    const data = response.data.result || {};
    const rating = Number(data.avg_evaluation_rating) || 0;
    const reviews = Number(data.evaluation_count) || 0;
    const sold = Number(data.order_count) || 0;

    res.json({ product_id: productId, rating, reviews, sold });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Error al consultar AliExpress", details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server corriendo en puerto ${PORT}`));
