-- Optional stretch: speeds up GET /tasks?done=true on large tables.
-- Not applied automatically -- run manually if you want to reproduce
-- the EXPLAIN ANALYZE comparison in the README.
CREATE INDEX IF NOT EXISTS idx_tasks_done ON tasks(done);
