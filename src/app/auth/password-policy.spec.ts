import { FormControl } from '@angular/forms';
import { PASSWORD_VALIDATORS } from './password-policy';

describe('password policy', () => {
  const valid = (password: string) => new FormControl(password, PASSWORD_VALIDATORS).valid;

  it('accepts eight characters with an uppercase letter and a symbol', () => {
    expect(valid('Ruta#123')).toBe(true);
  });

  it('rejects missing uppercase, missing symbol or fewer than eight characters', () => {
    expect(valid('ruta#123')).toBe(false);
    expect(valid('Ruta1234')).toBe(false);
    expect(valid('Ru#1234')).toBe(false);
  });
});
