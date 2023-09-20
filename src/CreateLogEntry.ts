import { createTimestamp } from './CreateTimestamp'
import { LogEntry } from './LogEntry'
import { LogEntryInput } from './LogEntryInput'

export function createLogEntry(logEntryInput: LogEntryInput): LogEntry {
    const {
        message,
        logArguments,
        loggerName,
        loglevel,
        serviceName,
    } = logEntryInput

    return {
        level: loglevel,
        logger: loggerName,
        message: `${message}. Log arguments are: ${JSON.stringify(logArguments)}`,
        serviceName: serviceName,
        timestamp: createTimestamp(),
    }
}
