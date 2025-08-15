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

// Función corregida para generar sign de AliExpress
function generateSign(params) {
  // Excluir 'sign' del cálculo si existe
  const filteredParams = { ...params };
  delete filteredParams.sign;
  
  // Ordenar las claves alfabéticamente
  const sortedKeys = Object.keys(filteredParams).sort();
  
  // Construir la cadena para firma
  let str = AE_APP_SECRET;
  for (let key of sortedKeys) {
    if (filteredParams[key] !== null && filteredParams[key] !== undefined && filteredParams[key] !== '') {
      str += key + filteredParams[key];
    }
  }
  str += AE_APP_SECRET;
  
  return crypto.createHash("sha256").update(str, 'utf8').digest("hex").toUpperCase();
}

// Endpoint corregido para traer meta de producto
app.get("/ae/product-meta", async (req, res) => {
  const { productId, skuId } = req.query;
  
  if (!productId) {
    return res.status(400).json({ error: "Falta productId" });
  }

  try {
    // Parámetros corregidos según documentación AliExpress
    const params = {
      method: "aliexpress.affiliate.product.query", // Método más actual
      app_key: AE_APP_KEY,
      timestamp: Date.now().toString(), // Timestamp en milisegundos como string
      format: "json",
      v: "2.0",
      sign_method: "sha256",
      product_ids: productId, // Parámetro correcto
      fields: "commission_rate,sale_price,product_title,evaluate_rate,30days_commission,volume", // Campos específicos
      target_currency: "USD",
      target_language: "EN"
    };

    // Agregar skuId solo si se proporciona
    if (skuId) {
      params.sku_id = skuId;
    }

    // Generar signature
    params.sign = generateSign(params);

    console.log("Parámetros enviados:", params);

    const url = "https://api-sg.aliexpress.com/sync?" + qs.stringify(params);
    console.log("URL completa:", url);

    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    console.log("Respuesta completa de AliExpress:", JSON.stringify(response.data, null, 2));

    // Procesar respuesta
    if (response.data.aliexpress_affiliate_product_query_response) {
      const result = response.data.aliexpress_affiliate_product_query_response.resp_result;
      
      if (result && result.result && result.result.products) {
        const product = result.result.products[0];
        
        const rating = Number(product.evaluate_rate) || 0;
        const reviews = Number(product.volume) || 0; // volume = número de pedidos/reviews
        const sold = Number(product.volume) || 0;

        res.json({ 
          product_id: productId, 
          rating, 
          reviews, 
          sold,
          title: product.product_title || "N/A",
          price: product.sale_price || "N/A",
          raw_response: result // Para debugging
        });
      } else {
        res.json({ 
          product_id: productId, 
          rating: 0, 
          reviews: 0, 
          sold: 0,
          error: "No product data found",
          raw_response: response.data 
        });
      }
    } else {
      res.status(500).json({ 
        error: "Formato de respuesta inesperado", 
        raw_response: response.data 
      });
    }

  } catch (err) {
    console.error("Error completo:", err.message);
    console.error("Datos de respuesta:", err.response?.data);
    
    res.status(500).json({ 
      error: "Error al consultar AliExpress", 
      details: err.message,
      response_data: err.response?.data 
    });
  }
});

// Endpoint alternativo usando el método original pero corregido
app.get("/ae/product-meta-v2", async (req, res) => {
  const { productId } = req.query;
  
  if (!productId) {
    return res.status(400).json({ error: "Falta productId" });
  }

  try {
    const params = {
      method: "aliexpress.affiliate.productdetail.get",
      app_key: AE_APP_KEY,
      timestamp: Date.now().toString(),
      format: "json",
      v: "2.0",
      sign_method: "sha256",
      product_ids: productId,
      fields: "commission_rate,sale_price,product_title,evaluate_rate,volume,product_detail_url",
      target_currency: "USD",
      target_language: "EN"
    };

    params.sign = generateSign(params);

    const response = await axios.get(
      "https://api-sg.aliexpress.com/sync?" + qs.stringify(params),
      { timeout: 30000 }
    );

    console.log("Respuesta v2:", JSON.stringify(response.data, null, 2));

    const result = response.data.aliexpress_affiliate_productdetail_get_response?.resp_result;
    
    if (result && result.result && result.result.products && result.result.products.length > 0) {
      const product = result.result.products[0];
      
      res.json({
        product_id: productId,
        rating: Number(product.evaluate_rate) || 0,
        reviews: Number(product.volume) || 0,
        sold: Number(product.volume) || 0,
        title: product.product_title || "N/A",
        url: product.product_detail_url || "N/A"
      });
    } else {
      res.json({
        product_id: productId,
        rating: 0,
        reviews: 0,
        sold: 0,
        error: "No product data found in v2",
        raw_response: response.data
      });
    }

  } catch (err) {
    console.error("Error en v2:", err.message);
    res.status(500).json({ 
      error: "Error en método v2", 
      details: err.message,
      response_data: err.response?.data 
    });
  }
});

// Endpoint de prueba para verificar credenciales
app.get("/ae/test-credentials", async (req, res) => {
  try {
    const params = {
      method: "aliexpress.affiliate.category.get",
      app_key: AE_APP_KEY,
      timestamp: Date.now().toString(),
      format: "json",
      v: "2.0",
      sign_method: "sha256"
    };

    params.sign = generateSign(params);

    const response = await axios.get(
      "https://api-sg.aliexpress.com/sync?" + qs.stringify(params),
      { timeout: 10000 }
    );

    res.json({
      credentials_valid: true,
      response: response.data
    });

  } catch (err) {
    res.status(500).json({
      credentials_valid: false,
      error: err.message,
      response_data: err.response?.data
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server corriendo en puerto ${PORT}`);
  console.log("AE_APP_KEY:", AE_APP_KEY ? "Configurado" : "FALTA");
  console.log("AE_APP_SECRET:", AE_APP_SECRET ? "Configurado" : "FALTA");
});
