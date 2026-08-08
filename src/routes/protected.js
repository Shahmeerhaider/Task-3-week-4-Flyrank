const express = require("express");

function createProtectedRoutes(requireAuth, requireAdmin) {
  const router = express.Router();

  router.get("/protected/profile", requireAuth, (req, res) => {
    res.status(200).json({
      id: req.user.id,
      email: req.user.email,
      created_at: req.user.created_at,
    });
  });

  // Second protected route reusing the exact same middleware, proving
  // the guard is not one-off logic pasted per route.
  router.get("/protected/dashboard", requireAuth, (req, res) => {
    res.status(200).json({ message: `Welcome back, ${req.user.email}` });
  });

  // Stretch: 401 vs 403. requireAuth answers "who are you?";
  // requireAdmin answers "are you allowed here?".
  router.get("/protected/admin", requireAuth, requireAdmin, (req, res) => {
    res.status(200).json({ message: "Welcome, admin." });
  });

  return router;
}

module.exports = { createProtectedRoutes };
