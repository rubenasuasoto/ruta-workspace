import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Api } from '../api/api';
import { UserResponseDto } from '../api/models/user-response-dto';
import { authControllerLogin } from '../api/fn/auth/auth-controller-login';
import { authControllerLogout } from '../api/fn/auth/auth-controller-logout';
import { authControllerRefresh } from '../api/fn/auth/auth-controller-refresh';
import { authControllerRegister } from '../api/fn/auth/auth-controller-register';
import { authControllerGoogle } from '../api/fn/auth/auth-controller-google';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly api = inject(Api);
  private refreshInFlight?: Promise<string | null>;

  readonly user = signal<UserResponseDto | null>(null);
  readonly accessToken = signal<string | null>(null);
  readonly initialized = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly authenticated = computed(() => this.user() !== null);

  async initialize(): Promise<void> {
    if (this.initialized()) return;
    await this.refresh();
    this.initialized.set(true);
  }

  async login(email: string, password: string): Promise<void> {
    await this.authenticate(() => this.api.invoke(authControllerLogin, { body: { email, password } }));
  }

  async register(name: string, email: string, password: string): Promise<void> {
    await this.authenticate(() => this.api.invoke(authControllerRegister, { body: { name, email, password } }));
  }

  async loginWithGoogle(credential: string): Promise<void> {
    await this.authenticate(() => this.api.invoke(authControllerGoogle, { body: { credential } }));
  }

  async refresh(): Promise<string | null> {
    if (this.refreshInFlight) return this.refreshInFlight;
    this.refreshInFlight = this.api.invoke(authControllerRefresh)
      .then((response) => {
        this.accessToken.set(response.accessToken);
        this.user.set(response.user);
        return response.accessToken;
      })
      .catch(() => {
        this.clear();
        return null;
      })
      .finally(() => {
        this.refreshInFlight = undefined;
      });
    return this.refreshInFlight;
  }

  async logout(): Promise<void> {
    try {
      await this.api.invoke(authControllerLogout);
    } finally {
      this.clear();
    }
  }

  clear(): void {
    this.accessToken.set(null);
    this.user.set(null);
  }

  message(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const message = error.error?.message;
      if (Array.isArray(message)) return message.join('. ');
      if (typeof message === 'string') return message;
    }
    return 'No se pudo completar la operación. Inténtalo de nuevo.';
  }

  private async authenticate(operation: () => ReturnType<Api['invoke']>): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const response = await operation() as { accessToken: string; user: UserResponseDto };
      this.accessToken.set(response.accessToken);
      this.user.set(response.user);
    } catch (error) {
      this.error.set(this.message(error));
      throw error;
    } finally {
      this.loading.set(false);
    }
  }
}
