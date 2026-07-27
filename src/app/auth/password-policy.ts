import { Validators, type ValidatorFn } from '@angular/forms';

export const PASSWORD_REQUIREMENTS =
  'M\u00ednimo 8 caracteres, una may\u00fascula y un s\u00edmbolo.';
export const PASSWORD_LOGIN_REQUIRED = 'Indica tu contrase\u00f1a.';

export const PASSWORD_VALIDATORS: ValidatorFn[] = [
  Validators.required,
  Validators.minLength(8),
  Validators.pattern(/[A-Z\u00c1\u00c9\u00cd\u00d3\u00da\u00dc\u00d1]/),
  Validators.pattern(/[^\p{L}\p{N}\s]/u),
];
