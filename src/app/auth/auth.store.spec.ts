import { TestBed } from '@angular/core/testing';
import { Api } from '../api/api';
import { AuthStore } from './auth.store';
import { authControllerRegister } from '../api/fn/auth/auth-controller-register';
import { invitationsControllerInspect } from '../api/fn/invitations/invitations-controller-inspect';

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

  it('inspects and consumes an invitation before authenticating the new account', async () => {
    const invoke = vi.fn().mockImplementation((operation: unknown) => {
      if (operation === invitationsControllerInspect)
        return Promise.resolve({
          email: 'ruta@example.com',
          expiresAt: '2026-07-31T12:00:00.000Z',
        });
      if (operation === authControllerRegister)
        return Promise.resolve({
          accessToken: 'invited-access',
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

    await expect(auth.inspectInvitation('invite-token')).resolves.toMatchObject({
      email: 'ruta@example.com',
    });
    await auth.register('Ruta', 'Secure!1', 'invite-token');
    expect(auth.authenticated()).toBe(true);
    expect(auth.user()?.emailVerified).toBe(true);
  });
});
