import { TestBed } from '@angular/core/testing';
import { Api } from '../api/api';
import { AuthStore } from './auth.store';

describe('AuthStore', () => {
  it('shares one refresh request between concurrent callers', async () => {
    let complete!: (value: unknown) => void;
    const response = new Promise((resolve) => { complete = resolve; });
    const invoke = vi.fn().mockReturnValue(response);
    TestBed.configureTestingModule({
      providers: [AuthStore, { provide: Api, useValue: { invoke } }],
    });
    const auth = TestBed.inject(AuthStore);

    const first = auth.refresh();
    const second = auth.refresh();
    complete({ accessToken: 'access', user: { id: 'user-1', email: 'ruta@example.com', name: 'Ruta' } });

    await expect(first).resolves.toBe('access');
    await expect(second).resolves.toBe('access');
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(auth.authenticated()).toBe(true);
  });
});
