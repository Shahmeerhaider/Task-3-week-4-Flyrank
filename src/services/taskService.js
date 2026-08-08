// Business rules live here, not in the routes and not in a repository.
// Takes a repository (in-memory or Postgres, same interface) and exposes
// the same operations regardless of which one it was given.

function createTaskService(repository) {
  function validateTitle(title) {
    return typeof title === "string" && title.trim() !== "";
  }

  return {
    async list(filters) {
      return repository.findAll(filters);
    },

    async get(id) {
      return repository.findById(id);
    },

    async create({ title, done }) {
      if (!validateTitle(title)) {
        return { error: "title is required" };
      }
      return { task: await repository.create({ title: title.trim(), done: Boolean(done) }) };
    },

    async update(id, { title, done }) {
      if (!validateTitle(title)) {
        return { error: "title is required" };
      }
      const task = await repository.update(id, { title: title.trim(), done: Boolean(done) });
      if (!task) {
        return { error: `Task ${id} not found`, notFound: true };
      }
      return { task };
    },

    async remove(id) {
      return repository.remove(id);
    },

    async stats() {
      return repository.stats();
    },

    async reset() {
      return repository.resetSeed();
    },

    async ping() {
      return repository.ping();
    },
  };
}

module.exports = { createTaskService };
