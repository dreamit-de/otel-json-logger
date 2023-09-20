/* eslint-disable max-len */

import { createLogEntry } from '@/CreateLogEntry'
import { LogLevel } from '@/LogLevel'

const testMessage = 'I am a log message!'

test.each`
    message        | logArguments   | loglevel            | expectedLogMessage                                 | expectedLogLevel 
    ${undefined}   | ${undefined}   | ${LogLevel.verbose} | ${undefined + '. Log arguments are: undefined'}    | ${LogLevel.verbose}
    ${testMessage} | ${undefined}   | ${LogLevel.info}    | ${testMessage + '. Log arguments are: undefined'}  | ${LogLevel.info}
    ${testMessage} | ${1}           | ${LogLevel.warn}    | ${testMessage + '. Log arguments are: 1'}          | ${LogLevel.warn}
    ${testMessage} | ${[1, 'test']} | ${LogLevel.error}   | ${testMessage + '. Log arguments are: [1,"test"]'} | ${LogLevel.error}
    ${''} | ${[]}          | ${LogLevel.debug}   | ${'. Log arguments are: []'}         | ${LogLevel.debug}
    `('expects a correct logEntry is created for given $message , $logArguments and $loglevel ', ({message, logArguments, loglevel, expectedLogMessage, expectedLogLevel}) => {
    const logEntry = createLogEntry({
        message,
        logArguments,
        loggerName: 'test-logger',
        loglevel,
        serviceName: 'myTestService'
    })
    expect(logEntry.message).toBe(expectedLogMessage)
    expect(logEntry.level).toBe(expectedLogLevel)
    expect(logEntry.logger).toBe('test-logger')
    expect(logEntry.serviceName).toBe('myTestService')

})
