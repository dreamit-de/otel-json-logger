import {Console} from 'node:console'
import { inspect } from 'node:util'
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
 * @param {LogLevel} logLevelForServiceRequestErrorMessages - The log level to use 
 * for error messages "Service request". These contain request information that might not be logged
 * on error level.
 * @param {LogLevel} logLevelForTimeoutErrorMessages - The log level to use 
 * for Timeout related messages. These might be of short nature and be downgraded or ignored.
 * @param {LogLevel} logLevelForVerbose - The log level to use for verbose log entries.
 * @param {number} truncateLimit - The length of the message before the message gets truncated. 
 * Default: undefined/0 (off). 
 * @param {string} truncatedText - The text to display if a message is truncated.
 */
export interface LoggerOptions {
    loggerName: string
    serviceName: string
    logLevelForServiceRequestErrorMessages?: LogLevel
    logLevelForTimeoutErrorMessages?: LogLevel
    logLevelForVerbose?: LogLevel
    truncateLimit?: number
    truncatedText?: string
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
        let logLevel
        if (this.loggerOptions.logLevelForServiceRequestErrorMessages 
            && message === 'Service request') {
            logLevel = this.loggerOptions.logLevelForServiceRequestErrorMessages
        } else if (this.loggerOptions.logLevelForTimeoutErrorMessages 
            && this.containsTimeout(message)) {
            logLevel = this.loggerOptions.logLevelForTimeoutErrorMessages
        } else {
            logLevel = LogLevel.error
        }

        this.logMessage({
            message, 
            logArguments: arguments_, 
            loglevel: logLevel,
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

        const {
            truncateLimit,
            truncatedText, 
            loggerName, 
            serviceName
        } = this.loggerOptions

        let logMessage = this.formatMessage(message) + 
        `. Log arguments are: ${inspect(logArguments, {depth: 20})}`
        if (truncateLimit && truncateLimit > 0) {
            const truncatedTextToUse = truncatedText ?? '_TRUNCATED_'
            if (logMessage.length > truncateLimit + truncatedTextToUse.length) {
                logMessage = truncateLimit > truncatedTextToUse.length 
                    ? logMessage.slice(0, truncateLimit - truncatedTextToUse.length) 
                        + truncatedTextToUse 
                    : logMessage.slice(0, truncateLimit)
            }
        }

        return {
            level: loglevel,
            logger: loggerName,
            message: logMessage,
            serviceName: serviceName,
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
            return inspect(message, {depth: 20})
        }
        return message
    }

    /**
     * Check if the message contains a Timeout information like "4 DEADLINE_EXCEEDED" 
     * or "14 UNAVAILABLE"
     * @param {message} string - The original message
     * @returns {boolean} true if the message contains a Timeout information, false otherwise
     */
    containsTimeout(message: string): boolean {
        const messageAsString = inspect(message, {depth: 20})
        return messageAsString.includes('4 DEADLINE_EXCEEDED') ||
            messageAsString.includes('14 UNAVAILABLE')
    }

}
