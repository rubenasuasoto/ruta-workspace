import { DatePipe } from '@angular/common';
import { Component, HostListener, ViewChild, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FeedbackService } from '../core/feedback.service';
import type { DemoTab } from '../features/demo/demo-workspace.component';
import { DemoWorkspaceComponent } from '../features/demo/demo-workspace.component';
import { DemoSandboxStore } from '../features/demo/demo-sandbox.store';
import {
  DemoTourComponent,
  type DemoTourStep,
} from '../features/demo/demo-tour.component';
import { DEMO_EXIT_TARGET } from '../features/demo/demo-exit-target';

@Component({
  selector: 'app-demo',
  imports: [DatePipe, DemoWorkspaceComponent, DemoTourComponent],
  template: `
    @if (demo.snapshot(); as snapshot) {
      <div class="demo-toolbar">
        <div>
          <strong>Demo de portafolio</strong>
          <span>
            Guardado en este navegador
            @if (demo.lastSavedAt(); as savedAt) { · {{ savedAt | date: 'HH:mm' }} }
          </span>
        </div>
        <nav aria-label="Acciones de la demo">
          <button type="button" (click)="startTour()">Iniciar guía</button>
          <button type="button" (click)="restore()">Restaurar viaje</button>
          <button type="button" class="exit" (click)="exit()">Salir de la demo</button>
        </nav>
      </div>
      <app-demo-workspace #workspace [snapshot]="snapshot" (exitRequested)="exit()" />
      <app-demo-tour
        [active]="tourActive()"
        [steps]="tourSteps"
        (stepChanged)="showTourSection($event)"
        (closed)="closeTour($event)"
      />
      @if (tourCompleted()) {
        <div class="complete-backdrop">
          <section class="complete" role="dialog" aria-modal="true" aria-labelledby="complete-title">
            <p class="eyebrow">Recorrido completado</p>
            <h2 id="complete-title">Ahora la demo es tuya.</h2>
            <p>Puedes editar el itinerario, probar el borrador local o revisar cómo está construido el proyecto.</p>
            <div>
              <button type="button" class="button secondary" (click)="continueExploring()">Seguir explorando</button>
              <button type="button" class="button coral" (click)="showProject()">Ver el proyecto</button>
              <button type="button" class="text-button" (click)="exit()">{{ exitTarget.label }}</button>
            </div>
          </section>
        </div>
      }
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
      position: sticky;
      top: 76px;
      z-index: 40;
    }
    .demo-toolbar div {
      display: grid;
      gap: 0.2rem;
    }
    .demo-toolbar span {
      color: var(--muted);
      font-size: 0.82rem;
    }
    .demo-toolbar nav{display:flex;flex-wrap:wrap;gap:.45rem}.demo-toolbar nav button{background:transparent;border:1px solid var(--line);border-radius:2rem;color:var(--deep);font-size:.72rem;font-weight:800;padding:.55rem .8rem}.demo-toolbar nav .exit{background:var(--coral);border-color:var(--coral);color:#fff}
    .complete-backdrop{align-items:center;background:#12242488;display:flex;inset:0;justify-content:center;padding:1rem;position:fixed;z-index:130}.complete{background:var(--paper);border-radius:1rem;box-shadow:0 24px 80px #0005;max-width:620px;padding:clamp(1.5rem,5vw,3rem);text-align:center}.complete h2{font-size:clamp(2.5rem,6vw,4rem);line-height:1;margin:.5rem 0}.complete>p:not(.eyebrow){color:var(--muted);line-height:1.6}.complete>div{display:flex;flex-wrap:wrap;gap:.6rem;justify-content:center;margin-top:1.5rem}.text-button{background:transparent;border:0;color:var(--deep);font-weight:800;text-decoration:underline}
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
        position:static;
      }
      .demo-toolbar nav{display:grid;grid-template-columns:1fr 1fr}.demo-toolbar nav .exit{grid-column:1/-1}
    }
  `,
})
export class DemoPage {
  readonly demo = inject(DemoSandboxStore);
  readonly tourActive = signal(false);
  readonly tourCompleted = signal(false);
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
  private readonly router = inject(Router);
  private readonly feedback = inject(FeedbackService);
  protected readonly exitTarget = inject(DEMO_EXIT_TARGET);

  constructor() {
    const route = inject(ActivatedRoute);
    void this.demo.load().then(() => {
      if (route.snapshot.queryParamMap.get('tour') === '1' && this.demo.snapshot()) {
        this.tourActive.set(true);
      }
    });
  }

  startTour(): void {
    this.tourCompleted.set(false);
    this.workspace?.selectTab('overview');
    this.tourActive.set(true);
  }

  closeTour(result: 'skipped' | 'completed'): void {
    this.tourActive.set(false);
    this.tourCompleted.set(result === 'completed');
  }

  showTourSection(step: DemoTourStep): void {
    this.workspace?.selectTab((step.context ?? 'overview') as DemoTab);
  }

  retry(): void {
    void this.demo.load();
  }

  async restore(): Promise<void> {
    const accepted = await this.feedback.confirm({
      title: 'Restaurar viaje de demostración',
      message: 'Se eliminarán únicamente los cambios guardados por esta demo en este navegador.',
      confirmLabel: 'Restaurar',
      danger: true,
    });
    if (!accepted) return;
    this.demo.reset();
    this.workspace?.selectTab('overview');
    this.feedback.notify('La demo ha vuelto a su estado original.', 'info');
  }

  async exit(): Promise<void> {
    if (this.exitTarget.external) {
      const canLeave = await this.canLeaveDemo();
      if (!canLeave) return;
      window.location.assign(this.exitTarget.url);
      return;
    }
    await this.router.navigateByUrl(this.exitTarget.url);
  }

  canLeaveDemo(): boolean | Promise<boolean> {
    if (!this.workspace?.hasPendingChanges()) return true;
    return this.feedback.confirm({
        title: 'Salir con cambios pendientes',
        message: 'Hay un formulario o borrador que todavía no se ha incorporado a la demo.',
        confirmLabel: 'Salir',
      });
  }

  continueExploring(): void {
    this.tourCompleted.set(false);
    this.workspace?.selectTab('itinerary');
  }

  showProject(): void {
    this.tourCompleted.set(false);
    this.workspace?.selectTab('project');
  }

  @HostListener('window:beforeunload', ['$event'])
  warnBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.workspace?.hasPendingChanges()) event.preventDefault();
  }
}
