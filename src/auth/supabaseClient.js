const { createClient } = require("@supabase/supabase-js");

function createSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;

  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_KEY must be set");
  }

  return createClient(url, key);
}

module.exports = { createSupabaseClient };
