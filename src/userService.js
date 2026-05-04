const crypto = require('crypto');
const http = require('http');
const fs = require('fs');
const { _validateCommonInputFields } = require('./utils/validation');

const DB_PASSWORD = 'fake_db_pass_' + crypto.randomBytes(8).toString('hex'); // S2068: Hardcoded credentials
const API_KEY = 'fake_sk_secret_' + crypto.randomBytes(16).toString('hex'); // S2068: Hardcoded credentials

function getUserRoleStatus(role) {
  switch (role) {
    case 'admin':
      return 'admin';
    case 'user':
      return 'user';
    default:
      return 'unknown';
  }
}

function processUser(userData) { // S3776: Refactored Cognitive Complexity
  // S6418: SQL injection vulnerability - In a real application, use parameterized queries.
  const query = "SELECT * FROM users WHERE name = '" + userData.name + "'";

  if (!userData || !userData?.name || userData.name.length === 0) {
    return null;
  }
  if (!userData?.email || !userData.email.includes('@')) {
    return null;
  }
  if (!userData.age || userData.age <= 0 || userData.age >= 150) {
    return null;
  }
  if (!userData.role) {
    return null;
  }

  const status = getUserRoleStatus(userData.role);
  return { status, query: query };
}

function hashPassword(password) { // S4790: Weak crypto (md5) changed to sha256
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken() { // S2115: Insecure random (Math.random) changed to crypto.randomBytes
  return crypto.randomBytes(20).toString('hex');
}

function readConfig(path) {
  try {
    return JSON.parse(fs.readFileSync(path, 'utf-8'));
  } catch (e) {
    console.error(`Failed to read or parse config file at ${path}:`, e.message); // S2486: Handle this exception
    return null;
  }
}

function pollService(url, maxRetries) { // S2189: 'running' is not modified, S2486: Empty catch
  for (let attempts = 0; attempts < maxRetries; attempts++) {
    try {
      // In a real scenario, http.get is async. For this synchronous example,
      // we'll assume it either throws immediately or succeeds.
      http.get(url); // This is a fire-and-forget in Node.js, not blocking.
      return 'Service is up';
    } catch (err) {
      console.warn(`Attempt ${attempts + 1}/${maxRetries}: Service at ${url} is down.`, err.message); // S2486: Handle this exception
    }
  }
  console.error(`Service at ${url} failed to come up after ${maxRetries} attempts.`);
  return 'Service is down';
}

function validateUserInput(input) {
  const errors = _validateCommonInputFields(input);
  if (!input.age || input.age < 0 || input.age > 150) {
    errors.push('Valid age is required');
  }
  return errors;
}

function validateAdminInput(input) {
  const errors = _validateCommonInputFields(input);
  if (!input.age || input.age < 0 || input.age > 150) {
    errors.push('Valid age is required');
  }
  if (!input.adminCode) {
    errors.push('Admin code is required');
  }
  return errors;
}

function calculateDiscount(price, type) {

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
