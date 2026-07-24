import { Injectable, inject, signal } from '@angular/core';
import { Api } from '../../api/api';
import { accountControllerChangeEmail } from '../../api/fn/account/account-controller-change-email';
import { accountControllerChangePassword } from '../../api/fn/account/account-controller-change-password';
import { accountControllerDelete } from '../../api/fn/account/account-controller-delete';
import { accountControllerExport } from '../../api/fn/account/account-controller-export';
import { accountControllerUpdateProfile } from '../../api/fn/account/account-controller-update-profile';
import { authControllerReauthenticate } from '../../api/fn/auth/auth-controller-reauthenticate';
import { authControllerRevokeOtherSessions } from '../../api/fn/auth/auth-controller-revoke-other-sessions';
import { authControllerRevokeSession } from '../../api/fn/auth/auth-controller-revoke-session';
import { authControllerSessions } from '../../api/fn/auth/auth-controller-sessions';
import { SessionResponseDto } from '../../api/models/session-response-dto';
import { AuthStore } from '../../auth/auth.store';

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly api = inject(Api);
  private readonly auth = inject(AuthStore);

  readonly sessions = signal<SessionResponseDto[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  async loadSessions(): Promise<void> {
    await this.run(async () => {
      this.sessions.set(await this.api.invoke(authControllerSessions));
    });
  }

  async updateName(name: string): Promise<void> {
    await this.run(async () => {
      const user = await this.api.invoke(accountControllerUpdateProfile, {
        body: { name },
      });
      this.auth.user.set(user);
    });
  }

  async reauthenticate(password: string): Promise<string> {
    return this.run(async () => {
      const result = await this.api.invoke(authControllerReauthenticate, {
        body: { password },
      });
      return result.reauthToken;
    });
  }

  async reauthenticateWithGoogle(googleCredential: string): Promise<string> {
    return this.run(async () => {
      const result = await this.api.invoke(authControllerReauthenticate, {
        body: { googleCredential },
      });
      return result.reauthToken;
    });
  }

  async requestEmailChange(email: string, reauthToken: string): Promise<string> {
    return this.run(async () => {
      const result = await this.api.invoke(accountControllerChangeEmail, {
        body: { email, reauthToken },
      });
      return result.message;
    });
  }

  async changePassword(password: string, reauthToken: string): Promise<void> {
    await this.run(() =>
      this.api.invoke(accountControllerChangePassword, {
        body: { password, reauthToken },
      }),
    );
    this.auth.clear();
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.run(() => this.api.invoke(authControllerRevokeSession, { sessionId }));
    this.sessions.update((items) => items.filter((item) => item.id !== sessionId));
  }

  async revokeOthers(): Promise<void> {
    await this.run(() => this.api.invoke(authControllerRevokeOtherSessions));
    this.sessions.update((items) => items.filter((item) => item.current));
  }

  async downloadExport(): Promise<void> {
    const data = await this.run(() => this.api.invoke(accountControllerExport));
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `ruta-export-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async deleteAccount(reauthToken: string): Promise<void> {
    await this.run(() =>
      this.api.invoke(accountControllerDelete, {
        body: { confirmation: 'ELIMINAR', reauthToken },
      }),
    );
    this.auth.clear();
  }

  private async run<T>(operation: () => Promise<T>): Promise<T> {
    this.loading.set(true);
    this.error.set(null);
    try {
      return await operation();
    } catch (error) {
      this.error.set(this.auth.message(error));
      throw error;
    } finally {
      this.loading.set(false);
    }
  }
}
