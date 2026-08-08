const express = require("express");

function parseBool(value) {
  if (value === undefined) return undefined;
  return value === "true";
}

function createTaskRoutes(taskService) {
  const router = express.Router();

  router.get("/tasks", async (req, res, next) => {
    try {
      const { done, search, sort, limit, offset } = req.query;
      const tasks = await taskService.list({
        done: parseBool(done),
        search,
        sort,
        limit: limit !== undefined ? Number(limit) : undefined,
        offset: offset !== undefined ? Number(offset) : undefined,
      });
      res.json(tasks);
    } catch (err) {
      next(err);
    }
  });

  router.get("/stats", async (req, res, next) => {
    try {
      res.json(await taskService.stats());
    } catch (err) {
      next(err);
    }
  });

  router.post("/reset", async (req, res, next) => {
    try {
      await taskService.reset();
      res.json({ message: "Reset to 3 example tasks" });
    } catch (err) {
      next(err);
    }
  });

  router.get("/tasks/:id", async (req, res, next) => {
    try {
      const task = await taskService.get(req.params.id);
      if (!task) {
        return res.status(404).json({ error: `Task ${req.params.id} not found` });
      }
      res.json(task);
    } catch (err) {
      next(err);
    }
  });

  router.post("/tasks", async (req, res, next) => {
    try {
      const { title, done } = req.body || {};
      const result = await taskService.create({ title, done });
      if (result.error) {
        return res.status(400).json({ error: result.error });
      }
      res.status(201).json(result.task);
    } catch (err) {
      next(err);
    }
  });

  router.put("/tasks/:id", async (req, res, next) => {
    try {
      const { title, done } = req.body || {};
      const result = await taskService.update(req.params.id, { title, done });
      if (result.error) {
        return res.status(result.notFound ? 404 : 400).json({ error: result.error });
      }
      res.json(result.task);
    } catch (err) {
      next(err);
    }
  });

  router.delete("/tasks/:id", async (req, res, next) => {
    try {
      const deleted = await taskService.remove(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: `Task ${req.params.id} not found` });
      }
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { createTaskRoutes };
