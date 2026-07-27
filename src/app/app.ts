import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { AuthStore } from './auth/auth.store';
import { TripStore } from './core/trip-store.service';
import { FeedbackComponent } from './core/feedback.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FeedbackComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly auth = inject(AuthStore);
  protected readonly trips = inject(TripStore);
  private readonly router = inject(Router);
  protected readonly isDemo = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects.startsWith('/demo')),
      startWith(this.router.url.startsWith('/demo')),
    ),
    { initialValue: false },
  );
  protected readonly menuOpen = signal(false);
  protected closeMenu(): void { this.menuOpen.set(false); }
  protected async logout(): Promise<void> {
    this.closeMenu();
    await this.auth.logout();
    this.trips.reset();
    await this.router.navigateByUrl('/acceso');
  }
}
