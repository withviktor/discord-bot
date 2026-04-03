import { injectable } from "tsyringe";
import { env } from "../env.js";

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  white: "\x1b[97m",
} as const;

function timestamp(): string {
  return `${c.dim}${new Date().toISOString()}${c.reset}`;
}

function label(text: string, color: string): string {
  return `${c.bold}${color}${text}${c.reset}`;
}

@injectable()
export class LoggerService {
  private readonly isDev = env.NODE_ENV === "development";

  info(message: string, ...args: unknown[]): void {
    console.log(`${label(" INFO ", c.cyan)} ${timestamp()} ${message}`, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(
      `${label(" WARN ", c.yellow)} ${timestamp()} ${c.yellow}${message}${c.reset}`,
      ...args
    );
  }

  error(message: string, ...args: unknown[]): void {
    console.error(`${label(" ERROR", c.red)} ${timestamp()} ${c.red}${message}${c.reset}`, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.isDev) {
      console.debug(
        `${label(" DEBUG", c.gray)} ${timestamp()} ${c.dim}${message}${c.reset}`,
        ...args
      );
    }
  }
}
