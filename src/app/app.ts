import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from './auth/auth.store';
import { TripStore } from './core/trip-store.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly auth = inject(AuthStore);
  protected readonly trips = inject(TripStore);
  private readonly router = inject(Router);
  protected readonly menuOpen = signal(false);
  protected closeMenu(): void { this.menuOpen.set(false); }
  protected async logout(): Promise<void> {
    this.closeMenu();
    await this.auth.logout();
    this.trips.reset();
    await this.router.navigateByUrl('/acceso');
  }
}
