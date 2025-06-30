export type LogLevel = 'info' | 'warn' | 'error'

export interface LogDetails {
  [key: string]: any
}

class Logger {
  private formatMessage(level: LogLevel, action: string): string {
    const timestamp = new Date().toISOString()
    return `[${timestamp}] [${level.toUpperCase()}] ${action}`
  }

  log(level: LogLevel, action: string, details?: LogDetails): void {
    const message = this.formatMessage(level, action)

    if (details !== undefined) {
      console[level](message, details)
    } else {
      console[level](message)
    }
  }

  info(action: string, details?: LogDetails): void {
    this.log('info', action, details)
  }

  warn(action: string, details?: LogDetails): void {
    this.log('warn', action, details)
  }

  error(action: string, details?: LogDetails): void {
    this.log('error', action, details)
  }
}

export const logger = new Logger()