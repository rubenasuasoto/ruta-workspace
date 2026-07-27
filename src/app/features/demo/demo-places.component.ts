import { Component, inject, output } from '@angular/core';
import { FeedbackService } from '../../core/feedback.service';
import { googleMapsDirectionsUrl } from '../map/map-directions';
import type { DemoPlace } from './demo-snapshot.model';
import { DemoSandboxStore } from './demo-sandbox.store';

@Component({
  selector: 'app-demo-places',
  template: `
    @if (store.snapshot(); as snapshot) {
      <section id="demo-places" role="tabpanel" aria-label="Lugares guardados">
        <div class="heading">
          <div><p class="eyebrow">Lugares guardados</p><h2>Ideas que ya tienen sitio.</h2></div>
          <button type="button" class="button coral" (click)="addPlace.emit()">+ Guardar lugar</button>
        </div>
        <div class="grid">
          @for (place of snapshot.places; track place.id) {
            <article>
              <img [src]="place.image" [alt]="place.name" />
              <div class="copy">
                <small>{{ kindLabel(place.category) }} · {{ place.visited ? 'Visitado' : 'Pendiente' }}</small>
                <h3>{{ place.name }}</h3>
                <p>{{ place.note }}</p>
                <address>{{ place.address }}</address>
                <footer>
                  <a [href]="mapsUrl(place)" target="_blank" rel="noopener noreferrer">Abrir en Maps ↗</a>
                  <button type="button" (click)="editPlace.emit(place)">Editar</button>
                  <button type="button" (click)="remove(place)">Eliminar</button>
                </footer>
              </div>
            </article>
          } @empty {
            <div class="empty"><h3>Tu colección está vacía</h3><p>Guarda un lugar para probar la demo.</p></div>
          }
        </div>
      </section>
    }
  `,
  styles: `
    .heading{align-items:end;display:flex;gap:1rem;justify-content:space-between;margin-bottom:1.5rem}.heading h2{font-size:clamp(2.5rem,5vw,4.6rem);line-height:1;margin:.35rem 0}.grid{display:grid;gap:1rem;grid-template-columns:repeat(2,1fr)}article{background:var(--paper);border:1px solid var(--line);border-radius:1rem;display:grid;grid-template-columns:minmax(160px,.8fr) 1.2fr;overflow:hidden}article>img{height:100%;min-height:250px;object-fit:cover;width:100%}.copy{padding:1.2rem}.copy>small,.copy>p,address{color:var(--muted);font-size:.72rem}.copy h3{font-size:1.8rem;margin:.35rem 0}.copy>p{line-height:1.55}.copy address{font-style:normal}.copy footer{display:flex;flex-wrap:wrap;gap:.6rem;margin-top:1.2rem}.copy footer a,.copy footer button{background:transparent;border:0;color:var(--deep);font-size:.68rem;font-weight:800;padding:0;text-decoration:underline}.copy footer button:last-child{color:#9e3423}.empty{border:1px dashed var(--line);border-radius:1rem;grid-column:1/-1;padding:3rem;text-align:center}.empty p{color:var(--muted)}
    @media(max-width:950px){.grid{grid-template-columns:1fr}}@media(max-width:560px){.heading{align-items:flex-start;flex-direction:column}.grid article{grid-template-columns:1fr}article>img{min-height:190px}}
  `,
})
export class DemoPlacesComponent {
  readonly store = inject(DemoSandboxStore);
  readonly addPlace = output<void>();
  readonly editPlace = output<DemoPlace>();
  private readonly feedback = inject(FeedbackService);

  mapsUrl(place: DemoPlace): string {
    return googleMapsDirectionsUrl(place.latitude, place.longitude);
  }
  kindLabel(kind: DemoPlace['category']): string {
    return { comida:'Comida', cultura:'Cultura', naturaleza:'Naturaleza', traslado:'Traslado', alojamiento:'Alojamiento', otro:'Experiencia' }[kind];
  }
  async remove(place: DemoPlace): Promise<void> {
    if (await this.feedback.confirm({ title:'Eliminar lugar', message:`${place.name} se eliminará de la demo. Las actividades conservarán su ubicación.`, confirmLabel:'Eliminar', danger:true })) {
      this.store.removePlace(place.id);
      this.feedback.notify('Lugar eliminado.', 'info');
    }
  }
}
