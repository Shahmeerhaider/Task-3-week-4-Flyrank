const express = require("express");
const swaggerUi = require("swagger-ui-express");
const openapi = require("../openapi.json");
const { createTaskRoutes } = require("./routes/tasks");
const { createAuthRoutes } = require("./routes/auth");
const { createPublicRoutes } = require("./routes/publicInfo");
const { createProtectedRoutes } = require("./routes/protected");
const { createAuthMiddleware, requireAdmin } = require("./middleware/authMiddleware");

function createApp(taskService, supabase) {
  const app = express();
  app.use(express.json());

  const requireAuth = createAuthMiddleware(supabase);

  app.get("/", (req, res) => {
    res.json({
      name: "Task API",
      version: "4.0.0",
      endpoints: [
        "/tasks",
        "/tasks/:id",
        "/stats",
        "/reset",
        "/health",
        "/auth/signup",
        "/auth/login",
        "/auth/logout",
        "/auth/refresh",
        "/public/info",
        "/protected/profile",
        "/protected/dashboard",
        "/docs",
      ],
    });
  });

  app.get("/health", async (req, res) => {
    try {
      await taskService.ping();
      res.json({ status: "ok", db: "ok" });
    } catch (err) {
      res.status(503).json({ status: "ok", db: "unreachable" });
    }
  });

  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi));

  app.use(createAuthRoutes(supabase, requireAuth));
  app.use(createPublicRoutes());
  app.use(createProtectedRoutes(requireAuth, requireAdmin));
  app.use(createTaskRoutes(taskService));

  app.use((req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}

module.exports = { createApp };
