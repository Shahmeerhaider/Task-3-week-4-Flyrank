// Same interface as postgresTaskRepository.js: init, findAll, findById,
// create, update, remove, stats, resetSeed, ping.
// Data lives only in this array, so it is gone on every restart.

let tasks = [];
let nextId = 1;

function seed() {
  tasks = [];
  nextId = 1;
  addSeedTask("Buy milk", false);
  addSeedTask("Write README", false);
  addSeedTask("Ship the API", true);
}

function addSeedTask(title, done) {
  const now = new Date().toISOString();
  tasks.push({ id: nextId++, title, done, created_at: now, updated_at: now });
}

async function init() {
  if (tasks.length === 0) {
    seed();
  }
}

async function findAll({ done, search, sort, limit, offset } = {}) {
  let result = [...tasks];

  if (done !== undefined) {
    result = result.filter((t) => t.done === done);
  }
  if (search) {
    const needle = search.toLowerCase();
    result = result.filter((t) => t.title.toLowerCase().includes(needle));
  }

  result.sort((a, b) => (sort === "title" ? a.title.localeCompare(b.title) : a.id - b.id));

  if (offset !== undefined) {
    result = result.slice(offset);
  }
  if (limit !== undefined) {
    result = result.slice(0, limit);
  }

  return result;
}

async function findById(id) {
  return tasks.find((t) => t.id === Number(id)) || null;
}

async function create({ title, done = false }) {
  const now = new Date().toISOString();
  const task = { id: nextId++, title, done, created_at: now, updated_at: now };
  tasks.push(task);
  return task;
}

async function update(id, { title, done }) {
  const task = tasks.find((t) => t.id === Number(id));
  if (!task) return null;
  task.title = title;
  task.done = done;
  task.updated_at = new Date().toISOString();
  return task;
}

async function remove(id) {
  const index = tasks.findIndex((t) => t.id === Number(id));
  if (index === -1) return false;
  tasks.splice(index, 1);
  return true;
}

async function stats() {
  const total = tasks.length;
  const done = tasks.filter((t) => t.done).length;
  return { total, done, open: total - done };
}

async function resetSeed() {
  seed();
}

async function ping() {
  return true;
}

module.exports = {
  init,
  findAll,
  findById,
  create,
  update,
  remove,
  stats,
  resetSeed,
  ping,
};
