import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import { ExternalScriptService } from './external-script.service';

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleIdentity {
  accounts: {
    id: {
      initialize(options: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
      }): void;
      renderButton(element: HTMLElement, options: Record<string, string | number>): void;
      cancel(): void;
    };
  };
}

@Component({
  selector: 'app-google-sign-in',
  template: `<div #host class="google-host" aria-label="Acceso con Google"></div>`,
  styles: `
    .google-host {
      display: flex;
      justify-content: center;
      min-height: 44px;
      width: 100%;
    }
  `,
})
export class GoogleSignInComponent implements AfterViewInit {
  private readonly scripts = inject(ExternalScriptService);
  @ViewChild('host', { static: true })
  private host!: ElementRef<HTMLElement>;
  @Input({ required: true }) clientId = '';
  @Output() credential = new EventEmitter<string>();
  @Output() loadError = new EventEmitter<void>();

  async ngAfterViewInit(): Promise<void> {
    if (!this.clientId) return;
    try {
      await this.scripts.load('https://accounts.google.com/gsi/client');
      const google = (window as unknown as { google?: GoogleIdentity }).google;
      if (!google) throw new Error('Google Identity Services no disponible');
      google.accounts.id.initialize({
        client_id: this.clientId,
        callback: (response) => this.credential.emit(response.credential),
      });
      google.accounts.id.renderButton(this.host.nativeElement, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: 'continue_with',
        locale: 'es',
        width: this.host.nativeElement.clientWidth || 360,
      });
    } catch {
      this.loadError.emit();
    }
  }
}
