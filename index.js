import express from "express";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para JSON
app.use(express.json());

// Rutas de prueba
app.get("/", (req, res) => {
  res.send("Página principal funcionando ✅");
});

app.get("/about", (req, res) => {
  res.send("Página About funcionando ✅");
});

app.get("/contact", (req, res) => {
  res.send("Página Contact funcionando ✅");
});

app.get("/ping", (req, res) => {
  res.send("pong 🏓");
});

// Ruta con parámetro
app.get("/user/:id", (req, res) => {
  const { id } = req.params;
  res.send(`Página del usuario ${id} funcionando ✅`);
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log("Rutas disponibles:");
  console.log("GET  /");
  console.log("GET  /about");
  console.log("GET  /contact");
  console.log("GET  /ping");
  console.log("GET  /user/:id");
});
