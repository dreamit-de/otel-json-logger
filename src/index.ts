import { DiagLogger } from '@opentelemetry/api'
import { Console } from 'node:console'
import { inspect } from 'node:util'

export const loggerConsole: Console = new Console(
    process.stdout,
    process.stderr,
    false,
)

export enum LogLevel {
    debug = 'DEBUG',
    error = 'ERROR',
    info = 'INFO',
    off = 'OFF',
    warn = 'WARN',
    verbose = 'VERBOSE',
}

const logLevelByScope = [
    LogLevel.off,
    LogLevel.verbose,
    LogLevel.debug,
    LogLevel.info,
    LogLevel.warn,
    LogLevel.error,
]

export interface LogEntry {
    logger: string
    timestamp: string
    message: string
    level: LogLevel
    serviceName: string
}

export interface LogEntryInput {
    message: string
    logArguments: unknown[]
    loglevel: LogLevel
}

/**
 * Logger options to define behavior of logger
 * @param {string} loggerName - The logger name of the logger.
 * Will be output to "logger" field in JSON.
 * @param {string} serviceName - The service name of the logger.
 * Will be output to "serviceName" field in JSON.
 * @param {boolean} logFirstIncomingRequest - If true, the first incoming request will be logged.
 * Other messages on debug level will be log if monLogLevel is set to debug or higher. Default: false.
 * Note: If you use diag.setLogger ensure that at least "LogLevel.debug" is set,
 * otherwise the message will be ignored.
 * @param {LogLevel} logLevelForServiceRequestErrorMessages - The log level to use
 * for error messages "Service request". These contain request information that might not be logged
 * on error level.
 * @param {LogLevel} logLevelForTimeoutErrorMessages - The log level to use
 * for Timeout related messages. These might be of short nature and be downgraded or ignored.
 * @param {LogLevel} logLevelForVerbose - The log level to use for verbose log entries.
 * @param {LogLevel} minLogLevel - The minimum log level to use.
 * Default: Does not check for min LogLevel.
 * @param {number} truncateLimit - The length of the message before the message gets truncated.
 * Default: undefined/0 (off).
 * @param {string} truncatedText - The text to display if a message is truncated.
 */
export interface LoggerOptions {
    loggerName: string
    serviceName: string
    logFirstIncomingRequest?: boolean
    logLevelForServiceRequestErrorMessages?: LogLevel
    logLevelForTimeoutErrorMessages?: LogLevel
    logLevelForVerbose?: LogLevel
    minLogLevel?: LogLevel
    truncateLimit?: number
    truncatedText?: string
}

/**
 * Logger implementation that outputs log entries as JSON text to console.
 * Can be useful for log aggregation tools.
 */
export class JsonDiagLogger implements DiagLogger {
    loggerOptions: LoggerOptions
    firstIncomingRequestLogged: boolean = false

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
        if (this.loggerOptions.logFirstIncomingRequest) {
            if (
                !this.firstIncomingRequestLogged &&
                this.isIncomingRequestLogMessage(arguments_)
            ) {
                this.logMessage({
                    message: 'First incoming request',
                    logArguments: [],
                    loglevel: LogLevel.info,
                })
                this.firstIncomingRequestLogged = true
            } else if (
                this.loggerOptions.minLogLevel &&
                this.isEqualOrHigherMinLogLevel(this.loggerOptions.minLogLevel) &&
                !this.isIncomingRequestLogMessage(arguments_)
            ) {
                this.logMessage({
                    message,
                    logArguments: arguments_,
                    loglevel: LogLevel.debug,
                })
            }
        } else {
            this.logMessage({
                message,
                logArguments: arguments_,
                loglevel: LogLevel.debug,
            })
        }
    }

    error(message: string, ...arguments_: unknown[]): void {
        let logLevel
        if (
            this.loggerOptions.logLevelForServiceRequestErrorMessages &&
            message === 'Service request'
        ) {
            logLevel = this.loggerOptions.logLevelForServiceRequestErrorMessages
        } else if (
            this.loggerOptions.logLevelForTimeoutErrorMessages &&
            this.containsTimeout(message)
        ) {
            logLevel = this.loggerOptions.logLevelForTimeoutErrorMessages
        } else {
            logLevel = LogLevel.error
        }

        this.logMessage({
            message,
            logArguments: arguments_,
            loglevel: logLevel,
        })
    }

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
        if (
            logEntryInput.loglevel !== LogLevel.off &&
            this.isEqualOrHigherMinLogLevel(logEntryInput.loglevel)
        ) {
            loggerConsole.log(
                JSON.stringify(this.createLogEntry(logEntryInput)),
            )
        }
    }

    createLogEntry(logEntryInput: LogEntryInput): LogEntry {
        const { message, logArguments, loglevel } = logEntryInput

        const { truncateLimit, truncatedText, loggerName, serviceName } =
            this.loggerOptions

        let logMessage =
            this.formatMessage(message) +
            `. Log arguments are: ${inspect(logArguments, { depth: 20 })}`
        if (truncateLimit && truncateLimit > 0) {
            const truncatedTextToUse = truncatedText ?? '_TRUNCATED_'
            if (logMessage.length > truncateLimit + truncatedTextToUse.length) {
                logMessage =
                    truncateLimit > truncatedTextToUse.length
                        ? logMessage.slice(
                              0,
                              truncateLimit - truncatedTextToUse.length,
                          ) + truncatedTextToUse
                        : logMessage.slice(0, truncateLimit)
            }
        }

        return {
            level: loglevel,
            logger: loggerName,
            message: logMessage,
            serviceName: serviceName,
            timestamp: new Date().toISOString(),
        }
    }

    /**
     * Formats the message. If message contains object or array wrap it in
     * JSON.stringify to avoid these being interpreted as JSON objects.
     * @param {message} string - The original message
     * @returns {string} the formatted message
     */
    formatMessage(message: string): string {
        if (
            message &&
            (message.indexOf('{') === 0 || message.indexOf('[') === 0)
        ) {
            return inspect(message, { depth: 20 })
        }
        return message
    }

    /**
     * Check if the message contains a Timeout information like "4 DEADLINE_EXCEEDED"
     * or "14 UNAVAILABLE"
     * @param {message} string - The original message
     * @returns {boolean} true if the message contains a Timeout information
     */
    containsTimeout(message: string): boolean {
        const messageAsString = inspect(message, { depth: 20 })
        return (
            messageAsString.includes('4 DEADLINE_EXCEEDED') ||
            messageAsString.includes('14 UNAVAILABLE')
        )
    }

    /**
     * Checks if the arguments are part of an incomingRequest message,
     * i.e. the first argument contains the text 'incomingRequest'
     * @param {unknown[]} arguments_ - The log arguments
     * @returns {boolean} true if the message arguments are part of an incomingRequest message
     */
    isIncomingRequestLogMessage(arguments_: unknown[]): boolean {
        return (
            arguments_.length === 1 &&
            typeof arguments_[0] === 'string' &&
            arguments_[0].includes('incomingRequest')
        )
    }

    /**
     * Checks if the log level is equal or higher than the minimum log level
     * @param {LogLevel} logLevel - The log level to check
     * @returns {boolean} true if the log level is equal or higher than the minimum log level
     */
    isEqualOrHigherMinLogLevel(logLevel: LogLevel): boolean {
        const { minLogLevel } = this.loggerOptions
        return minLogLevel === undefined
            ? true
            : logLevelByScope.indexOf(logLevel) >=
                  logLevelByScope.indexOf(minLogLevel)
    }
}
