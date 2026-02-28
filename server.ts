import express from "express";
import cors from "cors";
import "dotenv/config"; // Load environment variables from .env if present
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// API Routes
app.get("/api/config", (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || "";
  res.json({ apiKey });
});


// Vite Middleware (Must come after API routes)
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static("dist"));
  }
}

setupVite().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
