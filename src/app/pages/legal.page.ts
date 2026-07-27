import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LegalStore } from '../features/legal/legal.store';

@Component({
  selector: 'app-legal',
  imports: [RouterLink],
  template: `
    <article class="legal-page">
      @if (document()) {
        <p class="eyebrow">Información permanente</p>
        <h1>{{ document()!.title }}</h1>
        <p class="version">
          Versión {{ document()!.version }} · vigente desde
          {{ document()!.effectiveDate }}
        </p>
        @for (section of document()!.sections; track section.heading) {
          <section>
            <h2>{{ section.heading }}</h2>
            @for (paragraph of section.paragraphs; track paragraph) {
              <p>{{ paragraph }}</p>
            }
          </section>
        }
        @if (key === 'notice-action') {
          <p class="notice">
            Ruta es un espacio privado. Si necesitas retirar una imagen o un dato, utiliza el correo
            de contacto indicado en este documento.
          </p>
        }
      } @else if (legal.loading()) {
        <p role="status">Cargando documento…</p>
      } @else {
        <div class="empty">
          <h1>Documento no disponible</h1>
          <p>{{ legal.error() }}</p>
          <a routerLink="/">Volver al inicio</a>
        </div>
      }
    </article>
  `,
  styles: `
    .legal-page {
      margin: 0 auto;
      max-width: 820px;
      padding: clamp(2rem, 6vw, 5rem) 1.25rem;
    }
    .legal-page h1 {
      font-size: clamp(2.8rem, 6vw, 5rem);
      margin: 0.4rem 0;
    }
    .version {
      border-bottom: 1px solid var(--line);
      color: var(--muted);
      padding-bottom: 1.5rem;
    }
    .legal-page section {
      margin: 2.4rem 0;
    }
    .legal-page h2 {
      font-size: 1.65rem;
    }
    .legal-page section p {
      color: var(--muted);
      line-height: 1.75;
    }
    .notice {
      background: var(--paper);
      border-left: 3px solid var(--coral);
      padding: 1rem;
    }
  `,
})
export class LegalPage {
  readonly legal = inject(LegalStore);
  readonly key = inject(ActivatedRoute).snapshot.data['document'] as string;
  readonly document = () => this.legal.document(this.key);

  constructor() {
    void this.legal.load();
  }
}
