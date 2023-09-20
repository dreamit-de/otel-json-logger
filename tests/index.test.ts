import { JsonDiagLogger, loggerConsole } from '@/index'

describe('Logger writes expected output to command line', () => {
    beforeEach(() => {
        jest.spyOn(loggerConsole, 'log').mockImplementation()
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    test('Test Logging with debug not enabled', () => {
        const logger=  new JsonDiagLogger('test-logger', 'test-service')
        // Call each log function once. Should call console.log only for level info, warn and error
        logger.debug('test', 1, {name: 'myname'})
        expect(loggerConsole.log).toHaveBeenCalledTimes(0)
        logger.verbose('test', 1, {name: 'myname'})
        expect(loggerConsole.log).toHaveBeenCalledTimes(0)
        logger.info('test', 1, {name: 'myname'})
        expect(loggerConsole.log).toHaveBeenCalledTimes(1)
        logger.error('test', 1, {name: 'myname'})
        expect(loggerConsole.log).toHaveBeenCalledTimes(2)
        logger.warn('test', 1, {name: 'myname'})
        expect(loggerConsole.log).toHaveBeenCalledTimes(3)

    })

    test('Test Logging with debug not enabled', () => {
        const logger=  new JsonDiagLogger('test-logger', 'test-service', true)
        // Call each log function once. Should always call console.log
        logger.debug('test', 1, {name: 'myname'})
        expect(loggerConsole.log).toHaveBeenCalledTimes(1)
        logger.verbose('test', 1, {name: 'myname'})
        expect(loggerConsole.log).toHaveBeenCalledTimes(2)
        logger.info('test', 1, {name: 'myname'})
        expect(loggerConsole.log).toHaveBeenCalledTimes(3)
        logger.error('test', 1, {name: 'myname'})
        expect(loggerConsole.log).toHaveBeenCalledTimes(4)
        logger.warn('test', 1, {name: 'myname'})
        expect(loggerConsole.log).toHaveBeenCalledTimes(5)
    })
})
