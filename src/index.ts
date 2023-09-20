import {Console} from 'node:console'
import { 
    DiagLogger
} from '@opentelemetry/api'
import { LogEntryInput } from './LogEntryInput'
import { LogLevel } from './LogLevel'
import { LogEntry } from './LogEntry'
import { createLogEntry } from './CreateLogEntry'


export const loggerConsole: Console = new Console(process.stdout, process.stderr, false)

/**
 * Logger implementation that outputs log entries as JSON text to console.
 * Can be useful for log aggregation tools.
 */
export class JsonDiagLogger implements DiagLogger {
    loggerName = 'test'
    debugEnabled = false
    serviceName: string

    /**
     * Creates a new instance of Logger.
     * @param {string} loggerName - The logger name of the logger.
     * Will be output to "logger" field in JSON.
     * @param {string} serviceName - The service name of the logger.
     * Used to identify the service and can be used to differentiate
     * it from other services like in a gateway setup.
     * Will be output to "serviceName" field in JSON.
     * @param {boolean} debugEnabled - If debug output should be enabled
     */
    constructor(loggerName: string, serviceName: string, debugEnabled = false) {
        this.loggerName = loggerName
        this.serviceName = serviceName
        this.debugEnabled = debugEnabled
    }

    debug(message: string, ...arguments_: unknown[]): void {
        if (this.debugEnabled) {
            this.logMessage({
                message, 
                logArguments: arguments_, 
                loglevel: LogLevel.debug,
                serviceName: this.serviceName,
                loggerName: this.loggerName
            })
        }
    }

    error(message: string, ...arguments_: unknown[]): void {
        this.logMessage({
            message, 
            logArguments: arguments_, 
            loglevel: LogLevel.error,
            serviceName: this.serviceName,
            loggerName: this.loggerName
        })}

    info(message: string, ...arguments_: unknown[]): void {
        this.logMessage({
            message, 
            logArguments: arguments_, 
            loglevel: LogLevel.info,
            serviceName: this.serviceName,
            loggerName: this.loggerName
        })
    }

    warn(message: string, ...arguments_: unknown[]): void {
        this.logMessage({
            message, 
            logArguments: arguments_, 
            loglevel: LogLevel.warn,
            serviceName: this.serviceName,
            loggerName: this.loggerName
        })
    }

    verbose(message: string, ...arguments_: unknown[]): void {
        if (this.debugEnabled) {
            this.logMessage({
                message, 
                logArguments: arguments_, 
                loglevel: LogLevel.verbose,
                serviceName: this.serviceName,
                loggerName: this.loggerName
            })
        }
    }

    logMessage(logEntryInput: LogEntryInput): void {
        const {
            message,
            logArguments,
            loglevel,
            loggerName,
            serviceName
        } = logEntryInput

        const logEntry: LogEntry = createLogEntry({
            message,
            logArguments,
            loggerName: loggerName,
            loglevel,
            serviceName: serviceName,
        })
        loggerConsole.log(JSON.stringify(logEntry))
    }
}
