import express, { type Express } from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -------------------------------
//  DEV MODE (Replit) – Vite server
// -------------------------------
export async function setupVite(app: Express) {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "custom",
  });

  app.use(vite.middlewares);

  // Serve index.html in dev mode
  app.use("*", async (req, res, next) => {
    try {
      const url = req.originalUrl;

      const templatePath = path.resolve(__dirname, "../client/index.html");
      let template = fs.readFileSync(templatePath, "utf-8");

      template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (err) {
      vite.ssrFixStacktrace(err);
      next(err);
    }
  });
}

// --------------------------------------
//  PRODUCTION MODE (Railway) – Serve dist
// --------------------------------------
export function setupProduction(app: Express) {
  const distPath = path.resolve(__dirname, "../dist/client");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `❌ Could not find build directory: ${distPath}. Did you run "npm run build"?`
    );
  }

  // Serve built static files
  app.use(express.static(distPath));

  // Fallback to index.html (React Router support)
  app.use("*", (req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    res.sendFile(indexPath);
  });
}
