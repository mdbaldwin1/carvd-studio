import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('logger', () => {
  beforeEach(() => {
    // Clear module cache to allow re-import with different env
    vi.resetModules();
  });

  afterEach(() => {
    // Restore original console methods
    vi.restoreAllMocks();
  });

  describe('in development mode', () => {
    it('calls console.log for log()', async () => {
      // Set DEV mode
      vi.stubEnv('DEV', true);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const { logger } = await import('./logger');
      logger.log('test message');

      expect(consoleSpy).toHaveBeenCalledWith('test message');
    });

    it('calls console.info for info()', async () => {
      vi.stubEnv('DEV', true);
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      const { logger } = await import('./logger');
      logger.info('info message');

      expect(consoleSpy).toHaveBeenCalledWith('info message');
    });

    it('calls console.debug for debug()', async () => {
      vi.stubEnv('DEV', true);
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

      const { logger } = await import('./logger');
      logger.debug('debug message');

      expect(consoleSpy).toHaveBeenCalledWith('debug message');
    });

    it('calls console.warn for warn()', async () => {
      vi.stubEnv('DEV', true);
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { logger } = await import('./logger');
      logger.warn('warning message');

      expect(consoleSpy).toHaveBeenCalledWith('warning message');
    });

    it('calls console.error for error()', async () => {
      vi.stubEnv('DEV', true);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { logger } = await import('./logger');
      logger.error('error message');

      expect(consoleSpy).toHaveBeenCalledWith('error message');
    });

    it('passes multiple arguments to console methods', async () => {
      vi.stubEnv('DEV', true);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const { logger } = await import('./logger');
      logger.log('message', { data: 1 }, 'extra');

      expect(consoleSpy).toHaveBeenCalledWith('message', { data: 1 }, 'extra');
    });
  });

  describe('in production mode', () => {
    it('suppresses console.log', async () => {
      vi.stubEnv('DEV', false);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const { logger } = await import('./logger');
      logger.log('test message');

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('suppresses console.info', async () => {
      vi.stubEnv('DEV', false);
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      const { logger } = await import('./logger');
      logger.info('info message');

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('suppresses console.debug', async () => {
      vi.stubEnv('DEV', false);
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

      const { logger } = await import('./logger');
      logger.debug('debug message');

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('still calls console.warn', async () => {
      vi.stubEnv('DEV', false);
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { logger } = await import('./logger');
      logger.warn('warning message');

      expect(consoleSpy).toHaveBeenCalledWith('warning message');
    });

    it('still calls console.error', async () => {
      vi.stubEnv('DEV', false);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { logger } = await import('./logger');
      logger.error('error message');

      expect(consoleSpy).toHaveBeenCalledWith('error message');
    });

    it('error passes Error objects through', async () => {
      vi.stubEnv('DEV', false);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Test error');

      const { logger } = await import('./logger');
      logger.error('Something failed:', error);

      expect(consoleSpy).toHaveBeenCalledWith('Something failed:', error);
    });
  });

  describe('named exports', () => {
    it('exports log function', async () => {
      vi.stubEnv('DEV', true);
      const { log } = await import('./logger');

      expect(typeof log).toBe('function');
    });

    it('exports info function', async () => {
      vi.stubEnv('DEV', true);
      const { info } = await import('./logger');

      expect(typeof info).toBe('function');
    });

    it('exports debug function', async () => {
      vi.stubEnv('DEV', true);
      const { debug } = await import('./logger');

      expect(typeof debug).toBe('function');
    });

    it('exports warn function', async () => {
      vi.stubEnv('DEV', true);
      const { warn } = await import('./logger');

      expect(typeof warn).toBe('function');
    });

    it('exports error function', async () => {
      vi.stubEnv('DEV', true);
      const { error } = await import('./logger');

      expect(typeof error).toBe('function');
    });

    it('named exports work the same as logger methods', async () => {
      vi.stubEnv('DEV', true);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const { log } = await import('./logger');
      log('test');

      expect(consoleSpy).toHaveBeenCalledWith('test');
    });
  });
});
