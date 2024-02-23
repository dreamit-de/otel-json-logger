/* eslint-disable max-len */
import { JsonDiagLogger, LogLevel, loggerConsole } from '@/index'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const logger = new JsonDiagLogger({
    loggerName: 'test-logger',
    serviceName: 'test-service',
})
const testMessage = 'I am a log message!'
const timeoutMessage =
    '{"stack":"Error: 14 UNAVAILABLE: No connection established}'
const circularStructure: unknown[] = [1, 'test']
circularStructure.push(circularStructure)
const complexObject = { one: { two: { three: { message: 'test' } } } }

test.each`
    message                            | logArguments                            | loglevel            | expectedLogMessage                                                                           | expectedLogLevel
    ${undefined}                       | ${undefined}                            | ${LogLevel.verbose} | ${undefined + '. Log arguments are: undefined'}                                              | ${LogLevel.verbose}
    ${testMessage}                     | ${undefined}                            | ${LogLevel.info}    | ${testMessage + '. Log arguments are: undefined'}                                            | ${LogLevel.info}
    ${testMessage}                     | ${1}                                    | ${LogLevel.warn}    | ${testMessage + '. Log arguments are: 1'}                                                    | ${LogLevel.warn}
    ${testMessage}                     | ${[1, 'test']}                          | ${LogLevel.error}   | ${testMessage + ". Log arguments are: [ 1, 'test' ]"}                                        | ${LogLevel.error}
    ${''}                              | ${[]}                                   | ${LogLevel.debug}   | ${'. Log arguments are: []'}                                                                 | ${LogLevel.debug}
    ${'{context: {info:"something"}}'} | ${undefined}                            | ${LogLevel.info}    | ${'\'{context: {info:"something"}}\'. Log arguments are: undefined'}                         | ${LogLevel.info}
    ${'["one", "two"]'}                | ${undefined}                            | ${LogLevel.info}    | ${'\'["one", "two"]\'. Log arguments are: undefined'}                                        | ${LogLevel.info}
    ${testMessage}                     | ${[{ context: { info: 'something' } }]} | ${LogLevel.warn}    | ${testMessage + ". Log arguments are: [ { context: { info: 'something' } } ]"}               | ${LogLevel.warn}
    ${testMessage}                     | ${circularStructure}                    | ${LogLevel.warn}    | ${testMessage + ". Log arguments are: <ref *1> [ 1, 'test', [Circular *1] ]"}                | ${LogLevel.warn}
    ${testMessage}                     | ${complexObject}                        | ${LogLevel.info}    | ${testMessage + ". Log arguments are: {\n  one: { two: { three: { message: 'test' } } }\n}"} | ${LogLevel.info}
    ${JSON.stringify(complexObject)}   | ${[1, 'test']}                          | ${LogLevel.info}    | ${'\'{"one":{"two":{"three":{"message":"test"}}}}\'. Log arguments are: [ 1, \'test\' ]'}    | ${LogLevel.info}
`(
    'expects a correct logEntry is created for given $message , $logArguments and $loglevel ',
    ({
        message,
        logArguments,
        loglevel,
        expectedLogMessage,
        expectedLogLevel,
    }) => {
        const logEntry = logger.createLogEntry({
            message,
            logArguments,
            loglevel,
        })
        expect(logEntry.message).toBe(expectedLogMessage)
        expect(logEntry.level).toBe(expectedLogLevel)
        expect(logEntry.logger).toBe('test-logger')
        expect(logEntry.serviceName).toBe('test-service')
    },
)

test.each`
    message           | truncatedText | truncateLimit | expectedLogMessage
    ${timeoutMessage} | ${undefined}  | ${undefined}  | ${`'${timeoutMessage}'. Log arguments are: []`}
    ${timeoutMessage} | ${undefined}  | ${20}         | ${'\'{"stack"_TRUNCATED_'}
    ${timeoutMessage} | ${'_TRUNC_'}  | ${20}         | ${'\'{"stack":"Er_TRUNC_'}
    ${timeoutMessage} | ${undefined}  | ${2}          | ${"'{"}
    ${timeoutMessage} | ${undefined}  | ${2000}       | ${`'${timeoutMessage}'. Log arguments are: []`}
    ${timeoutMessage} | ${undefined}  | ${73}         | ${`'${timeoutMessage}'. Log arguments are: []`}
    ${timeoutMessage} | ${undefined}  | ${72}         | ${`'${timeoutMessage}'_TRUNCATED_`}
`(
    'expects the log message to be truncated correctly for given $message , $truncatedText and $truncateLimit',
    ({ message, truncatedText, truncateLimit, expectedLogMessage }) => {
        const testLogger = new JsonDiagLogger({
            loggerName: 'test-logger',
            serviceName: 'test-service',
            truncatedText: truncatedText,
            truncateLimit: truncateLimit,
        })
        const logEntry = testLogger.createLogEntry({
            message,
            logArguments: [],
            loglevel: LogLevel.info,
        })
        expect(logEntry.message).toBe(expectedLogMessage)
    },
)

describe('Logger writes expected output to command line', () => {
    beforeEach(() => {
        // Set default options
        logger.setOptions({
            loggerName: 'test-logger',
            serviceName: 'test-service',
        })
        vi.spyOn(loggerConsole, 'log')
        vi.useFakeTimers({ now: new Date('2023-09-06T00:00:00Z') })
    })

    afterEach(() => {
        vi.restoreAllMocks()
        vi.useRealTimers()
    })

    test('Test DiagLogger interface functions', () => {
        // Call each log function once. Should call console.log for all log levels
        logger.debug('test', 1, { name: 'myname' })
        expect(loggerConsole.log).toHaveBeenNthCalledWith(
            1,
            generateExpectedLogMessage('test', 'DEBUG'),
        )
        logger.verbose('test', 1, { name: 'myname' })
        expect(loggerConsole.log).toHaveBeenNthCalledWith(
            2,
            generateExpectedLogMessage('test', 'VERBOSE'),
        )
        logger.info('test', 1, { name: 'myname' })
        expect(loggerConsole.log).toHaveBeenNthCalledWith(
            3,
            generateExpectedLogMessage('test', 'INFO'),
        )
        logger.error('test', 1, { name: 'myname' })
        expect(loggerConsole.log).toHaveBeenNthCalledWith(
            4,
            generateExpectedLogMessage('test', 'ERROR'),
        )
        logger.warn('test', 1, { name: 'myname' })
        expect(loggerConsole.log).toHaveBeenNthCalledWith(
            5,
            generateExpectedLogMessage('test', 'WARN'),
        )
    })

    test('Test Service Request error message logging', () => {
        // Should log service request message on error if option "logLevelForServiceRequestErrorMessages" is not set
        logger.error('Service request', 1, { name: 'myname' })
        expect(loggerConsole.log).toHaveBeenNthCalledWith(
            1,
            generateExpectedLogMessage('Service request', 'ERROR'),
        )

        // Should log service request message on info if option "logLevelForServiceRequestErrorMessages" is set to INFO
        logger.setOptions({
            loggerName: 'test-logger',
            serviceName: 'test-service',
            logLevelForServiceRequestErrorMessages: LogLevel.info,
        })
        logger.error('Service request', 1, { name: 'myname' })
        expect(loggerConsole.log).toHaveBeenNthCalledWith(
            2,
            generateExpectedLogMessage('Service request', 'INFO'),
        )
    })

    test('Test Timeout error message logging', () => {
        // Should log Timeout message on error if option "logLevelForTimeoutErrorMessages" is not set
        logger.error(timeoutMessage, 1, { name: 'myname' })
        expect(loggerConsole.log).toHaveBeenNthCalledWith(
            1,
            generateExpectedTimeoutMessage('ERROR'),
        )

        // Should log Timeout error message on info if option "logLevelForServiceRequestErrorMessages" is set to INFO
        logger.setOptions({
            loggerName: 'test-logger',
            serviceName: 'test-service',
            logLevelForTimeoutErrorMessages: LogLevel.info,
        })
        logger.error(timeoutMessage, 1, { name: 'myname' })
        expect(loggerConsole.log).toHaveBeenNthCalledWith(
            2,
            generateExpectedTimeoutMessage('INFO'),
        )
    })

    test('Test downgrading and ignoring verbose message', () => {
        // Downgrade verbose log entry
        logger.setOptions({
            loggerName: 'test-logger',
            serviceName: 'test-service',
            logLevelForVerbose: LogLevel.debug,
        })
        logger.verbose('test', 1, { name: 'myname' })
        expect(loggerConsole.log).toHaveBeenNthCalledWith(
            1,
            generateExpectedLogMessage('test', 'DEBUG'),
        )

        // Do not log verbose log entry
        logger.setOptions({
            loggerName: 'test-logger',
            serviceName: 'test-service',
            logLevelForVerbose: LogLevel.off,
        })
        logger.verbose('test', 1, { name: 'myname' })
        expect(loggerConsole.log).toHaveBeenCalledTimes(1)
    })

    test('Test downgrading and ignoring error messages', () => {
        // Do not log service request error message
        logger.setOptions({
            loggerName: 'test-logger',
            serviceName: 'test-service',
            logLevelForServiceRequestErrorMessages: LogLevel.off,
        })
        logger.error('Service request', 1, { name: 'myname' })
        expect(loggerConsole.log).toHaveBeenCalledTimes(0)

        // Do not log timeout error message
        logger.setOptions({
            loggerName: 'test-logger',
            serviceName: 'test-service',
            logLevelForTimeoutErrorMessages: LogLevel.off,
        })
        logger.error(timeoutMessage, 1, { name: 'myname' })
        expect(loggerConsole.log).toHaveBeenCalledTimes(0)
    })

    test('Test logging only first incoming message and no other debug messages', () => {
        const incomingMessageLogger = new JsonDiagLogger({
            loggerName: 'test-logger',
            serviceName: 'test-service',
            logFirstIncomingRequest: true,
        })
        // Should not log other debug message
        incomingMessageLogger.debug(testMessage, { name: 'myname' })
        expect(loggerConsole.log).toHaveBeenCalledTimes(0)

        // Should log first incoming request on info level
        incomingMessageLogger.debug('', 'http instrumentation incomingRequest')
        expect(loggerConsole.log).toHaveBeenNthCalledWith(
            1,
            generateExpectedLogMessage('First incoming request', 'INFO', '[]'),
        )

        // Should not log further debug messages
        incomingMessageLogger.debug(testMessage, { name: 'myname' })
        expect(loggerConsole.log).toHaveBeenCalledTimes(1)

        // Should not log other incoming request messages
        incomingMessageLogger.debug('', 'http instrumentation incomingRequest')
        expect(loggerConsole.log).toHaveBeenCalledTimes(1)

        // Should log messages on other loglevels
        incomingMessageLogger.error('test', 1, { name: 'myname' })
        expect(loggerConsole.log).toHaveBeenNthCalledWith(
            2,
            generateExpectedLogMessage('test', 'ERROR'),
        )
    })

    test(
        'Test logging only first incoming message and other debug messages if minLogLevel is ' +
            ' debug or higher',
        () => {
            const incomingMessageLogger = new JsonDiagLogger({
                loggerName: 'test-logger',
                serviceName: 'test-service',
                logFirstIncomingRequest: true,
                minLogLevel: LogLevel.debug,
            })
            // Should log other debug message
            incomingMessageLogger.debug(testMessage, 1, { name: 'myname' })
            expect(loggerConsole.log).toHaveBeenNthCalledWith(
                1,
                generateExpectedLogMessage(testMessage, 'DEBUG'),
            )

            // Should log first incoming request on info level
            incomingMessageLogger.debug(
                '',
                'http instrumentation incomingRequest',
            )
            expect(loggerConsole.log).toHaveBeenNthCalledWith(
                2,
                generateExpectedLogMessage(
                    'First incoming request',
                    'INFO',
                    '[]',
                ),
            )

            // Should log further debug messages
            incomingMessageLogger.debug(testMessage, 1, { name: 'myname' })
            expect(loggerConsole.log).toHaveBeenNthCalledWith(
                3,
                generateExpectedLogMessage(testMessage, 'DEBUG'),
            )

            // Should not log other incoming request messages
            incomingMessageLogger.debug(
                '',
                'http instrumentation incomingRequest',
            )
            expect(loggerConsole.log).toHaveBeenCalledTimes(3)

            // Should log messages on other loglevels
            incomingMessageLogger.error('test', 1, { name: 'myname' })
            expect(loggerConsole.log).toHaveBeenNthCalledWith(
                4,
                generateExpectedLogMessage('test', 'ERROR'),
            )
        },
    )
})

test.each`
    logLevel            | minLogLevel         | expectedResult
    ${LogLevel.debug}   | ${undefined}        | ${true}
    ${LogLevel.error}   | ${undefined}        | ${true}
    ${LogLevel.info}    | ${undefined}        | ${true}
    ${LogLevel.off}     | ${undefined}        | ${true}
    ${LogLevel.verbose} | ${undefined}        | ${true}
    ${LogLevel.warn}    | ${undefined}        | ${true}
    ${LogLevel.debug}   | ${LogLevel.debug}   | ${true}
    ${LogLevel.debug}   | ${LogLevel.error}   | ${false}
    ${LogLevel.debug}   | ${LogLevel.info}    | ${false}
    ${LogLevel.debug}   | ${LogLevel.off}     | ${true}
    ${LogLevel.debug}   | ${LogLevel.verbose} | ${true}
    ${LogLevel.debug}   | ${LogLevel.warn}    | ${false}
    ${LogLevel.error}   | ${LogLevel.debug}   | ${true}
    ${LogLevel.error}   | ${LogLevel.error}   | ${true}
    ${LogLevel.error}   | ${LogLevel.info}    | ${true}
    ${LogLevel.error}   | ${LogLevel.off}     | ${true}
    ${LogLevel.error}   | ${LogLevel.verbose} | ${true}
    ${LogLevel.error}   | ${LogLevel.warn}    | ${true}
    ${LogLevel.info}    | ${LogLevel.debug}   | ${true}
    ${LogLevel.info}    | ${LogLevel.error}   | ${false}
    ${LogLevel.info}    | ${LogLevel.info}    | ${true}
    ${LogLevel.info}    | ${LogLevel.off}     | ${true}
    ${LogLevel.info}    | ${LogLevel.verbose} | ${true}
    ${LogLevel.info}    | ${LogLevel.warn}    | ${false}
    ${LogLevel.off}     | ${LogLevel.debug}   | ${false}
    ${LogLevel.off}     | ${LogLevel.error}   | ${false}
    ${LogLevel.off}     | ${LogLevel.info}    | ${false}
    ${LogLevel.off}     | ${LogLevel.off}     | ${true}
    ${LogLevel.off}     | ${LogLevel.verbose} | ${false}
    ${LogLevel.off}     | ${LogLevel.warn}    | ${false}
    ${LogLevel.verbose} | ${LogLevel.debug}   | ${false}
    ${LogLevel.verbose} | ${LogLevel.error}   | ${false}
    ${LogLevel.verbose} | ${LogLevel.info}    | ${false}
    ${LogLevel.verbose} | ${LogLevel.off}     | ${true}
    ${LogLevel.verbose} | ${LogLevel.verbose} | ${true}
    ${LogLevel.verbose} | ${LogLevel.warn}    | ${false}
    ${LogLevel.warn}    | ${LogLevel.debug}   | ${true}
    ${LogLevel.warn}    | ${LogLevel.error}   | ${false}
    ${LogLevel.warn}    | ${LogLevel.info}    | ${true}
    ${LogLevel.warn}    | ${LogLevel.off}     | ${true}
    ${LogLevel.warn}    | ${LogLevel.verbose} | ${true}
    ${LogLevel.warn}    | ${LogLevel.warn}    | ${true}
`(
    'expects for logLevel $logLevel and minLogLevel $minLogLevel be calculated correctly $expectedResult',
    ({ logLevel, minLogLevel, expectedResult }) => {
        const testLogger = new JsonDiagLogger({
            loggerName: 'test-logger',
            serviceName: 'test-service',
            minLogLevel: minLogLevel,
        })
        expect(testLogger.isEqualOrHigherMinLogLevel(logLevel)).toBe(
            expectedResult,
        )
    },
)

function generateExpectedLogMessage(
    message: string,
    loglevel: string,
    logArguments = "[ 1, { name: 'myname' } ]",
): string {
    return `{"level":"${loglevel}","logger":"test-logger","message":"${message}. Log arguments are: ${logArguments}","serviceName":"test-service","timestamp":"2023-09-06T00:00:00.000Z"}`
}

function generateExpectedTimeoutMessage(loglevel: string): string {
    return `{"level":"${loglevel}","logger":"test-logger","message":"'{\\"stack\\":\\"Error: 14 UNAVAILABLE: No connection established}'. Log arguments are: [ 1, { name: 'myname' } ]","serviceName":"test-service","timestamp":"2023-09-06T00:00:00.000Z"}`
}
