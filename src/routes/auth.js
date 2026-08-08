const express = require("express");

function createAuthRoutes(supabase, requireAuth) {
  const router = express.Router();

  router.post("/auth/signup", async (req, res, next) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ error: "email and password are required" });
      }

      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.status(201).json({ user: data.user });
    } catch (err) {
      next(err);
    }
  });

  router.post("/auth/login", async (req, res, next) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ error: "email and password are required" });
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return res.status(401).json({ error: "Invalid login credentials" });
      }

      res.status(200).json({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        user: data.user,
      });
    } catch (err) {
      next(err);
    }
  });

  router.post("/auth/logout", requireAuth, async (req, res, next) => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        return res.status(400).json({ error: error.message });
      }
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  // Stretch: exchange a refresh token for a new access token without
  // forcing the user to log in again.
  router.post("/auth/refresh", async (req, res, next) => {
    try {
      const { refresh_token } = req.body || {};
      if (!refresh_token) {
        return res.status(400).json({ error: "refresh_token is required" });
      }

      const { data, error } = await supabase.auth.refreshSession({ refresh_token });
      if (error) {
        return res.status(401).json({ error: "Invalid or expired refresh token" });
      }

      res.status(200).json({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { createAuthRoutes };
