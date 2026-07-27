import { TestBed } from '@angular/core/testing';
import { Api } from '../../api/api';
import { LegalStore } from './legal.store';

describe('LegalStore', () => {
  it('loads the informational documents without recording acceptance', async () => {
    const invoke = vi.fn().mockResolvedValueOnce({
      currentVersion: '2026-07-24-private',
      documents: [],
    });
    TestBed.configureTestingModule({
      providers: [{ provide: Api, useValue: { invoke } }],
    });
    const store = TestBed.inject(LegalStore);
    await store.load();
    expect(store.currentVersion()).toBe('2026-07-24-private');
    expect(invoke).toHaveBeenCalledTimes(1);
  });
});
