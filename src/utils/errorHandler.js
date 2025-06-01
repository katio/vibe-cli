import chalk from 'chalk';

/**
 * Custom error class for application-specific errors
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handle unhandled promise rejections
 */
export function handleUnhandledRejections() {
  process.on('unhandledRejection', (err) => {
    console.error(chalk.red('UNHANDLED REJECTION! 💥 Shutting down...'));
    console.error(chalk.red(err));
    process.exit(1);
  });
}

/**
 * Handle uncaught exceptions
 */
export function handleUncaughtExceptions() {
  process.on('uncaughtException', (err) => {
    console.error(chalk.red('UNCAUGHT EXCEPTION! 💥 Shutting down...'));
    console.error(chalk.red(err));
    process.exit(1);
  });
}

/**
 * Handle SIGTERM signal
 */
export function handleSigterm() {
  process.on('SIGTERM', () => {
    console.log(chalk.yellow('👋 SIGTERM RECEIVED. Shutting down gracefully'));
    process.exit(0);
  });
}

/**
 * Global error handler middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export function globalErrorHandler(err, req, res, next) {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    console.error(chalk.red('Error:'), err);
  }

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

/**
 * Validate input against a schema
 * @param {Object} input - Input to validate
 * @param {Object} schema - Joi schema to validate against
 * @returns {Object} - Validated input
 */
export function validateInput(input, schema) {
  const { error, value } = schema.validate(input, { abortEarly: false });
  
  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join('. ');
    throw new AppError(`Validation error: ${errorMessage}`, 400);
  }
  
  return value;
}

/**
 * Handle async/await errors in Express routes
 * @param {Function} fn - Async route handler function
 * @returns {Function} - Wrapped async function with error handling
 */
export function catchAsync(fn) {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

export default {
  AppError,
  handleUnhandledRejections,
  handleUncaughtExceptions,
  handleSigterm,
  globalErrorHandler,
  validateInput,
  catchAsync,
};
