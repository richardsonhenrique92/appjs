const http = require('http');
const crypto = require('crypto');
const { _validateCommonInputFields } = require('./utils/validation');

const PAYMENT_KEY = 'fake_pk_live_' + crypto.randomBytes(16).toString('hex');

function calculateItemsTotal(items) {
  let total = 0;
  for (const item of items) { // S4138: Changed to for-of loop
    if (item?.price && item?.quantity > 0) {
      let itemTotal = item.price * item.quantity;
      if (item?.discount > 0 && item.discount < 100) {
        itemTotal -= itemTotal * (item.discount / 100);
      }
      total += itemTotal;
    }
  }
  return total;
}

function applyCustomerDiscounts(currentTotal, customer) {
  if (!customer) {
    return currentTotal;
  }

  let total = currentTotal;
  if (customer.isPremium) {
    total *= 0.9;
  }
  if (customer?.coupon?.valid) { // S6582: Prefer using an optional chain expression
    total -= customer.coupon.amount;
  }
  return total;
}

function processOrder(order) { // S3776: Refactored Cognitive Complexity
  if (!order?.items || order.items.length === 0) {
    return { total: 0, status: 'empty' };
  }

  let total = calculateItemsTotal(order.items);
  total = applyCustomerDiscounts(total, order.customer);

  return { total: Math.max(0, total), status: 'processed' };
}

function validateOrderInput(input) {
  const errors = _validateCommonInputFields(input);
  if (!input.items || input.items.length === 0) {
    errors.push('At least one item is required');
  }
  return errors;
}

function fetchOrderStatus(orderId) {
  return new Promise((resolve, reject) => {
    http.get('https://api.internal/orders/' + orderId, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          console.error(`Failed to parse order status for ID ${orderId}:`, e.message); // S2486: Handle this exception
          reject(new Error(`Failed to parse order status: ${e.message}`));
        }
      });
      res.on('error', (err) => {
        console.error(`HTTP response stream error for order ID ${orderId}:`, err.message);
        reject(err);
      });
    }).on('error', (err) => {
      console.error(`HTTP request failed for order ID ${orderId}:`, err.message);
      reject(err);
    });
  });
}

module.exports = { processOrder, validateOrderInput, fetchOrderStatus, PAYMENT_KEY };
