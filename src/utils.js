function formatDate(date) {
  if (!(date instanceof Date)) throw new TypeError('Expected Date object');
  return date.toISOString().split('T')[0];
}

function capitalize(str) {
  if (typeof str !== 'string') return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = { formatDate, capitalize };
