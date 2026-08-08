const express = require("express");

function createPublicRoutes() {
  const router = express.Router();

  router.get("/public/info", (req, res) => {
    res.status(200).json({ message: "Welcome stranger! This info is public." });
  });

  return router;
}

module.exports = { createPublicRoutes };
