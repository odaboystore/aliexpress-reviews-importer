import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import crypto from "crypto";
import qs from "qs";

dotenv.config();

const app = express();
app.use(express.json());

const { AE_APP_KEY, AE_APP_SECRET } = process.env;

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
  const { productId, skuId } = req.query;
  if (!productId) return res.status(400).json({ error: "Falta productId" });

  try {
    const params = {
      method: "aliexpress.aeop.product.redefining.get",
      app_key: AE_APP_KEY,
      timestamp: new Date().toISOString(),
      format: "json",
      v: "2.0",
      productId,
      skuId: skuId || ""
    };

    params.sign = generateSign(params);

    const response = await axios.get(
      "https://openapi.aliexpress.com/gateway.do?" + qs.stringify(params)
    );

    // Revisa la estructura real que devuelve AliExpress
    const product = response.data.result || {};

    // Ajusta según la respuesta real de la API
    const rating = Number(product.averageStarRating) || 0;
    const reviews = Number(product.feedbackCount) || 0;
    const sold = Number(product.tradeCount) || 0;

    res.json({ product_id: productId, rating, reviews, sold });
  } catch (err) {
    console.error(err.message, err.response?.data);
    res.status(500).json({ error: "Error al consultar AliExpress", details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server corriendo en puerto ${PORT}`));
