import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TripStore } from '../core/trip-store.service';

@Component({ selector: 'app-dashboard', imports: [RouterLink, CurrencyPipe, DatePipe], template: `
@if(store.error()){<section class="notice error-notice" role="alert"><div><strong>No hemos podido actualizar tus viajes</strong><span>{{store.error()}}</span></div><button class="button small secondary" type="button" (click)="retry()" [disabled]="busy()">Reintentar</button></section>}
@if(store.localImportAvailable()&&!store.importDismissed()){<section class="notice import-notice"><div><strong>Encontramos tu cuaderno anterior</strong><span>Puedes importar ahora los viajes guardados en este navegador. No se borrarán hasta completar la importación.</span></div><div><button class="button small coral" type="button" (click)="importLocal()" [disabled]="busy()">Importar</button><button class="text-action" type="button" (click)="store.dismissImport()">Más tarde</button></div></section>}
@if(actionMessage()){<p class="action-message" role="status">{{actionMessage()}}</p>}
<section class="hero"><div><p class="eyebrow">Tu próximo capítulo</p><h1>Viajar no es llegar.<br><i>Es guardar el camino.</i></h1><p class="intro">Un lugar para que cada idea, reserva y recuerdo encuentre su sitio antes de que empiece el viaje.</p><a class="button coral" routerLink="/viajes">Explorar mis viajes <span>→</span></a></div><div class="hero-photo"><img src="https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=85" alt="Viajera contemplando un lago de montaña"><span>Rutas con intención</span></div></section>
<section class="stats" aria-label="Resumen de viajes"><article><span>Viajes guardados</span><strong>{{ store.trips().length }}</strong></article><article><span>Presupuesto planeado</span><strong>{{ store.totalPlanned() | currency:'EUR':'symbol':'1.0-0' }}</strong></article><article><span>Lugares por descubrir</span><strong>{{ pendingPlaces() }}</strong></article></section>
<section class="section-head"><div><p class="eyebrow">En el horizonte</p><h2>Próximas salidas</h2></div><a routerLink="/viajes">Ver todos →</a></section>
@if (upcoming().length) { <div class="trip-grid">@for (trip of upcoming(); track trip.id) { <a class="trip-card" [routerLink]="['/viajes', trip.id]"><img [src]="trip.coverImage" [alt]="trip.destination"><div class="card-body"><span class="status" [class]="'status ' + trip.status">{{ trip.status }}</span><h3>{{ trip.destination }}</h3><p>{{ trip.country }} · {{ trip.startDate | date:'d MMM' }} — {{ trip.endDate | date:'d MMM' }}</p><span class="arrow">Descubrir →</span></div></a> }</div> } @else { <div class="empty empty-start"><h3>Tu atlas está esperando su primera historia</h3><p>Crea un viaje desde cero o carga una colección de ejemplo para explorar Ruta.</p><div><a class="button secondary small" routerLink="/viajes">Crear mi primer viaje</a><button class="button coral small" type="button" (click)="loadDemo()" [disabled]="busy()">Usar datos de muestra</button></div></div> }
<section class="inspiration"><div><p class="eyebrow">Colecciona posibilidades</p><h2>Los lugares que guardas hoy se convierten en historias mañana.</h2><a routerLink="/lugares" class="button secondary">Ver lugares guardados</a></div><div class="mini-places">@for (place of store.places().slice(0, 2); track place.id) { <img [src]="place.image" [alt]="place.name"> }</div></section>
`, styles: `
.notice{align-items:center;border-bottom:1px solid;display:flex;gap:1rem;justify-content:space-between;padding:1rem clamp(1.25rem,5vw,5rem)}.notice div:first-child{display:flex;flex-direction:column;gap:.2rem}.notice span{font-size:.8rem}.notice>div:last-child{display:flex;gap:.7rem}.error-notice{background:#fff0ec;border-color:#efb7aa;color:#8d2f20}.import-notice{background:#f5ead9;border-color:#dac4a7}.text-action{background:transparent;border:0;color:var(--ink);font-weight:700}.action-message{background:var(--sage);font-size:.82rem;margin:0;padding:.75rem;text-align:center}.hero{display:grid;gap:3rem;grid-template-columns:1.15fr .85fr;min-height:500px;padding:clamp(2rem,6vw,6rem) clamp(1.25rem,5vw,5rem)}.hero>div:first-child{align-content:center}.hero h1{font-size:clamp(3.2rem,6.6vw,6.5rem);line-height:.96;margin:.55rem 0 1.4rem}.hero h1 i{color:var(--coral);font-weight:600}.intro{color:var(--muted);font-size:1.08rem;line-height:1.65;max-width:34rem}.hero-photo{min-height:410px;overflow:hidden;position:relative}.hero-photo img{height:100%;object-fit:cover;width:100%}.hero-photo span{background:var(--paper);bottom:0;font-family:var(--font-display);font-style:italic;padding:.8rem 1.1rem;position:absolute;right:0}.stats{background:var(--ink);color:white;display:grid;grid-template-columns:repeat(3,1fr);padding:2rem clamp(1.25rem,5vw,5rem)}.stats article{border-right:1px solid rgba(255,255,255,.2);padding:0 1.5rem}.stats article:first-child{padding-left:0}.stats article:last-child{border:0}.stats span{color:#c7d3cf;display:block;font-size:.78rem}.stats strong{font-family:var(--font-display);font-size:2.25rem}.section-head{align-items:end;display:flex;justify-content:space-between;margin:5rem auto 1.5rem;max-width:1300px;padding:0 clamp(1.25rem,5vw,5rem)}.section-head h2,.inspiration h2{font-size:clamp(2.25rem,4vw,3.5rem);margin-bottom:0}.section-head a{color:var(--coral);font-size:.9rem;font-weight:700;text-decoration:none}.trip-grid{display:grid;gap:1.4rem;grid-template-columns:repeat(3,1fr);margin:0 auto;max-width:1300px;padding:0 clamp(1.25rem,5vw,5rem)}.trip-card{background:var(--paper);border:1px solid var(--line);color:inherit;text-decoration:none}.trip-card img{aspect-ratio:1.22;display:block;object-fit:cover;width:100%}.card-body{padding:1.15rem}.card-body h3{font-size:1.8rem;margin:.85rem 0 .2rem}.card-body p{color:var(--muted);font-size:.82rem;margin:0}.arrow{color:var(--coral);display:block;font-size:.8rem;font-weight:700;margin-top:1.35rem}.empty-start{margin:0 clamp(1.25rem,5vw,5rem)}.empty-start h3{color:var(--ink);font-size:1.7rem}.empty-start div{display:flex;gap:.7rem;justify-content:center}.inspiration{align-items:center;background:var(--sand);display:grid;gap:2rem;grid-template-columns:1.1fr .9fr;margin-top:5.5rem;padding:clamp(2rem,6vw,5rem)}.inspiration h2{max-width:630px}.mini-places{display:flex;gap:1rem;justify-content:center}.mini-places img{height:230px;object-fit:cover;width:43%}.mini-places img:last-child{margin-top:3rem}@media(max-width:720px){.notice{align-items:stretch;flex-direction:column}.hero,.inspiration{grid-template-columns:1fr}.hero{padding-bottom:3rem}.hero-photo{min-height:260px}.stats{grid-template-columns:1fr}.stats article{border-bottom:1px solid rgba(255,255,255,.2);border-right:0;padding:1rem 0}.stats article:last-child{border:0}.trip-grid{grid-template-columns:1fr}.section-head{margin-top:3.5rem}.inspiration{margin-top:3.5rem}.empty-start div{flex-direction:column}}
` })
export class DashboardPage {
  readonly store = inject(TripStore);
  readonly upcoming = computed(() => this.store.trips().filter((trip) => trip.status !== 'completado').slice(0, 3));
  readonly pendingPlaces = computed(() => this.store.places().filter((place) => !place.visited).length);
  readonly busy = signal(false);
  readonly actionMessage = signal('');

  async retry(): Promise<void> {
    this.busy.set(true);
    await this.store.retry();
    this.busy.set(false);
  }

  async importLocal(): Promise<void> {
    this.busy.set(true);
    try {
      const imported = await this.store.importLocalData();
      if (imported) this.actionMessage.set('Tu cuaderno anterior se ha importado correctamente.');
    } catch {
      // TripStore mantiene los datos locales y expone el error.
    } finally {
      this.busy.set(false);
    }
  }

  async loadDemo(): Promise<void> {
    this.busy.set(true);
    try {
      await this.store.seedDemo();
      this.actionMessage.set('Datos de muestra añadidos a tu cuenta.');
    } catch {
      // TripStore exposes the safe error.
    } finally {
      this.busy.set(false);
    }
  }
}
