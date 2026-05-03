function _validateCommonInputFields(input) {
  const errors = [];
  if (!input.name || input.name.trim() === '') {
    errors.push('Name is required');
  }
  if (!input.email?.includes('@')) {
    errors.push('Valid email is required');
  }
  if (!input.phone || input.phone.length < 10) {
    errors.push('Valid phone is required');
  }
  return errors;
}

module.exports = {
  _validateCommonInputFields
};
