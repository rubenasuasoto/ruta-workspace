import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Api } from '../api/api';
import { authControllerConfirmEmailChange } from '../api/fn/auth/auth-controller-confirm-email-change';
import { authControllerForgotPassword } from '../api/fn/auth/auth-controller-forgot-password';
import { authControllerGoogle } from '../api/fn/auth/auth-controller-google';
import { authControllerLogin } from '../api/fn/auth/auth-controller-login';
import { authControllerLogout } from '../api/fn/auth/auth-controller-logout';
import { authControllerRefresh } from '../api/fn/auth/auth-controller-refresh';
import { authControllerRegister } from '../api/fn/auth/auth-controller-register';
import { authControllerResendVerification } from '../api/fn/auth/auth-controller-resend-verification';
import { authControllerResetPassword } from '../api/fn/auth/auth-controller-reset-password';
import { authControllerVerifyEmail } from '../api/fn/auth/auth-controller-verify-email';
import { invitationsControllerInspect } from '../api/fn/invitations/invitations-controller-inspect';
import type { PendingAuthResponseDto } from '../api/models/pending-auth-response-dto';
import type { InvitationInspectionDto } from '../api/models/invitation-inspection-dto';
import type { UserResponseDto } from '../api/models/user-response-dto';

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
    await this.authenticate(() =>
      this.api.invoke(authControllerLogin, { body: { email, password } }),
    );
  }

  async register(name: string, password: string, invitationToken: string): Promise<void> {
    await this.authenticate(() =>
      this.api.invoke(authControllerRegister, {
        body: { name, password, invitationToken },
      }),
    );
  }

  inspectInvitation(token: string): Promise<InvitationInspectionDto> {
    return this.run(() => this.api.invoke(invitationsControllerInspect, { body: { token } }));
  }

  async verifyEmail(token: string): Promise<void> {
    await this.authenticate(() => this.api.invoke(authControllerVerifyEmail, { body: { token } }));
  }

  async confirmEmailChange(token: string): Promise<void> {
    await this.authenticate(() =>
      this.api.invoke(authControllerConfirmEmailChange, {
        body: { token },
      }),
    );
  }

  resendVerification(email: string, turnstileToken?: string) {
    return this.pending(() =>
      this.api.invoke(authControllerResendVerification, {
        body: { email, turnstileToken },
      }),
    );
  }

  forgotPassword(email: string, turnstileToken?: string) {
    return this.pending(() =>
      this.api.invoke(authControllerForgotPassword, {
        body: { email, turnstileToken },
      }),
    );
  }

  async resetPassword(token: string, password: string): Promise<void> {
    await this.run(() =>
      this.api.invoke(authControllerResetPassword, {
        body: { token, password },
      }),
    );
  }

  async loginWithGoogle(credential: string, invitationToken?: string): Promise<void> {
    await this.authenticate(() =>
      this.api.invoke(authControllerGoogle, {
        body: { credential, invitationToken },
      }),
    );
  }

  async refresh(): Promise<string | null> {
    if (this.refreshInFlight) return this.refreshInFlight;
    this.refreshInFlight = this.api
      .invoke(authControllerRefresh)
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
    const response = (await this.run(operation)) as {
      accessToken: string;
      user: UserResponseDto;
    };
    this.accessToken.set(response.accessToken);
    this.user.set(response.user);
  }

  private pending(
    operation: () => Promise<PendingAuthResponseDto>,
  ): Promise<PendingAuthResponseDto> {
    return this.run(operation);
  }

  private async run<T>(operation: () => Promise<T>): Promise<T> {
    this.loading.set(true);
    this.error.set(null);
    try {
      return await operation();
    } catch (error) {
      this.error.set(this.message(error));
      throw error;
    } finally {
      this.loading.set(false);
    }
  }
}
