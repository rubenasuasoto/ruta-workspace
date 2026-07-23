import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthStore } from './auth/auth.store';
import { App } from './app';
import { TripStore } from './core/trip-store.service';

describe('App', () => {
  const auth = {
    authenticated: signal(true),
    initialized: signal(true),
    user: signal({ id: 'user-1', name: 'Ruben', email: 'ruben@example.com' }),
    logout: vi.fn().mockResolvedValue(undefined),
  };
  const trips = {
    loading: signal(false),
    initialized: signal(true),
    reset: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: AuthStore, useValue: auth },
        { provide: TripStore, useValue: trips },
      ],
    }).compileComponents();
  });

  it('renders private navigation for an authenticated account', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.brand')?.textContent).toContain('ruta');
    expect(compiled.textContent).toContain('Mis viajes');
    expect(compiled.textContent).toContain('Ruben');
  });
});
