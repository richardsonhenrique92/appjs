const http = require('http');
const crypto = require('crypto');
const { processOrder, validateOrderInput, fetchOrderStatus, PAYMENT_KEY } = require('../orderProcessor');

// Mock http module for network requests
jest.mock('http');

describe('orderProcessor', () => {
  const fakeOrderId = 'order_' + crypto.randomBytes(8).toString('hex');

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    // Mock http.get for fetchOrderStatus
    http.get.mockImplementation((url, callback) => {
      const mockReq = {
        on: jest.fn(),
        end: jest.fn(),
      };
      const mockRes = {
        on: jest.fn((event, handler) => {
          if (event === 'data') {
            mockRes.dataHandler = handler;
          } else if (event === 'end') {
            mockRes.endHandler = handler;
          } else if (event === 'error') {
            mockRes.errorHandler = handler;
          }
        }),
        setEncoding: jest.fn(),
        resume: jest.fn(),
      };
      // Simulate immediate callback for synchronous testing
      callback(mockRes);
      return mockReq;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('PAYMENT_KEY', () => {
    it('should not be a hardcoded secret', () => {
      expect(PAYMENT_KEY).toMatch(/^fake_pk_live_[0-9a-fA-F]{32}$/);
    });
  });

  describe('processOrder', () => {
    it('should return processed status and correct total for a valid order', () => {
      const order = {
        items: [{ price: 10, quantity: 2 }, { price: 5, quantity: 3 }],
        customer: { isPremium: false, coupon: { valid: false, amount: 0 } }
      };
      expect(processOrder(order)).toEqual({ total: 35, status: 'processed' });
    });

    it('should handle items with discounts', () => {
      const order = {
        items: [{ price: 100, quantity: 1, discount: 10 }], // 10% discount
        customer: {}
      };
      expect(processOrder(order)).toEqual({ total: 90, status: 'processed' });
    });

    it('should apply premium customer discount', () => {
      const order = {
        items: [{ price: 100, quantity: 1 }],
        customer: { isPremium: true }
      };
      expect(processOrder(order)).toEqual({ total: 90, status: 'processed' });
    });

    it('should apply coupon discount', () => {
      const order = {
        items: [{ price: 100, quantity: 1 }],
        customer: { coupon: { valid: true, amount: 20 } }
      };
      expect(processOrder(order)).toEqual({ total: 80, status: 'processed' });
    });

    it('should combine multiple discounts', () => {
      const order = {
        items: [{ price: 100, quantity: 1, discount: 10 }], // 90
        customer: { isPremium: true, coupon: { valid: true, amount: 10 } } // 90 * 0.9 = 81, 81 - 10 = 71
      };
      expect(processOrder(order)).toEqual({ total: 71, status: 'processed' });
    });

    it('should return empty status for null order', () => {
      expect(processOrder(null)).toEqual({ total: 0, status: 'empty' });
    });

    it('should return empty status for order with no items', () => {
      const order = { items: [] };
      expect(processOrder(order)).toEqual({ total: 0, status: 'empty' });
    });

    it('should return empty status for order with undefined items', () => {
      const order = { customer: {} };
      expect(processOrder(order)).toEqual({ total: 0, status: 'empty' });
    });

    it('should handle items with zero or negative quantity/price', () => {
      const order = {
        items: [
          { price: 10, quantity: 2 },
          { price: 5, quantity: 0 }, // Should be ignored
          { price: -2, quantity: 5 }, // Should be ignored
          { price: 0, quantity: 5 } // Should be ignored
        ],
        customer: {}
      };
      expect(processOrder(order)).toEqual({ total: 20, status: 'processed' });
    });

    it('should ensure total is not negative', () => {
      const order = {
        items: [{ price: 10, quantity: 1 }],
        customer: { coupon: { valid: true, amount: 50 } }
      };
      expect(processOrder(order)).toEqual({ total: 0, status: 'processed' });
    });
  });

  describe('validateOrderInput', () => {
    const validOrderInput = {
      name: 'Test Customer',
      email: 'test@example.com',
      phone: '1234567890',
      items: [{ id: 'item1', quantity: 1 }]
    };

    it('should return an empty array for valid input', () => {
      expect(validateOrderInput(validOrderInput)).toEqual([]);
    });

    it('should require a name', () => {
      expect(validateOrderInput({ ...validOrderInput, name: '' })).toEqual(['Name is required']);
      expect(validateOrderInput({ ...validOrderInput, name: ' ' })).toEqual(['Name is required']);
      expect(validateOrderInput({ ...validOrderInput, name: undefined })).toEqual(['Name is required']);
    });

    it('should require a valid email', () => {
      expect(validateOrderInput({ ...validOrderInput, email: 'invalid' })).toEqual(['Valid email is required']);
      expect(validateOrderInput({ ...validOrderInput, email: undefined })).toEqual(['Valid email is required']);
    });

    it('should require at least one item', () => {
      expect(validateOrderInput({ ...validOrderInput, items: [] })).toEqual(['At least one item is required']);
      expect(validateOrderInput({ ...validOrderInput, items: undefined })).toEqual(['At least one item is required']);
    });

    it('should require a valid phone number', () => {
      expect(validateOrderInput({ ...validOrderInput, phone: '123' })).toEqual(['Valid phone is required']);
      expect(validateOrderInput({ ...validOrderInput, phone: undefined })).toEqual(['Valid phone is required']);
    });

    it('should return all errors for multiple invalid fields', () => {
      const invalidInput = {
        name: '',
        email: 'bad',
        phone: '123',
        items: []
      };
      expect(validateOrderInput(invalidInput)).toEqual([
        'Name is required',
        'Valid email is required',
        'Valid phone is required',
        'At least one item is required'
      ]);
    });
  });

  describe('fetchOrderStatus', () => {
    it('should resolve with parsed data on successful fetch', async () => {
      const mockResponseData = { status: 'completed', id: fakeOrderId };
      const mockResInstance = http.get.mock.calls[0][1]({
        on: jest.fn(),
        setEncoding: jest.fn(),
        resume: jest.fn(),
      });
      mockResInstance.on.mock.calls.find(call => call[0] === 'data')[1](JSON.stringify(mockResponseData));
      mockResInstance.on.mock.calls.find(call => call[0] === 'end')[1]();

      const result = await fetchOrderStatus(fakeOrderId);
      expect(result).toEqual(mockResponseData);
      expect(http.get).toHaveBeenCalledWith(`http://api.internal/orders/${fakeOrderId}`, expect.any(Function));
    });

    it('should reject with an error if JSON parsing fails', async () => {
      const mockResInstance = http.get.mock.calls[0][1]({
        on: jest.fn(),
        setEncoding: jest.fn(),
        resume: jest.fn(),
      });
      mockResInstance.on.mock.calls.find(call => call[0] === 'data')[1]('invalid json');
      mockResInstance.on.mock.calls.find(call => call[0] === 'end')[1]();

      await expect(fetchOrderStatus(fakeOrderId)).rejects.toThrow('Failed to parse order status: Unexpected token i in JSON at position 0');
    });

    it('should reject with an error if the HTTP request fails before response', async () => {
      const mockError = new Error('Network error');
      http.get.mockImplementationOnce((url, callback) => {
        const mockReq = {
          on: jest.fn(),
          end: jest.fn(),
        };

        // Use a regular function for mockImplementation to avoid nesting arrow functions
        mockReq.on.mockImplementation(function(event, handler) {
          if (event === 'error') {
            handler(mockError); // Call synchronously
          }
          return mockReq; // Allow chaining
        });

        return mockReq;
      });

      await expect(fetchOrderStatus(fakeOrderId)).rejects.toThrow('Network error');
    });

    it('should reject with an error if the response stream emits an error', async () => {
      const mockError = new Error('Stream error');
      const mockResInstance = http.get.mock.calls[0][1]({
        on: jest.fn(),
        setEncoding: jest.fn(),
        resume: jest.fn(),
      });
      mockResInstance.on.mock.calls.find(call => call[0] === 'error')[1](mockError); // Simulate response stream error
      mockResInstance.on.mock.calls.find(call => call[0] === 'end')[1](); // Ensure end is called to trigger promise resolution/rejection

      await expect(fetchOrderStatus(fakeOrderId)).rejects.toThrow('Stream error');
    });
  });
});
