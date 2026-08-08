require("dotenv").config();
const { createApp } = require("./src/app");
const { createTaskService } = require("./src/services/taskService");
const { getTaskRepository } = require("./src/repositories");
const { createSupabaseClient } = require("./src/auth/supabaseClient");
const { pingRedis } = require("./src/redis");

const PORT = process.env.PORT || 3000;

async function start() {
  const repository = getTaskRepository();
  await repository.init();
  const taskService = createTaskService(repository);

  const supabase = createSupabaseClient();

  const app = createApp(taskService, supabase);

  await pingRedis().catch((err) => console.error("Redis ping failed:", err.message));

  app.listen(PORT, () => {
    const backend = process.env.DATABASE_URL ? "Postgres" : "in-memory";
    console.log(`Server running and connected to Supabase (storage: ${backend}, port: ${PORT})`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
