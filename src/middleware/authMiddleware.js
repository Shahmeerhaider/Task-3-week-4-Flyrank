// requireAuth verifies a bearer token against Supabase on every request.
// requireAdmin runs after requireAuth and checks a role claim.
// Both are built as factories so a fake Supabase client can be injected
// in tests without a live project.

function extractToken(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return null;
  }
  const token = header.slice("Bearer ".length).trim();
  return token === "" ? null : token;
}

function createAuthMiddleware(supabase) {
  return async function requireAuth(req, res, next) {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: "Access token required" });
    }

    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data || !data.user) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }
      req.user = data.user;
      req.token = token;
      next();
    } catch (err) {
      next(err);
    }
  };
}

function requireAdmin(req, res, next) {
  const role = req.user?.app_metadata?.role || req.user?.user_metadata?.role;
  if (role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

module.exports = { createAuthMiddleware, requireAdmin, extractToken };
