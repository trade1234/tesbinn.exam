export function notFound(req, res, next) {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

export function errorHandler(error, _req, res, _next) {
  const status = error.statusCode || 500;
  const exposeDetails = error.exposeDetails || process.env.NODE_ENV !== "production";

  res.status(status).json({
    message: error.message || "Server error",
    details: exposeDetails ? error.details : undefined
  });
}

