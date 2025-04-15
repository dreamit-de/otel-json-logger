import type { DiagLogger } from '@opentelemetry/api'
import { Console } from 'node:console'
import { inspect } from 'node:util'

const loggerConsole: Console = new Console(
    process.stdout,
    process.stderr,
    false,
)

type LogLevel = 'DEBUG' | 'ERROR' | 'INFO' | 'OFF' | 'VERBOSE' | 'WARN'

// eslint-disable-next-line @typescript-eslint/array-type
const logLevelByScope: Array<LogLevel | undefined> = [
    undefined,
    'OFF',
    'VERBOSE',
    'DEBUG',
    'INFO',
    'WARN',
    'ERROR',
]

interface LogEntry {
    logger: string
    timestamp: string
    message: string
    level: LogLevel
    serviceName: string
}

interface LogEntryInput {
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
 * @param {LogLevel} logLevelForAsyncAttributeError - The log level to use
 * for the message "Accessing resource attributes before async attributes settled".
 * These errors might not be relevant enough to log them on error level.
 * @param {LogLevel} logLevelForRegisterGlobalMessages - The log level to use
 * for messages "... Registered a global ...". These are helpful to check if OTEL is running properly
 * but are logged on debug level by default. Increase this log level to see these messages.
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
interface LoggerOptions {
    loggerName: string
    serviceName: string
    logFirstIncomingRequest?: boolean
    logLevelForAsyncAttributeError?: LogLevel
    logLevelForRegisterGlobalMessages?: LogLevel
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
class JsonDiagLogger implements DiagLogger {
    loggerOptions: LoggerOptions
    firstIncomingRequestLogged = false

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
        if (
            this.loggerOptions.logLevelForRegisterGlobalMessages &&
            message.includes('Registered a global')
        ) {
            this.logMessage({
                logArguments: arguments_,
                loglevel: this.loggerOptions.logLevelForRegisterGlobalMessages,
                message,
            })
        } else if (this.loggerOptions.logFirstIncomingRequest) {
            if (
                !this.firstIncomingRequestLogged &&
                this.isIncomingRequestLogMessage(arguments_)
            ) {
                this.logMessage({
                    logArguments: [],
                    loglevel: 'INFO',
                    message: 'First incoming request',
                })
                this.firstIncomingRequestLogged = true
            } else if (
                this.loggerOptions.minLogLevel &&
                this.isEqualOrHigherMinLogLevel(
                    this.loggerOptions.minLogLevel,
                ) &&
                !this.isIncomingRequestLogMessage(arguments_)
            ) {
                this.logMessage({
                    logArguments: arguments_,
                    loglevel: 'DEBUG',
                    message,
                })
            }
        } else {
            this.logMessage({
                logArguments: arguments_,
                loglevel: 'DEBUG',
                message,
            })
        }
    }

    error(message: string, ...arguments_: unknown[]): void {
        let logLevel: LogLevel
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
        } else if (
            this.loggerOptions.logLevelForAsyncAttributeError &&
            this.containsAsyncAttributeError(message)
        ) {
            logLevel = this.loggerOptions.logLevelForAsyncAttributeError
        } else {
            logLevel = 'ERROR'
        }

        this.logMessage({
            logArguments: arguments_,
            loglevel: logLevel,
            message,
        })
    }

    info(message: string, ...arguments_: unknown[]): void {
        this.logMessage({
            logArguments: arguments_,
            loglevel: 'INFO',
            message,
        })
    }

    verbose(message: string, ...arguments_: unknown[]): void {
        this.logMessage({
            logArguments: arguments_,
            loglevel: this.loggerOptions.logLevelForVerbose ?? 'VERBOSE',
            message,
        })
    }

    warn(message: string, ...arguments_: unknown[]): void {
        this.logMessage({
            logArguments: arguments_,
            loglevel: 'WARN',
            message,
        })
    }

    logMessage(logEntryInput: LogEntryInput): void {
        if (
            logEntryInput.loglevel !== 'OFF' &&
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
        const truncatedTextToUse = truncatedText ?? '_TRUNCATED_'
        if (
            truncateLimit &&
            // Stryker disable next-line all - Does not matters
            truncateLimit > 0 &&
            logMessage.length > truncateLimit + truncatedTextToUse.length
        ) {
            logMessage =
                truncateLimit > truncatedTextToUse.length
                    ? logMessage.slice(
                          0,
                          truncateLimit - truncatedTextToUse.length,
                      ) + truncatedTextToUse
                    : logMessage.slice(0, truncateLimit)
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
     * single quotes to avoid these being interpreted as JSON objects.
     * @param {message} string - The original message
     * @returns {string} the formatted message
     */
    formatMessage(message: string): string {
        if (
            message &&
            (message.indexOf('{') === 0 || message.indexOf('[') === 0)
        ) {
            return `'${message}'`
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
        return (
            message.includes('4 DEADLINE_EXCEEDED') ||
            message.includes('14 UNAVAILABLE')
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
        return (
            logLevelByScope.indexOf(logLevel) >=
            logLevelByScope.indexOf(minLogLevel)
        )
    }

    /**
     * Check if the message contains an async attribute error
     * like "Accessing resource attributes before async attributes settled"
     * @param {message} string - The original message
     * @returns {boolean} true if the message contains an async attribute error
     */
    containsAsyncAttributeError(message: string): boolean {
        return message.includes('before async attributes settled')
    }
}

export { JsonDiagLogger, loggerConsole }

export type { LogEntry, LogEntryInput, LoggerOptions, LogLevel }
