import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// =====================
// Endpoint raíz
// =====================
app.get("/", (req, res) => {
  res.send("Servidor de prueba funcionando");
});

// =====================
// Endpoint de prueba con JSONPlaceholder
// =====================
app.get("/test/user-posts", async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: "Falta parámetro 'userId'" });
  }

  try {
    const response = await axios.get(
      `https://jsonplaceholder.typicode.com/posts?userId=${userId}`
    );
    res.json({
      success: true,
      userId,
      posts: response.data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// =====================
// Iniciar servidor
// =====================
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log("\n=== ENDPOINTS DISPONIBLES ===");
  console.log("GET  /                 - Status del servidor");
  console.log("GET  /test/user-posts?userId=1 - Prueba con API pública");
  console.log("==============================\n");
});
