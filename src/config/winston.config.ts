import { utilities as nestWinstonModuleUtilities } from "nest-winston";
import * as winston from "winston";
import { WinstonModule } from "nest-winston";

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.ms(),
  winston.format.json(),
  winston.format.prettyPrint(),
  winston.format.colorize({ all: true })
);

export const winstonConfig = {
  transports: [
    // Console transport with detailed formatting
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.ms(),
        nestWinstonModuleUtilities.format.nestLike("NestJS-API", {
          colors: true,
          prettyPrint: true,
        })
      ),
    }),
    // Error log file
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      format: logFormat,
    }),
    // Combined log file
    new winston.transports.File({
      filename: "logs/combined.log",
      format: logFormat,
    }),
    // Streaming log for real-time monitoring
    new winston.transports.Stream({
      stream: process.stdout,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `[${timestamp}] ${level}: ${message}`;
        })
      ),
    }),
  ],
};

// Create a logger instance
export const logger = WinstonModule.createLogger(winstonConfig);

// Custom startup message function
export const logStartupMessage = async (port: number) => {
  const message = `
====================================================
🚀 NestJS Multi-Tenant API Started Successfully!
----------------------------------------------------
🌐 API URL: http://localhost:${port}
📚 Swagger Docs: http://localhost:${port}/api/docs
====================================================
`;

  logger.log(message);
  return message;
};
