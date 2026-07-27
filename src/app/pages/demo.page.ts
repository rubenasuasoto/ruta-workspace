import { Component, ViewChild, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import type { DemoTab } from '../features/demo/demo-workspace.component';
import { DemoWorkspaceComponent } from '../features/demo/demo-workspace.component';
import { DemoSnapshotStore } from '../features/demo/demo-snapshot.store';
import {
  DemoTourComponent,
  type DemoTourStep,
} from '../features/demo/demo-tour.component';

@Component({
  selector: 'app-demo',
  imports: [DemoWorkspaceComponent, DemoTourComponent],
  template: `
    @if (demo.snapshot(); as snapshot) {
      <div class="demo-toolbar">
        <div>
          <strong>Estás explorando una demostración</strong>
          <span>Los datos están guardados localmente y no pertenecen a ninguna persona.</span>
        </div>
        <button type="button" class="button coral" (click)="startTour()">Iniciar guía</button>
      </div>
      <app-demo-workspace #workspace [snapshot]="snapshot" />
      <app-demo-tour
        [active]="tourActive()"
        [steps]="tourSteps"
        (stepChanged)="showTourSection($event)"
        (closed)="closeTour()"
      />
    } @else if (demo.loading()) {
      <section class="demo-state" aria-live="polite">
        <span class="spinner" aria-hidden="true"></span>
        <h1>Preparando el viaje de ejemplo…</h1>
        <p>Cargando la instantánea local de Valencia.</p>
      </section>
    } @else {
      <section class="demo-state" role="alert">
        <h1>No hemos podido abrir la demo</h1>
        <p>{{ demo.error() }}</p>
        <button type="button" class="button coral" (click)="retry()">Reintentar</button>
      </section>
    }
  `,
  styles: `
    .demo-toolbar {
      align-items: center;
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 0.9rem;
      display: flex;
      gap: 1rem;
      justify-content: space-between;
      margin: 1rem auto 0;
      max-width: 1280px;
      padding: 0.8rem 1rem;
    }
    .demo-toolbar div {
      display: grid;
      gap: 0.2rem;
    }
    .demo-toolbar span {
      color: var(--muted);
      font-size: 0.82rem;
    }
    .demo-state {
      margin: 8rem auto;
      max-width: 620px;
      padding: 2rem;
      text-align: center;
    }
    .demo-state h1 {
      font-size: clamp(2.5rem, 7vw, 5rem);
      line-height: 0.95;
    }
    .spinner {
      animation: spin 800ms linear infinite;
      border: 3px solid var(--line);
      border-radius: 50%;
      border-top-color: var(--coral);
      display: inline-block;
      height: 2rem;
      width: 2rem;
    }
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
    @media (max-width: 640px) {
      .demo-toolbar {
        align-items: stretch;
        border-radius: 0;
        flex-direction: column;
        margin-top: 0;
      }
    }
  `,
})
export class DemoPage {
  readonly demo = inject(DemoSnapshotStore);
  readonly tourActive = signal(false);
  readonly tourSteps: readonly DemoTourStep[] = [
    {
      targetId: 'demo-overview',
      context: 'overview',
      eyebrow: 'Paso 1 · Resumen',
      title: 'Empieza con el viaje completo.',
      description:
        'Fechas, planificación, presupuesto, actividades y lugares se reúnen en la misma vista.',
    },
    {
      targetId: 'demo-itinerary',
      context: 'itinerary',
      eyebrow: 'Paso 2 · Itinerario',
      title: 'Organiza cada día.',
      description:
        'Las actividades muestran hora, tipo, coste, ubicación y el medio previsto hasta la siguiente parada.',
    },
    {
      targetId: 'demo-budget',
      context: 'budget',
      eyebrow: 'Paso 3 · Presupuesto',
      title: 'Controla el gasto antes de viajar.',
      description:
        'El total y las categorías se comparan con el límite definido. En esta demo los importes son orientativos.',
    },
    {
      targetId: 'demo-map',
      context: 'map',
      eyebrow: 'Paso 4 · Mapa',
      title: 'Comprueba el orden sobre el terreno.',
      description:
        'Las ubicaciones y rutas de Valencia se calcularon una vez y están guardadas en la demo, sin llamadas externas al explorarla.',
    },
    {
      targetId: 'demo-places',
      context: 'places',
      eyebrow: 'Paso 5 · Lugares',
      title: 'Guarda ideas para más tarde.',
      description:
        'Los lugares conservan categoría, notas, dirección y coordenadas para poder incorporarlos al itinerario.',
    },
    {
      targetId: 'demo-project',
      context: 'project',
      eyebrow: 'Paso 6 · Proyecto',
      title: 'Mira cómo está construida Ruta.',
      description:
        'La última sección explica la arquitectura, la privacidad y las decisiones técnicas que sostienen la experiencia.',
    },
  ];

  @ViewChild('workspace') private workspace?: DemoWorkspaceComponent;

  constructor() {
    const route = inject(ActivatedRoute);
    void this.demo.load().then(() => {
      if (route.snapshot.queryParamMap.get('tour') === '1' && this.demo.snapshot()) {
        this.tourActive.set(true);
      }
    });
  }

  startTour(): void {
    this.workspace?.selectTab('overview');
    this.tourActive.set(true);
  }

  closeTour(): void {
    this.tourActive.set(false);
  }

  showTourSection(step: DemoTourStep): void {
    this.workspace?.selectTab((step.context ?? 'overview') as DemoTab);
  }

  retry(): void {
    void this.demo.load();
  }
}
