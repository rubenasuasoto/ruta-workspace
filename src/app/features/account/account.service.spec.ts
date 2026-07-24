import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Api } from '../../api/api';
import { accountControllerUpdateProfile } from '../../api/fn/account/account-controller-update-profile';
import { authControllerSessions } from '../../api/fn/auth/auth-controller-sessions';
import { AuthStore } from '../../auth/auth.store';
import { AccountService } from './account.service';

describe('AccountService', () => {
  it('loads sessions and updates the shared authenticated profile', async () => {
    const user = signal({
      id: 'user-1',
      name: 'Antes',
      email: 'ruta@example.com',
      emailVerified: true,
      providers: ['LOCAL' as const],
    });
    const invoke = vi.fn().mockImplementation((operation: unknown) => {
      if (operation === authControllerSessions)
        return Promise.resolve([
          {
            id: 'session-1',
            current: true,
            startedAt: '2026-07-24T10:00:00.000Z',
            lastUsedAt: '2026-07-24T10:00:00.000Z',
            expiresAt: '2026-08-24T10:00:00.000Z',
          },
        ]);
      if (operation === accountControllerUpdateProfile)
        return Promise.resolve({ ...user(), name: 'Después' });
      return Promise.reject(new Error('unexpected operation'));
    });
    TestBed.configureTestingModule({
      providers: [
        AccountService,
        { provide: Api, useValue: { invoke } },
        {
          provide: AuthStore,
          useValue: {
            user,
            message: () => 'Error seguro',
          },
        },
      ],
    });
    const account = TestBed.inject(AccountService);

    await account.loadSessions();
    expect(account.sessions()).toHaveLength(1);
    expect(account.sessions()[0].current).toBe(true);

    await account.updateName('Después');
    expect(user().name).toBe('Después');
  });
});
