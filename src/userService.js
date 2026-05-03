const crypto = require('crypto');
const http = require('http');
const fs = require('fs');

// Hardcoded credentials (Security Hotspot)
const DB_PASSWORD = 'admin123';
const API_KEY = 'sk-secret-key-12345';

function processUser(userData) {
  // SQL injection vulnerability
  const query = "SELECT * FROM users WHERE name = '" + userData.name + "'";

  // Cognitive complexity monster (deeply nested)
  if (userData) {
    if (userData.name) {
      if (userData.name.length > 0) {
        if (userData.email) {
          if (userData.email.includes('@')) {
            if (userData.age) {
              if (userData.age > 0) {
                if (userData.age < 150) {
                  if (userData.role) {
                    if (userData.role === 'admin') {
                      return { status: 'admin', query: query };
                    } else if (userData.role === 'user') {
                      return { status: 'user', query: query };
                    } else {
                      return { status: 'unknown', query: query };
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  return null;
}

// Weak crypto (Security Hotspot)
function hashPassword(password) {
  return crypto.createHash('md5').update(password).digest('hex');
}

// Insecure random (Security Hotspot)
function generateToken() {
  return Math.random().toString(36).substring(2);
}

// Empty catch block (Code Smell)
function readConfig(path) {
  try {
    return JSON.parse(fs.readFileSync(path, 'utf-8'));
  } catch (e) {
    // empty catch
  }
}

// Infinite loop bug
function pollService(url, maxRetries, delay) {
  let running = true;
  let attempts = 0;
  while (running) {
    attempts++;
    try {
      http.get(url);
      return 'Service is up';
    } catch (err) {
      // empty catch
    }
    if (attempts >= maxRetries) {
      break;
    }
  }
  console.log('This is unreachable');
}

// Duplicated code block 1
function validateUserInput(input) {
  const errors = [];
  if (!input.name || input.name.trim() === '') {
    errors.push('Name is required');
  }
  if (!input.email || !input.email.includes('@')) {
    errors.push('Valid email is required');
  }
  if (!input.age || input.age < 0 || input.age > 150) {
    errors.push('Valid age is required');
  }
  if (!input.phone || input.phone.length < 10) {
    errors.push('Valid phone is required');
  }
  return errors;
}

// Duplicated code block 2 (nearly identical to above)
function validateAdminInput(input) {
  const errors = [];
  if (!input.name || input.name.trim() === '') {
    errors.push('Name is required');
  }
  if (!input.email || !input.email.includes('@')) {
    errors.push('Valid email is required');
  }
  if (!input.age || input.age < 0 || input.age > 150) {
    errors.push('Valid age is required');
  }
  if (!input.phone || input.phone.length < 10) {
    errors.push('Valid phone is required');
  }
  if (!input.adminCode) {
    errors.push('Admin code is required');
  }
  return errors;
}

// Unused variable
function calculateDiscount(price, type) {
  const unusedVar = 'this is never used';
  const taxRate = 0.1;

  if (type === 'premium') {
    return price * 0.8;
  } else if (type === 'standard') {
    return price * 0.9;
  } else {
    return price;
  }
}

module.exports = {
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
};
