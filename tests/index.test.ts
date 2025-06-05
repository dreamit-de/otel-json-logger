/* eslint-disable max-len */
import { JsonDiagLogger, loggerConsole } from '@/index'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const logger = new JsonDiagLogger({
    loggerName: 'test-logger',
    serviceName: 'test-service',
})
const testMessage = 'I am a log message!'
const timeoutMessage =
    '{"stack":"Error: 14 UNAVAILABLE: No connection established}'
const asyncAttributeErrorMessage =
    'Accessing resource attributes before async attributes settled'
const circularStructure: unknown[] = [1, 'test']
circularStructure.push(circularStructure)
const complexObject = { one: { two: { three: { message: 'test' } } } }

test.each`
    message                            | logArguments                            | loglevel     | expectedLogMessage                                                                           | expectedLogLevel
    ${undefined}                       | ${undefined}                            | ${'VERBOSE'} | ${undefined + '. Log arguments are: undefined'}                                              | ${'VERBOSE'}
    ${testMessage}                     | ${undefined}                            | ${'INFO'}    | ${testMessage + '. Log arguments are: undefined'}                                            | ${'INFO'}
    ${testMessage}                     | ${1}                                    | ${'WARN'}    | ${testMessage + '. Log arguments are: 1'}                                                    | ${'WARN'}
    ${testMessage}                     | ${[1, 'test']}                          | ${'ERROR'}   | ${testMessage + ". Log arguments are: [ 1, 'test' ]"}                                        | ${'ERROR'}
    ${''}                              | ${[]}                                   | ${'DEBUG'}   | ${'. Log arguments are: []'}                                                                 | ${'DEBUG'}
    ${'{context: {info:"something"}}'} | ${undefined}                            | ${'INFO'}    | ${'\'{context: {info:"something"}}\'. Log arguments are: undefined'}                         | ${'INFO'}
    ${'["one", "two"]'}                | ${undefined}                            | ${'INFO'}    | ${'\'["one", "two"]\'. Log arguments are: undefined'}                                        | ${'INFO'}
    ${testMessage}                     | ${[{ context: { info: 'something' } }]} | ${'WARN'}    | ${testMessage + ". Log arguments are: [ { context: { info: 'something' } } ]"}               | ${'WARN'}
    ${testMessage}                     | ${circularStructure}                    | ${'WARN'}    | ${testMessage + ". Log arguments are: <ref *1> [ 1, 'test', [Circular *1] ]"}                | ${'WARN'}
    ${testMessage}                     | ${complexObject}                        | ${'INFO'}    | ${testMessage + ". Log arguments are: {\n  one: { two: { three: { message: 'test' } } }\n}"} | ${'INFO'}
    ${JSON.stringify(complexObject)}   | ${[1, 'test']}                          | ${'INFO'}    | ${'\'{"one":{"two":{"three":{"message":"test"}}}}\'. Log arguments are: [ 1, \'test\' ]'}    | ${'INFO'}
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
            logArguments,
            loglevel,
            message,
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
    ${timeoutMessage} | ${undefined}  | ${0}          | ${`'${timeoutMessage}'. Log arguments are: []`}
    ${timeoutMessage} | ${undefined}  | ${-2}         | ${`'${timeoutMessage}'. Log arguments are: []`}
    ${timeoutMessage} | ${'_TRUNC_'}  | ${7}          | ${'\'{"stac'}
`(
    'expects the log message to be truncated correctly for given $message , $truncatedText and $truncateLimit',
    ({ message, truncatedText, truncateLimit, expectedLogMessage }) => {
        const testLogger = new JsonDiagLogger({
            loggerName: 'test-logger',
            serviceName: 'test-service',
            truncateLimit: truncateLimit,
            truncatedText: truncatedText,
        })
        const logEntry = testLogger.createLogEntry({
            logArguments: [],
            loglevel: 'INFO',
            message,
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
            logLevelForServiceRequestErrorMessages: 'INFO',
            loggerName: 'test-logger',
            serviceName: 'test-service',
        })
        logger.error('Service request', 1, { name: 'myname' })
        expect(loggerConsole.log).toHaveBeenNthCalledWith(
            2,
            generateExpectedLogMessage('Service request', 'INFO'),
        )

        // Should not set log level for other messages to info
        logger.error(testMessage, 1, { name: 'myname' })
        expect(loggerConsole.log).toHaveBeenNthCalledWith(
            3,
            generateExpectedLogMessage(testMessage, 'ERROR'),
        )
    })

    test.each([
        '14 UNAVAILABLE',
        '4 DEADLINE_EXCEEDED',
        'ECONNREFUSED',
        'EPERM',
        'Timeout',
    ])(
        'Test Timeout error message logging for message containing "%s"',
        (message: string) => {
            // Should log Timeout message on error if option "logLevelForTimeoutErrorMessages" is not set
            const messageToLog = `{"stack":"Error: ${message}: Does not matter!}`
            logger.error(messageToLog, 1, { name: 'myname' })
            expect(loggerConsole.log).toHaveBeenNthCalledWith(
                1,
                generateExpectedTimeoutMessage('ERROR', message),
            )

            // Should log Timeout error message on info if option "logLevelForServiceRequestErrorMessages" is set to INFO
            logger.setOptions({
                logLevelForTimeoutErrorMessages: 'INFO',
                loggerName: 'test-logger',
                serviceName: 'test-service',
            })
            logger.error(messageToLog, 1, { name: 'myname' })
            expect(loggerConsole.log).toHaveBeenNthCalledWith(
                2,
                generateExpectedTimeoutMessage('INFO', message),
            )

            // Should not set log level for other messages to info
            logger.error(testMessage, 1, { name: 'myname' })
            expect(loggerConsole.log).toHaveBeenNthCalledWith(
                3,
                generateExpectedLogMessage(testMessage, 'ERROR'),
            )
        },
    )

    test('Test async attribute error message logging', () => {
        // Should log async attribute error message on error if option "logLevelForAsyncAttributeError" is not set
        logger.error(asyncAttributeErrorMessage, 1, { name: 'myname' })
        expect(loggerConsole.log).toHaveBeenNthCalledWith(
            1,
            generateExpectedLogMessage(asyncAttributeErrorMessage, 'ERROR'),
        )

        // Should log async attribute error error message on info if option "logLevelForAsyncAttributeError" is set to INFO
        logger.setOptions({
            logLevelForAsyncAttributeError: 'INFO',
            loggerName: 'test-logger',
            serviceName: 'test-service',
        })
        logger.error(asyncAttributeErrorMessage, 1, { name: 'myname' })
        expect(loggerConsole.log).toHaveBeenNthCalledWith(
            2,
            generateExpectedLogMessage(asyncAttributeErrorMessage, 'INFO'),
        )

        // Should not change log level for other messages to info
        logger.error(testMessage, 1, { name: 'myname' })
        expect(loggerConsole.log).toHaveBeenNthCalledWith(
            3,
            generateExpectedLogMessage(testMessage, 'ERROR'),
        )
    })

    test('Test downgrading and ignoring verbose message', () => {
        // Downgrade verbose log entry
        logger.setOptions({
            logLevelForVerbose: 'DEBUG',
            loggerName: 'test-logger',
            serviceName: 'test-service',
        })
        logger.verbose('test', 1, { name: 'myname' })
        expect(loggerConsole.log).toHaveBeenNthCalledWith(
            1,
            generateExpectedLogMessage('test', 'DEBUG'),
        )

        // Do not log verbose log entry
        logger.setOptions({
            logLevelForVerbose: 'OFF',
            loggerName: 'test-logger',
            serviceName: 'test-service',
        })
        logger.verbose('test', 1, { name: 'myname' })
        expect(loggerConsole.log).toHaveBeenCalledTimes(1)
    })

    test('Test downgrading and ignoring error messages', () => {
        // Do not log service request error message
        logger.setOptions({
            logLevelForServiceRequestErrorMessages: 'OFF',
            loggerName: 'test-logger',
            serviceName: 'test-service',
        })
        logger.error('Service request', 1, { name: 'myname' })
        expect(loggerConsole.log).toHaveBeenCalledTimes(0)

        // Do not log timeout error message
        logger.setOptions({
            logLevelForTimeoutErrorMessages: 'OFF',
            loggerName: 'test-logger',
            serviceName: 'test-service',
        })
        logger.error(timeoutMessage, 1, { name: 'myname' })
        expect(loggerConsole.log).toHaveBeenCalledTimes(0)
    })

    test('Test logging only first incoming message and no other debug messages', () => {
        const incomingMessageLogger = new JsonDiagLogger({
            logFirstIncomingRequest: true,
            loggerName: 'test-logger',
            serviceName: 'test-service',
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

        // Message without "incomingRequest" is not considered an incoming request
        expect(logger.isIncomingRequestLogMessage(['Not i request'])).toBe(
            false,
        )
    })

    test(
        'Test logging only first incoming message and other debug messages if minLogLevel is ' +
            ' debug or higher',
        () => {
            const incomingMessageLogger = new JsonDiagLogger({
                logFirstIncomingRequest: true,
                loggerName: 'test-logger',
                minLogLevel: 'VERBOSE',
                serviceName: 'test-service',
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

    test('Test logging registered global message on info level', () => {
        const messageLogger = new JsonDiagLogger({
            logLevelForRegisterGlobalMessages: 'INFO',
            loggerName: 'test-logger',
            serviceName: 'test-service',
        })
        // Should log message on info level
        const registeredGlobalMessage =
            '@opentelemetry/api: Registered a global for propagation v1.7.0.'
        messageLogger.debug(registeredGlobalMessage, 1, { name: 'myname' })
        expect(loggerConsole.log).toHaveBeenNthCalledWith(
            1,
            generateExpectedLogMessage(registeredGlobalMessage, 'INFO'),
        )

        // Should log message on debug level if it does not contain registered global message
        messageLogger.debug(testMessage, 1, { name: 'myname' })
        expect(loggerConsole.log).toHaveBeenNthCalledWith(
            2,
            generateExpectedLogMessage(testMessage, 'DEBUG'),
        )
    })
})

test.each`
    logLevel     | minLogLevel  | expectedResult
    ${'DEBUG'}   | ${undefined} | ${true}
    ${'ERROR'}   | ${undefined} | ${true}
    ${'INFO'}    | ${undefined} | ${true}
    ${'OFF'}     | ${undefined} | ${true}
    ${'VERBOSE'} | ${undefined} | ${true}
    ${'WARN'}    | ${undefined} | ${true}
    ${'DEBUG'}   | ${'DEBUG'}   | ${true}
    ${'DEBUG'}   | ${'ERROR'}   | ${false}
    ${'DEBUG'}   | ${'INFO'}    | ${false}
    ${'DEBUG'}   | ${'OFF'}     | ${true}
    ${'DEBUG'}   | ${'VERBOSE'} | ${true}
    ${'DEBUG'}   | ${'WARN'}    | ${false}
    ${'ERROR'}   | ${'DEBUG'}   | ${true}
    ${'ERROR'}   | ${'ERROR'}   | ${true}
    ${'ERROR'}   | ${'INFO'}    | ${true}
    ${'ERROR'}   | ${'OFF'}     | ${true}
    ${'ERROR'}   | ${'VERBOSE'} | ${true}
    ${'ERROR'}   | ${'WARN'}    | ${true}
    ${'INFO'}    | ${'DEBUG'}   | ${true}
    ${'INFO'}    | ${'ERROR'}   | ${false}
    ${'INFO'}    | ${'INFO'}    | ${true}
    ${'INFO'}    | ${'OFF'}     | ${true}
    ${'INFO'}    | ${'VERBOSE'} | ${true}
    ${'INFO'}    | ${'WARN'}    | ${false}
    ${'OFF'}     | ${'DEBUG'}   | ${false}
    ${'OFF'}     | ${'ERROR'}   | ${false}
    ${'OFF'}     | ${'INFO'}    | ${false}
    ${'OFF'}     | ${'OFF'}     | ${true}
    ${'OFF'}     | ${'VERBOSE'} | ${false}
    ${'OFF'}     | ${'WARN'}    | ${false}
    ${'VERBOSE'} | ${'DEBUG'}   | ${false}
    ${'VERBOSE'} | ${'ERROR'}   | ${false}
    ${'VERBOSE'} | ${'INFO'}    | ${false}
    ${'VERBOSE'} | ${'OFF'}     | ${true}
    ${'VERBOSE'} | ${'VERBOSE'} | ${true}
    ${'VERBOSE'} | ${'WARN'}    | ${false}
    ${'WARN'}    | ${'DEBUG'}   | ${true}
    ${'WARN'}    | ${'ERROR'}   | ${false}
    ${'WARN'}    | ${'INFO'}    | ${true}
    ${'WARN'}    | ${'OFF'}     | ${true}
    ${'WARN'}    | ${'VERBOSE'} | ${true}
    ${'WARN'}    | ${'WARN'}    | ${true}
`(
    'expects for logLevel $logLevel and minLogLevel $minLogLevel be calculated correctly $expectedResult',
    ({ logLevel, minLogLevel, expectedResult }) => {
        const testLogger = new JsonDiagLogger({
            loggerName: 'test-logger',
            minLogLevel: minLogLevel,
            serviceName: 'test-service',
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

function generateExpectedTimeoutMessage(
    loglevel: string,
    message: string,
): string {
    return `{"level":"${loglevel}","logger":"test-logger","message":"'{\\"stack\\":\\"Error: ${message}: Does not matter!}'. Log arguments are: [ 1, { name: 'myname' } ]","serviceName":"test-service","timestamp":"2023-09-06T00:00:00.000Z"}`
}
