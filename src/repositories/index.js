// The single switch for the whole app: if DATABASE_URL is set, use Postgres.
// Otherwise fall back to in-memory. Nothing outside this file knows or
// cares which one is active.

const inMemoryTaskRepository = require("./inMemoryTaskRepository");
const postgresTaskRepository = require("./postgresTaskRepository");

function getTaskRepository() {
  return process.env.DATABASE_URL ? postgresTaskRepository : inMemoryTaskRepository;
}

module.exports = { getTaskRepository };
