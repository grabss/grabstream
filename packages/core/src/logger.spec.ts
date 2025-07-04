import { Logger, logger } from './logger'

describe('Logger', () => {
  let debugSpy: jest.SpyInstance
  let logSpy: jest.SpyInstance
  let errorSpy: jest.SpyInstance
  let warnSpy: jest.SpyInstance
  let infoSpy: jest.SpyInstance

  beforeEach(() => {
    // Mock console methods
    debugSpy = jest.spyOn(console, 'debug').mockImplementation()
    logSpy = jest.spyOn(console, 'log').mockImplementation()
    errorSpy = jest.spyOn(console, 'error').mockImplementation()
    warnSpy = jest.spyOn(console, 'warn').mockImplementation()
    infoSpy = jest.spyOn(console, 'info').mockImplementation()
  })

  afterEach(() => {
    // Restore console methods
    debugSpy.mockRestore()
    logSpy.mockRestore()
    errorSpy.mockRestore()
    warnSpy.mockRestore()
    infoSpy.mockRestore()
  })

  describe('Logger class', () => {
    it('should create a new Logger instance', () => {
      const testLogger = new Logger()
      expect(testLogger).toBeInstanceOf(Logger)
    })

    it('should log debug messages', () => {
      const testLogger = new Logger()
      testLogger.debug('Debug message')

      expect(debugSpy).toHaveBeenCalledWith(
        '[grabstream] [DEBUG] Debug message'
      )
    })

    it('should log info messages', () => {
      const testLogger = new Logger()
      testLogger.info('Info message')

      expect(infoSpy).toHaveBeenCalledWith('[grabstream] [INFO] Info message')
    })

    it('should log warn messages', () => {
      const testLogger = new Logger()
      testLogger.warn('Warning message')

      expect(warnSpy).toHaveBeenCalledWith(
        '[grabstream] [WARN] Warning message'
      )
    })

    it('should log error messages', () => {
      const testLogger = new Logger()
      testLogger.error('Error message')

      expect(errorSpy).toHaveBeenCalledWith(
        '[grabstream] [ERROR] Error message'
      )
    })

    it('should handle log details object', () => {
      const testLogger = new Logger()
      const details = { key: 'value', count: 42 }

      testLogger.info('Message with details', details)

      expect(infoSpy).toHaveBeenCalledWith(
        '[grabstream] [INFO] Message with details',
        details
      )
    })

    it('should handle undefined details', () => {
      const testLogger = new Logger()

      testLogger.debug('Debug without details')

      expect(debugSpy).toHaveBeenCalledWith(
        '[grabstream] [DEBUG] Debug without details'
      )
    })
  })

  describe('Default logger instance', () => {
    it('should export a default logger instance', () => {
      expect(logger).toBeInstanceOf(Logger)
    })

    it('should work with the default logger instance', () => {
      logger.info('Test with default logger')

      expect(infoSpy).toHaveBeenCalledWith(
        '[grabstream] [INFO] Test with default logger'
      )
    })

    it('should maintain consistent behavior with new instances', () => {
      const customLogger = new Logger()

      logger.warn('Default logger warning')
      customLogger.warn('Custom logger warning')

      expect(warnSpy).toHaveBeenCalledTimes(2)
      expect(warnSpy).toHaveBeenNthCalledWith(
        1,
        '[grabstream] [WARN] Default logger warning'
      )
      expect(warnSpy).toHaveBeenNthCalledWith(
        2,
        '[grabstream] [WARN] Custom logger warning'
      )
    })
  })

  describe('Log levels', () => {
    it('should use appropriate console methods for each level', () => {
      const testLogger = new Logger()

      testLogger.debug('Debug')
      testLogger.info('Info')
      testLogger.warn('Warn')
      testLogger.error('Error')

      expect(debugSpy).toHaveBeenCalledTimes(1)
      expect(infoSpy).toHaveBeenCalledTimes(1)
      expect(warnSpy).toHaveBeenCalledTimes(1)
      expect(errorSpy).toHaveBeenCalledTimes(1)
    })

    it('should format log level labels consistently', () => {
      const testLogger = new Logger()

      testLogger.debug('Test')
      testLogger.info('Test')
      testLogger.warn('Test')
      testLogger.error('Test')

      expect(debugSpy.mock.calls[0][0]).toContain('[DEBUG]')
      expect(infoSpy.mock.calls[0][0]).toContain('[INFO]')
      expect(warnSpy.mock.calls[0][0]).toContain('[WARN]')
      expect(errorSpy.mock.calls[0][0]).toContain('[ERROR]')
    })
  })
})
