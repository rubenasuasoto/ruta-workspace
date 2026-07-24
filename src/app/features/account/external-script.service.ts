import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ExternalScriptService {
  private readonly document = inject(DOCUMENT);
  private readonly loads = new Map<string, Promise<void>>();

  load(src: string): Promise<void> {
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
