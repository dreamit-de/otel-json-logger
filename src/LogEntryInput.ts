import { LogLevel } from './LogLevel'

export interface LogEntryInput {
    message: string,
    logArguments: unknown[],
    loglevel: LogLevel,
    loggerName: string,
    serviceName: string,
}
