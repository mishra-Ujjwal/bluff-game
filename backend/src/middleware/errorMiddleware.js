export const errorMiddleware = (error, _req, res, _next) => {
  const statusCode = error.statusCode || 500;

  if (process.env.NODE_ENV !== "production") {
    console.error(error);
  }

  res.status(statusCode).json({
    message: error.message || "Something went wrong.",
  });
};
