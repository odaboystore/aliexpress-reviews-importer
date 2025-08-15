import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para parsear JSON
app.use(express.json());

// Ruta raíz
app.get("/", (req, res) => {
  res.send("Servidor de AliExpress Reviews Scraper funcionando");
});

// Ruta de prueba ping
app.get("/ping", (req, res) => {
  res.send("pong");
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
