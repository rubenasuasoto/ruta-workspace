import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MapPoint } from '../core/models';
import { TravelMapComponent } from '../features/map/travel-map.component';
import { SharedTrip, SharingApi } from '../features/sharing/sharing-api.service';

@Component({
  selector: 'app-shared-trip',
  imports: [DatePipe, RouterLink, TravelMapComponent],
  template: `
    <article class="shared">
      <a routerLink="/">← Volver a mis viajes</a>
      @if (loading()) {
        <p role="status">Abriendo viaje compartido…</p>
      } @else if (error()) {
        <div class="empty">
          <h1>Este viaje no está disponible</h1>
          <p>No eres destinatario, ha caducado o el propietario retiró el acceso.</p>
        </div>
      } @else if (data()) {
        @if (data()!.summary; as summary) {
          <header [class.with-cover]="summary.coverImage">
            @if (summary.coverImage) {
              <img [src]="summary.coverImage" alt="" />
            }
            <div>
              <p class="eyebrow">Compartido contigo · solo lectura</p>
              <h1>{{ summary.destination }}</h1>
              <p>{{ summary.country }}</p>
              <p>{{ summary.description }}</p>
            </div>
          </header>
        }
        @if (data()!.dates; as dates) {
          <p class="dates">
            {{ dates.startDate | date: 'd MMM yyyy' }} — {{ dates.endDate | date: 'd MMM yyyy' }}
          </p>
        }
        <section class="content-grid">
          <div>
            @for (day of data()!.days; track day.id) {
              <section class="day">
                <h2>{{ day.date | date: 'EEEE d MMMM' }}</h2>
                @for (activity of day.activities; track activity.id) {
                  <article>
                    <time>{{ activity.time }}</time>
                    <div>
                      <strong>{{ activity.title }}</strong
                      ><small
                        >{{ activity.kind }}
                        @if (activity.locationName) {
                          · {{ activity.locationName }}
                        }
                      </small>
                    </div>
                  </article>
                }
              </section>
            }
            @if (data()!.places.length) {
              <h2>Lugares seleccionados</h2>
              <div class="places">
                @for (place of data()!.places; track place.id) {
                  <article>
                    @if (place.image) {
                      <img [src]="place.image" [alt]="place.name" />
                    } @else {
                      <div class="placeholder" aria-hidden="true">◇</div>
                    }
                    <div>
                      <strong>{{ place.name }}</strong
                      ><small>{{ place.city }}, {{ place.country }}</small>
                    </div>
                  </article>
                }
              </div>
            }
          </div>
          @if (data()!.mapEnabled && mapPoints().length) {
            <aside>
              <app-travel-map [points]="mapPoints()" ariaLabel="Mapa del viaje compartido" />
            </aside>
          }
        </section>
        <footer>Acceso privado hasta {{ data()!.expiresAt | date: 'd MMM yyyy, HH:mm' }}.</footer>
      }
    </article>
  `,
  styles: `
    .shared {
      margin: 0 auto;
      max-width: 1200px;
      padding: clamp(1.5rem, 5vw, 4rem) 1.25rem;
    }
    .shared > a {
      color: var(--deep);
      display: inline-block;
      margin-bottom: 1rem;
    }
    .shared > header {
      background: var(--deep);
      border-radius: 1rem;
      color: white;
      overflow: hidden;
    }
    .shared > header.with-cover {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }
    .shared > header img {
      height: 100%;
      object-fit: cover;
      width: 100%;
    }
    .shared > header > div {
      padding: clamp(2rem, 6vw, 5rem);
    }
    .shared h1 {
      font-size: clamp(3rem, 7vw, 6rem);
      margin: 0.4rem 0;
    }
    .dates {
      color: var(--muted);
      font-weight: 700;
      margin: 1.5rem 0;
    }
    .content-grid {
      display: grid;
      gap: 1.2rem;
      grid-template-columns: 1fr 0.85fr;
    }
    .day {
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 1rem;
      margin-bottom: 1rem;
      padding: 1.2rem;
    }
    .day > article {
      border-top: 1px solid var(--line);
      display: flex;
      gap: 1rem;
      padding: 0.75rem 0;
    }
    .day time {
      color: var(--coral);
      font-weight: 700;
    }
    .day small,
    .places small {
      color: var(--muted);
      display: block;
      margin-top: 0.2rem;
    }
    .content-grid aside {
      height: 520px;
      position: sticky;
      top: 90px;
    }
    .places {
      display: grid;
      gap: 0.8rem;
      grid-template-columns: repeat(2, 1fr);
    }
    .places article {
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 0.8rem;
      overflow: hidden;
    }
    .places img,
    .placeholder {
      aspect-ratio: 16/9;
      object-fit: cover;
      width: 100%;
    }
    .placeholder {
      align-items: center;
      background: linear-gradient(135deg, #efe4d4, #dce8e4);
      display: flex;
      font-size: 2rem;
      justify-content: center;
    }
    .places article > div:last-child {
      padding: 0.8rem;
    }
    .shared > footer {
      border-top: 1px solid var(--line);
      color: var(--muted);
      margin-top: 2rem;
      padding-top: 1rem;
    }
    @media (max-width: 760px) {
      .shared > header.with-cover,
      .content-grid {
        grid-template-columns: 1fr;
      }
      .shared > header img {
        max-height: 300px;
      }
      .content-grid aside {
        position: static;
      }
      .places {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class SharedTripPage {
  private readonly sharing = inject(SharingApi);
  private readonly shareId = inject(ActivatedRoute).snapshot.paramMap.get('shareId')!;
  readonly data = signal<SharedTrip | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly mapPoints = () => {
    const data = this.data();
    if (!data) return [];
    const points: MapPoint[] = [];
    for (const day of data.days)
      for (const activity of day.activities)
        if (activity.latitude != null && activity.longitude != null)
          points.push({
            id: activity.id,
            label: activity.title,
            subtitle: activity.locationName ?? activity.address ?? undefined,
            latitude: activity.latitude,
            longitude: activity.longitude,
            kind: activity.kind as MapPoint['kind'],
            marker: 'activity',
            dayId: day.id,
            position: activity.position,
          });
    return points;
  };

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    try {
      this.data.set(await this.sharing.privateView(this.shareId));
    } catch {
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }
}
