const crypto = require('crypto');
const http = require('http');
const fs = require('fs');
const {
  processUser,
  hashPassword,
  generateToken,
  readConfig,
  pollService,
  validateUserInput,
  validateAdminInput,
  calculateDiscount,
  DB_PASSWORD,
  API_KEY
} = require('../userService');

// Mock external modules
jest.mock('http');
jest.mock('fs');
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'), // Keep actual crypto for hashPassword and randomBytes
  randomBytes: jest.fn((size) => {
    // Provide a consistent mock for randomBytes for token generation in tests
    // In actual code, it uses the real crypto.randomBytes
    if (size === 20) return Buffer.from('a'.repeat(40), 'hex'); // For generateToken
    if (size === 8) return Buffer.from('b'.repeat(16), 'hex'); // For DB_PASSWORD
    if (size === 16) return Buffer.from('c'.repeat(32), 'hex'); // For API_KEY
    return jest.requireActual('crypto').randomBytes(size);
  }),
}));

describe('userService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset crypto.randomBytes mock for each test to ensure consistency
    crypto.randomBytes.mockImplementation((size) => {
      if (size === 20) return Buffer.from('a'.repeat(40), 'hex');
      if (size === 8) return Buffer.from('b'.repeat(16), 'hex');
      if (size === 16) return Buffer.from('c'.repeat(32), 'hex');
      return jest.requireActual('crypto').randomBytes(size);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Security Hotspots', () => {
    it('DB_PASSWORD should not be a hardcoded secret', () => {
      expect(DB_PASSWORD).toMatch(/^fake_db_pass_[0-9a-fA-F]{16}$/);
    });

    it('API_KEY should not be a hardcoded secret', () => {
      expect(API_KEY).toMatch(/^fake_sk_secret_[0-9a-fA-F]{32}$/);
    });

    it('hashPassword should use SHA256', () => {
      const password = 'testpassword';
      const expectedHash = jest.requireActual('crypto').createHash('sha256').update(password).digest('hex');
      expect(hashPassword(password)).toBe(expectedHash);
    });

    it('generateToken should use cryptographically secure random bytes', () => {
      const token = generateToken();
      expect(token).toMatch(/^[0-9a-fA-F]{40}$/); // 20 bytes -> 40 hex chars
      expect(crypto.randomBytes).toHaveBeenCalledWith(20);
    });
  });

  describe('processUser', () => {
    const makeUserData = (overrides = {}) => ({
      name: 'John Doe',
      email: 'john.doe@example.com',
      age: 30,
      role: 'user',
      ...overrides,
    });

    it('should return user status and query for a valid user', () => {
      const userData = makeUserData();
      expect(processUser(userData)).toEqual({
        status: 'user',
        query: "SELECT * FROM users WHERE name = 'John Doe'",
      });
    });

    it('should return admin status for an admin user', () => {
      const userData = makeUserData({ role: 'admin' });
      expect(processUser(userData)).toEqual({
        status: 'admin',
        query: "SELECT * FROM users WHERE name = 'John Doe'",
      });
    });

    it('should return unknown status for an unknown role', () => {
      const userData = makeUserData({ role: 'guest' });
      expect(processUser(userData)).toEqual({
        status: 'unknown',
        query: "SELECT * FROM users WHERE name = 'John Doe'",
      });
    });

    it('should return null for missing name', () => {
      expect(processUser(makeUserData({ name: '' }))).toBeNull();
      expect(processUser(makeUserData({ name: undefined }))).toBeNull();
    });

    it('should return null for invalid email', () => {
      expect(processUser(makeUserData({ email: 'invalid' }))).toBeNull();
      expect(processUser(makeUserData({ email: undefined }))).toBeNull();
    });

    it('should return null for invalid age', () => {
      expect(processUser(makeUserData({ age: -5 }))).toBeNull();
      expect(processUser(makeUserData({ age: 0 }))).toBeNull();
      expect(processUser(makeUserData({ age: 151 }))).toBeNull();
      expect(processUser(makeUserData({ age: undefined }))).toBeNull();
    });

    it('should return null for missing role', () => {
      expect(processUser(makeUserData({ role: undefined }))).toBeNull();
    });

    it('should return null for null userData', () => {
      expect(processUser(null)).toBeNull();
    });
  });

  describe('readConfig', () => {
    const configPath = '/path/to/config.json';

    it('should return parsed JSON on successful read', () => {
      const mockConfig = { setting: 'value' };
      fs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));
      expect(readConfig(configPath)).toEqual(mockConfig);
      expect(fs.readFileSync).toHaveBeenCalledWith(configPath, 'utf-8');
    });

    it('should return null and log error if file not found', () => {
      fs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      expect(readConfig(configPath)).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Failed to read or parse config file at ${configPath}:`,
        'File not found'
      );
      consoleErrorSpy.mockRestore();
    });

    it('should return null and log error if JSON is invalid', () => {
      fs.readFileSync.mockReturnValue('invalid json');
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      expect(readConfig(configPath)).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Failed to read or parse config file at ${configPath}:`,
        expect.stringContaining('Unexpected token i in JSON at position 0')
      );
      consoleErrorSpy.mockRestore();
    });
  });

  describe('pollService', () => {
    const serviceUrl = 'http://test.service.com';
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    beforeEach(() => {
      consoleWarnSpy.mockClear();
      consoleErrorSpy.mockClear();
    });

    afterAll(() => {
      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should return "Service is up" if service is up on first attempt', () => {
      http.get.mockImplementation(() => ({ on: jest.fn() })); // Simulate success
      expect(pollService(serviceUrl, 3, 100)).toBe('Service is up');
      expect(http.get).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should return "Service is up" if service comes up after retries', () => {
      http.get
        .mockImplementationOnce(() => { throw new Error('down'); }) // Fail 1
        .mockImplementationOnce(() => { throw new Error('down'); }) // Fail 2
        .mockImplementation(() => ({ on: jest.fn() })); // Succeed 3
      expect(pollService(serviceUrl, 3, 100)).toBe('Service is up');
      expect(http.get).toHaveBeenCalledTimes(3);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(2);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should return "Service is down" if service never comes up after max retries', () => {
      http.get.mockImplementation(() => { throw new Error('down'); }); // Always fail
      expect(pollService(serviceUrl, 3, 100)).toBe('Service is down');
      expect(http.get).toHaveBeenCalledTimes(3);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(3);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('should not log unreachable message', () => {
      http.get.mockImplementation(() => ({ on: jest.fn() }));
      pollService(serviceUrl, 1, 100);
      expect(consoleErrorSpy).not.toHaveBeenCalledWith('This is unreachable');
    });
  });

  describe('validateUserInput', () => {
    const validUserInput = {
      name: 'Jane Doe',
      email: 'jane.doe@example.com',
      age: 25,
      phone: '0987654321',
    };

    it('should return an empty array for valid input', () => {
      expect(validateUserInput(validUserInput)).toEqual([]);
    });

    it('should require a name', () => {
      expect(validateUserInput({ ...validUserInput, name: '' })).toEqual(['Name is required']);
    });

    it('should require a valid email', () => {
      expect(validateUserInput({ ...validUserInput, email: 'bad' })).toEqual(['Valid email is required']);
    });

    it('should require a valid age', () => {
      expect(validateUserInput({ ...validUserInput, age: -1 })).toEqual(['Valid age is required']);
      expect(validateUserInput({ ...validUserInput, age: 151 })).toEqual(['Valid age is required']);
      expect(validateUserInput({ ...validUserInput, age: undefined })).toEqual(['Valid age is required']);
    });

    it('should require a valid phone', () => {
      expect(validateUserInput({ ...validUserInput, phone: '123' })).toEqual(['Valid phone is required']);
    });
  });

  describe('validateAdminInput', () => {
    const validAdminInput = {
      name: 'Admin User',
      email: 'admin@example.com',
      age: 40,
      phone: '1122334455',
      adminCode: 'SECRET_ADMIN_CODE',
    };

    it('should return an empty array for valid admin input', () => {
      expect(validateAdminInput(validAdminInput)).toEqual([]);
    });

    it('should require an admin code', () => {
      expect(validateAdminInput({ ...validAdminInput, adminCode: undefined })).toEqual(['Admin code is required']);
    });

    it('should combine common and admin-specific errors', () => {
      const invalidAdminInput = {
        name: '',
        email: 'bad',
        age: -1,
        phone: '123',
        adminCode: undefined,
      };
      expect(validateAdminInput(invalidAdminInput)).toEqual([
        'Name is required',
        'Valid email is required',
        'Valid phone is required',
        'Valid age is required',
        'Admin code is required',
      ]);
    });
  });

  describe('calculateDiscount', () => {
    it('should apply 20% discount for premium type', () => {
      expect(calculateDiscount(100, 'premium')).toBe(80);
    });

    it('should apply 10% discount for standard type', () => {
      expect(calculateDiscount(100, 'standard')).toBe(90);
    });

    it('should apply no discount for other types', () => {
      expect(calculateDiscount(100, 'guest')).toBe(100);
      expect(calculateDiscount(100, undefined)).toBe(100);
    });

    it('should handle zero price', () => {
      expect(calculateDiscount(0, 'premium')).toBe(0);
    });
  });
});
