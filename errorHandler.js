// src/middleware/errorHandler.js
// Centralised Express error handler. Any controller that calls next(err) ends up here.
// Always returns JSON so clients don't have to parse HTML error pages.

/**
 * errorHandler — register LAST in the Express middleware chain.
 * Usage: app.use(errorHandler)
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  const status = err.status || err.statusCode || 500;
  const message =
    process.env.NODE_ENV === "production" && status === 500
      ? "Internal server error."
      : err.message || "Something went wrong.";

  res.status(status).json({ error: message });
}
