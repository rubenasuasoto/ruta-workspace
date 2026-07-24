import { TestBed } from '@angular/core/testing';
import { Api } from '../api/api';
import { AuthStore } from './auth.store';
import { authControllerRegister } from '../api/fn/auth/auth-controller-register';
import { authControllerVerifyEmail } from '../api/fn/auth/auth-controller-verify-email';

describe('AuthStore', () => {
  it('shares one refresh request between concurrent callers', async () => {
    let complete!: (value: unknown) => void;
    const response = new Promise((resolve) => {
      complete = resolve;
    });
    const invoke = vi.fn().mockReturnValue(response);
    TestBed.configureTestingModule({
      providers: [AuthStore, { provide: Api, useValue: { invoke } }],
    });
    const auth = TestBed.inject(AuthStore);

    const first = auth.refresh();
    const second = auth.refresh();
    complete({
      accessToken: 'access',
      user: { id: 'user-1', email: 'ruta@example.com', name: 'Ruta' },
    });

    await expect(first).resolves.toBe('access');
    await expect(second).resolves.toBe('access');
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(auth.authenticated()).toBe(true);
  });

  it('keeps registration pending until the email token is verified', async () => {
    const invoke = vi.fn().mockImplementation((operation: unknown) => {
      if (operation === authControllerRegister)
        return Promise.resolve({
          status: 'verification_required',
          message: 'Revisa tu correo',
        });
      if (operation === authControllerVerifyEmail)
        return Promise.resolve({
          accessToken: 'verified-access',
          user: {
            id: 'user-1',
            email: 'ruta@example.com',
            name: 'Ruta',
            emailVerified: true,
            providers: ['LOCAL'],
          },
        });
      return Promise.reject(new Error('unexpected operation'));
    });
    TestBed.configureTestingModule({
      providers: [AuthStore, { provide: Api, useValue: { invoke } }],
    });
    const auth = TestBed.inject(AuthStore);

    await expect(
      auth.register('Ruta', 'ruta@example.com', 'secure-password'),
    ).resolves.toMatchObject({ status: 'verification_required' });
    expect(auth.authenticated()).toBe(false);

    await auth.verifyEmail('email-token');
    expect(auth.authenticated()).toBe(true);
    expect(auth.user()?.emailVerified).toBe(true);
  });
});
