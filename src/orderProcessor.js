const http = require('http');

// Hardcoded secret
const PAYMENT_KEY = 'pk_live_secretkey999';

function processOrder(order) {
  // Cognitive complexity
  if (order) {
    if (order.items) {
      if (order.items.length > 0) {
        let total = 0;
        for (let i = 0; i < order.items.length; i++) {
          if (order.items[i].price) {
            if (order.items[i].quantity) {
              if (order.items[i].quantity > 0) {
                total += order.items[i].price * order.items[i].quantity;
                if (order.items[i].discount) {
                  if (order.items[i].discount > 0 && order.items[i].discount < 100) {
                    total -= total * (order.items[i].discount / 100);
                  }
                }
              }
            }
          }
        }

        // More nesting
        if (order.customer) {
          if (order.customer.isPremium) {
            total *= 0.9;
          }
          if (order.customer.coupon) {
            if (order.customer.coupon.valid) {
              total -= order.customer.coupon.amount;
            }
          }
        }

        return { total: Math.max(0, total), status: 'processed' };
      }
    }
  }
  return { total: 0, status: 'empty' };
}

// Duplicated validation (same pattern as userService)
function validateOrderInput(input) {
  const errors = [];
  if (!input.name || input.name.trim() === '') {
    errors.push('Name is required');
  }
  if (!input.email || !input.email.includes('@')) {
    errors.push('Valid email is required');
  }
  if (!input.items || input.items.length === 0) {
    errors.push('At least one item is required');
  }
  if (!input.phone || input.phone.length < 10) {
    errors.push('Valid phone is required');
  }
  return errors;
}

function fetchOrderStatus(orderId) {
  return new Promise((resolve, reject) => {
    http.get('http://api.internal/orders/' + orderId, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          // empty catch
        }
      });
    });
  });
}

module.exports = { processOrder, validateOrderInput, fetchOrderStatus, PAYMENT_KEY };
