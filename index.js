import express from "express";
import dotenv from "dotenv";
import axios from "axios";
dotenv.config();

const app = express();
app.use(express.json());

const { AE_APP_KEY, AE_APP_SECRET, BASE_URL } = process.env;

// Endpoint de prueba
app.get("/", (req, res) => {
  res.send("Servidor de AliExpress Reviews Importer funcionando");
});

// Endpoint para traer meta de producto
app.get("/ae/product-meta", async (req, res) => {
  const productId = req.query.productId;
  if (!productId) return res.status(400).json({ error: "Falta productId" });

  try {
    const url = `https://openapi.aliexpress.com/gateway.do`;
    const params = {
      method: "aliexpress.product.get", // Ejemplo de endpoint
      app_key: AE_APP_KEY,
      timestamp: new Date().toISOString(),
      format: "json",
      v: "2.0",
      sign_method: "sha256",
      product_id: productId
      // Agregar signature según docs de AliExpress
    };

    // Nota: para producción necesitarás generar la firma (sign) según la documentación de AliExpress
    const response = await axios.get(url, { params });

    // Parsear respuesta
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

