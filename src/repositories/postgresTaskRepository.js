// Same interface as inMemoryTaskRepository.js: init, findAll, findById,
// create, update, remove, stats, resetSeed, ping.
// This is the only file in the app that issues SQL. Every query is
// parameterized ($1, $2, ...) -- values are never glued into the SQL string.

const fs = require("fs");
const path = require("path");
const pool = require("../db/pool");

const SEED_TASKS = [
  { title: "Buy milk", done: false },
  { title: "Write README", done: false },
  { title: "Ship the API", done: true },
];

async function init() {
  const schema = fs.readFileSync(path.join(__dirname, "../db/schema.sql"), "utf8");
  await pool.query(schema);

  const { rows } = await pool.query("SELECT COUNT(*)::int AS count FROM tasks");
  if (rows[0].count === 0) {
    for (const task of SEED_TASKS) {
      await pool.query("INSERT INTO tasks (title, done) VALUES ($1, $2)", [task.title, task.done]);
    }
  }
}

async function findAll({ done, search, sort, limit, offset } = {}) {
  const conditions = [];
  const values = [];

  if (done !== undefined) {
    values.push(done);
    conditions.push(`done = $${values.length}`);
  }
  if (search) {
    values.push(`%${search}%`);
    conditions.push(`title ILIKE $${values.length}`);
  }

  let query = "SELECT * FROM tasks";
  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }
  query += sort === "title" ? " ORDER BY title ASC" : " ORDER BY id ASC";

  if (limit !== undefined) {
    values.push(limit);
    query += ` LIMIT $${values.length}`;
  }
  if (offset !== undefined) {
    values.push(offset);
    query += ` OFFSET $${values.length}`;
  }

  const { rows } = await pool.query(query, values);
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query("SELECT * FROM tasks WHERE id = $1", [id]);
  return rows[0] || null;
}

async function create({ title, done = false }) {
  const { rows } = await pool.query(
    "INSERT INTO tasks (title, done) VALUES ($1, $2) RETURNING *",
    [title, done]
  );
  return rows[0];
}

async function update(id, { title, done }) {
  const { rows } = await pool.query(
    `UPDATE tasks SET title = $1, done = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
    [title, done, id]
  );
  return rows[0] || null;
}

async function remove(id) {
  const { rowCount } = await pool.query("DELETE FROM tasks WHERE id = $1", [id]);
  return rowCount > 0;
}

async function stats() {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE done)::int AS done,
            COUNT(*) FILTER (WHERE NOT done)::int AS open
     FROM tasks`
  );
  return rows[0];
}

async function resetSeed() {
  await pool.query("DELETE FROM tasks");
  for (const task of SEED_TASKS) {
    await pool.query("INSERT INTO tasks (title, done) VALUES ($1, $2)", [task.title, task.done]);
  }
}

async function ping() {
  await pool.query("SELECT 1");
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
