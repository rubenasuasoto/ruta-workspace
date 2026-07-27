import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

const ALLOWED_EXTERNAL_SCRIPTS = new Set([
  'https://accounts.google.com/gsi/client',
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
]);

export function isAllowedExternalScript(src: string): boolean {
  return ALLOWED_EXTERNAL_SCRIPTS.has(src);
}

@Injectable({ providedIn: 'root' })
export class ExternalScriptService {
  private readonly document = inject(DOCUMENT);
  private readonly loads = new Map<string, Promise<void>>();

  load(src: string): Promise<void> {
    if (!isAllowedExternalScript(src))
      return Promise.reject(new Error('Script externo no permitido'));
    const existing = this.loads.get(src);
    if (existing) return existing;
    const load = new Promise<void>((resolve, reject) => {
      const present = this.document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
      if (present?.dataset['loaded'] === 'true') {
        resolve();
        return;
      }
      const script = present ?? this.document.createElement('script');
      script.src = src;
      script.async = true;
      script.defer = true;
      script.addEventListener('load', () => {
        script.dataset['loaded'] = 'true';
        resolve();
      });
      script.addEventListener('error', () => reject(new Error(`No se pudo cargar ${src}`)));
      if (!present) this.document.head.append(script);
    });
    this.loads.set(src, load);
    return load;
  }
}
