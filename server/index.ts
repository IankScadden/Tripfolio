import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite } from "./vite";
import { setupClerkAuth } from "./clerkAuth";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const app = express();

function log(message: string) {
  const formattedTime = new Date().toLocaleTimeString("en-US", { hour12: false });
  console.log(`${formattedTime} [express] ${message}`);
}

// Custom production setup that works correctly when bundled by esbuild
function setupProductionFixed(app: express.Express) {
  // Use process.cwd() instead of __dirname to avoid path issues when bundled
  const distPath = path.join(process.cwd(), "dist", "client");
  
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `❌ Could not find build directory: ${distPath}. Did you run "npm run build"?`
    );
  }
  
  log(`Serving static files from: ${distPath}`);
  
  // Serve built static files
  app.use(express.static(distPath));
  
  // Fallback to index.html (React Router support)
  app.use("*", (_req, res) => {
    const indexPath = path.join(distPath, "index.html");
    res.sendFile(indexPath);
  });
}

// Stripe webhook needs raw body - must be before express.json()
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Setup Clerk middleware globally
app.use(setupClerkAuth());

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app);
  } else {
    setupProductionFixed(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
