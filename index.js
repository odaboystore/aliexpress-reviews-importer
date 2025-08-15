import express from "express";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para parsear JSON
app.use(express.json());

// =====================
// Endpoint raíz
// =====================
app.get("/", (req, res) => {
  res.send("Servidor funcionando correctamente");
});

// =====================
// Endpoint de prueba: obtener posts de un usuario
// =====================
app.get("/test/user-posts", async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: "Falta parámetro 'userId'" });
  }

  try {
    const response = await axios.get(`https://jsonplaceholder.typicode.com/posts?userId=${userId}`);
    res.json({
      success: true,
      userId,
      data: response.data,
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
  console.log("GET  /                  - Status del servidor");
  console.log("GET  /test/user-posts?userId=1  - Obtener posts de prueba de un usuario");
  console.log("==============================\n");
});
