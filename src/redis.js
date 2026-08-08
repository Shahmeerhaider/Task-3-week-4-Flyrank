// Stretch: ping Redis once on startup. Not used for tasks yet -- this
// is the connection you will build on in week 4.

const { createClient } = require("redis");

async function pingRedis() {
  if (!process.env.REDIS_URL) {
    console.log("REDIS_URL not set, skipping Redis ping");
    return;
  }
  const client = createClient({ url: process.env.REDIS_URL });
  client.on("error", (err) => console.error("Redis error:", err.message));
  await client.connect();
  const reply = await client.ping();
  console.log(`Redis ping: ${reply}`);
  await client.quit();
}

module.exports = { pingRedis };
