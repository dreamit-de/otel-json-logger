import {Console} from 'node:console'
import { 
    DiagLogger
} from '@opentelemetry/api'

export const loggerConsole: Console = new Console(process.stdout, process.stderr, false)

export enum LogLevel {
    debug = 'DEBUG',
    error = 'ERROR',
    info = 'INFO',
    off = '',
    warn = 'WARN',
    verbose = 'VERBOSE'
}

export interface LogEntry {
    logger: string;
    timestamp: string;
    message: string;
    level: LogLevel;
    serviceName: string;
}

export interface LogEntryInput {
    message: string,
    logArguments: unknown[],
    loglevel: LogLevel,
}

/**
 * Logger options to define behavior of logger  
 * @param {string} loggerName - The logger name of the logger.
 * Will be output to "logger" field in JSON.
 * @param {string} serviceName - The service name of the logger.
 * Will be output to "serviceName" field in JSON.
 *@param {LogLevel} logLevelForVerbose - The log level to use for verbose log entries.
 * Will be output to "serviceName" field in JSON.
 */
export interface LoggerOptions {
    loggerName: string
    serviceName: string
    logLevelForVerbose?: LogLevel
}

/**
 * Logger implementation that outputs log entries as JSON text to console.
 * Can be useful for log aggregation tools.
 */
export class JsonDiagLogger implements DiagLogger {
    loggerOptions: LoggerOptions

    /**
     * Creates a new instance of Logger.
     * @param {LoggerOptions} options - The logger options to be used
     */
    constructor(options: LoggerOptions) {
        this.loggerOptions = options
    }

    /**
     * Sets the loggerOptions to the provided values
     * @param {LoggerOptions} options - The logger options to be used
     */
    setOptions(options: LoggerOptions): void {
        this.loggerOptions = options
    }

    debug(message: string, ...arguments_: unknown[]): void {
        this.logMessage({
            message, 
            logArguments: arguments_, 
            loglevel: LogLevel.debug,
        })
    }

    error(message: string, ...arguments_: unknown[]): void {
        this.logMessage({
            message, 
            logArguments: arguments_, 
            loglevel: LogLevel.error,
        })}

    info(message: string, ...arguments_: unknown[]): void {
        this.logMessage({
            message, 
            logArguments: arguments_, 
            loglevel: LogLevel.info,
        })
    }

    verbose(message: string, ...arguments_: unknown[]): void {
        this.logMessage({
            message, 
            logArguments: arguments_, 
            loglevel: this.loggerOptions.logLevelForVerbose ?? LogLevel.verbose,
        })
    }

    warn(message: string, ...arguments_: unknown[]): void {
        this.logMessage({
            message, 
            logArguments: arguments_, 
            loglevel: LogLevel.warn,
        })
    }

    logMessage(logEntryInput: LogEntryInput): void {
        if (logEntryInput.loglevel !== LogLevel.off) {
            loggerConsole.log(JSON.stringify(this.createLogEntry(logEntryInput)))
        }
    }

    createLogEntry(logEntryInput: LogEntryInput): LogEntry {
        const {
            message,
            logArguments,
            loglevel,
        } = logEntryInput
        return {
            level: loglevel,
            logger: this.loggerOptions.loggerName,
            message: this.formatMessage(message) + 
            `. Log arguments are: ${JSON.stringify(logArguments)}`,
            serviceName: this.loggerOptions.serviceName,
            timestamp:  new Date().toISOString(),
        }
    }

    /**
     * Formats the message. If message contains object or array wrap it in 
     * JSON.stringify to avoid these being interpreted as JSON objects.
     * @param {message} string - The original message
     * @returns {string} the formatted message
     */
    formatMessage(message: string): string {
        if (message && (message.indexOf('{') === 0 || message.indexOf('[') === 0)) {
            return JSON.stringify(message)
        }
        return message
    }
}
