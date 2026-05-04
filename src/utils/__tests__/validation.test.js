const { _validateCommonInputFields } = require('../validation');

describe('_validateCommonInputFields', () => {
  const validCommonInput = {
    name: 'Valid Name',
    email: 'valid@example.com',
    phone: '1234567890',
  };

  it('should return an empty array for valid input', () => {
    expect(_validateCommonInputFields(validCommonInput)).toEqual([]);
  });

  it('should require a name', () => {
    expect(_validateCommonInputFields({ ...validCommonInput, name: '' })).toEqual(['Name is required']);
    expect(_validateCommonInputFields({ ...validCommonInput, name: ' ' })).toEqual(['Name is required']);
    expect(_validateCommonInputFields({ ...validCommonInput, name: undefined })).toEqual(['Name is required']);
  });

  it('should require a valid email', () => {
    expect(_validateCommonInputFields({ ...validCommonInput, email: 'invalid' })).toEqual(['Valid email is required']);
    expect(_validateCommonInputFields({ ...validCommonInput, email: undefined })).toEqual(['Valid email is required']);
    expect(_validateCommonInputFields({ ...validCommonInput, email: null })).toEqual(['Valid email is required']);
  });

  it('should require a valid phone number (length >= 10)', () => {
    expect(_validateCommonInputFields({ ...validCommonInput, phone: '123' })).toEqual(['Valid phone is required']);
    expect(_validateCommonInputFields({ ...validCommonInput, phone: undefined })).toEqual(['Valid phone is required']);
  });

  it('should return all errors for multiple invalid fields', () => {
    const invalidInput = {
      name: '',
      email: 'bad',
      phone: '123',
    };
    expect(_validateCommonInputFields(invalidInput)).toEqual([
      'Name is required',
      'Valid email is required',
      'Valid phone is required',
    ]);
  });
});
