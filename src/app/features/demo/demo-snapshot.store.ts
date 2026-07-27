import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { DemoSnapshot } from './demo-snapshot.model';

@Injectable({ providedIn: 'root' })
export class DemoSnapshotStore {
  readonly snapshot = signal<DemoSnapshot | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  private readonly http = inject(HttpClient);
  private loadPromise?: Promise<void>;

  load(): Promise<void> {
    if (this.snapshot()) return Promise.resolve();
    if (this.loadPromise) return this.loadPromise;

    this.loading.set(true);
    this.error.set(null);
    this.loadPromise = firstValueFrom(
      this.http.get<DemoSnapshot>('/assets/demo/valencia.snapshot.json'),
    )
      .then((snapshot) => {
        if (snapshot.schemaVersion !== 1) {
          throw new Error('La versión de la demo no es compatible.');
        }
        this.snapshot.set(snapshot);
      })
      .catch(() => {
        this.error.set('No se ha podido cargar el viaje de demostración.');
      })
      .finally(() => {
        this.loading.set(false);
        this.loadPromise = undefined;
      });
    return this.loadPromise;
  }
}
