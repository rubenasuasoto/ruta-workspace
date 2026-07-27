import { DatePipe, DecimalPipe } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DEMO_LINES, DEMO_POINTS, DEMO_TRIP } from '../features/demo/demo.fixture';
import { TravelMapComponent } from '../features/map/travel-map.component';

@Component({
  selector: 'app-demo',
  imports: [DatePipe, DecimalPipe, RouterLink, TravelMapComponent],
  template: `
    <div class="demo-banner" role="status">Demo de portafolio · datos ficticios · solo lectura</div>
    <main class="demo">
      <header>
        <img src="/assets/editorial/ruta-auth-hero.png" alt="" />
        <div>
          <p class="eyebrow">Escapada mediterránea</p>
          <h1>{{ trip.destination }}</h1>
          <p>
            {{ trip.country }} · {{ trip.startDate | date: 'd MMM' }} —
            {{ trip.endDate | date: 'd MMM yyyy' }}
          </p>
          <p>{{ trip.description }}</p>
        </div>
      </header>

      <section class="summary" aria-label="Resumen del viaje">
        <article>
          <small>Planificación</small><strong>78%</strong><span><i></i></span>
        </article>
        <article>
          <small>Presupuesto</small><strong>{{ trip.spent | number: '1.0-0' }} €</strong>
          <p>de {{ trip.budget }} €</p>
        </article>
        <article>
          <small>Itinerario</small><strong>{{ trip.days.length }} días</strong>
          <p>6 actividades</p>
        </article>
      </section>

      <section class="demo-grid">
        <div>
          <p class="eyebrow">Itinerario</p>
          @for (day of trip.days; track day.id) {
            <article class="day">
              <h2>{{ day.date | date: 'EEEE d MMMM' }}</h2>
              @for (activity of day.activities; track activity.time) {
                <div class="activity">
                  <time>{{ activity.time }}</time>
                  <span
                    ><strong>{{ activity.title }}</strong
                    ><small>{{ activity.kind }}</small></span
                  >
                </div>
              }
            </article>
          }
        </div>
        <aside>
          <p class="eyebrow">Mapa previsto</p>
          <app-travel-map
            [points]="points"
            [lines]="lines"
            [tilesEnabled]="false"
            ariaLabel="Mapa ficticio de la demo, sin teselas externas"
          />
          <small>Mapa local de demostración. No realiza solicitudes a proveedores externos.</small>
        </aside>
      </section>

      <section class="places">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Colección</p>
            <h2>Lugares guardados</h2>
          </div>
        </div>
        <div>
          @for (place of trip.places; track place.name) {
            <article>
              <span aria-hidden="true">◇</span>
              <div>
                <strong>{{ place.name }}</strong
                ><small>{{ place.category }}</small>
                <p>{{ place.note }}</p>
              </div>
            </article>
          }
        </div>
      </section>

      <section class="cta">
        <p class="eyebrow">Proyecto de portafolio</p>
        <h2>Angular, NestJS, PostgreSQL, mapas, IA y almacenamiento privado.</h2>
        <p>
          La aplicación real requiere una invitación y mantiene los datos de cada usuario fuera de
          esta demostración.
        </p>
        <a class="button coral" routerLink="/acceso">Acceso privado</a>
      </section>
    </main>
  `,
  styles: `
    .demo-banner {
      background: var(--coral);
      color: #fff;
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      padding: 0.7rem;
      text-align: center;
      text-transform: uppercase;
    }
    .demo {
      margin: 0 auto;
      max-width: 1280px;
      padding: 2rem 1.25rem 5rem;
    }
    .demo > header {
      background: var(--deep);
      border-radius: 1.2rem;
      color: #fff;
      display: grid;
      grid-template-columns: 1.05fr 0.95fr;
      overflow: hidden;
    }
    .demo > header img {
      height: 100%;
      max-height: 540px;
      object-fit: cover;
      width: 100%;
    }
    .demo > header div {
      align-self: end;
      padding: clamp(2rem, 6vw, 5rem);
    }
    .demo h1 {
      font-size: clamp(4rem, 9vw, 8rem);
      line-height: 0.86;
      margin: 0.7rem 0 1.5rem;
    }
    .summary {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(3, 1fr);
      margin: 1.2rem 0 3rem;
    }
    .summary article,
    .day,
    .places article {
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 1rem;
      padding: 1.2rem;
    }
    .summary small,
    .summary p,
    .activity small,
    .places small,
    .places p,
    .demo-grid aside > small {
      color: var(--muted);
    }
    .summary strong {
      display: block;
      font-family: var(--font-display);
      font-size: 2rem;
      margin: 0.4rem 0;
    }
    .summary span {
      background: var(--sand);
      border-radius: 1rem;
      display: block;
      height: 7px;
    }
    .summary i {
      background: var(--coral);
      border-radius: 1rem;
      display: block;
      height: 100%;
      width: 78%;
    }
    .demo-grid {
      display: grid;
      gap: 1.2rem;
      grid-template-columns: 1fr 0.9fr;
    }
    .day {
      margin-bottom: 1rem;
    }
    .day h2 {
      font-size: 1.6rem;
    }
    .activity {
      border-top: 1px solid var(--line);
      display: flex;
      gap: 1rem;
      padding: 0.8rem 0;
    }
    .activity time {
      color: var(--coral);
      font-weight: 800;
    }
    .activity span {
      display: grid;
    }
    .demo-grid aside {
      height: 620px;
      position: sticky;
      top: 90px;
    }
    .demo-grid app-travel-map {
      display: block;
      height: 540px;
    }
    .places {
      margin-top: 4rem;
    }
    .places > div:last-child {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(3, 1fr);
    }
    .places article {
      display: flex;
      gap: 1rem;
    }
    .places article > span {
      align-items: center;
      background: var(--sand);
      border-radius: 50%;
      display: flex;
      flex: 0 0 42px;
      height: 42px;
      justify-content: center;
    }
    .places p {
      font-size: 0.8rem;
    }
    .cta {
      background: var(--ink);
      border-radius: 1rem;
      color: #fff;
      margin-top: 4rem;
      padding: clamp(2rem, 6vw, 5rem);
      text-align: center;
    }
    .cta h2 {
      font-size: clamp(2.2rem, 5vw, 4.5rem);
      margin: 0.7rem auto;
      max-width: 900px;
    }
    .cta > p:not(.eyebrow) {
      color: #d8e3df;
      margin: 1rem auto 2rem;
      max-width: 650px;
    }
    @media (max-width: 800px) {
      .demo > header,
      .demo-grid {
        grid-template-columns: 1fr;
      }
      .summary,
      .places > div:last-child {
        grid-template-columns: 1fr;
      }
      .demo-grid aside {
        height: 480px;
        position: static;
      }
      .demo-grid app-travel-map {
        height: 410px;
      }
    }
  `,
})
export class DemoPage {
  readonly trip = DEMO_TRIP;
  readonly points = DEMO_POINTS;
  readonly lines = DEMO_LINES;
}
