import { Component } from '@angular/core';

@Component({
  selector: 'app-demo-case-study',
  template: `
    <section id="demo-architecture" class="case-section" aria-labelledby="architecture-title">
      <header>
        <p class="eyebrow">Cómo está construida</p>
        <h2 id="architecture-title">Una aplicación completa, no una maqueta.</h2>
        <p>
          La interfaz, la API y los datos permanecen separados para que cada parte pueda evolucionar
          sin acoplar el resto del producto.
        </p>
      </header>
      <div class="architecture" aria-label="Arquitectura técnica de Ruta">
        <article><span>01</span><strong>Angular 22</strong><p>Signals, formularios reactivos, Leaflet y cliente OpenAPI.</p></article>
        <i aria-hidden="true">→</i>
        <article><span>02</span><strong>NestJS 11</strong><p>Autenticación, permisos, IA, rutas y procesamiento de imágenes.</p></article>
        <i aria-hidden="true">→</i>
        <article><span>03</span><strong>PostgreSQL + S3</strong><p>Datos privados, migraciones reproducibles y archivos protegidos.</p></article>
      </div>
    </section>

    <section id="demo-security" class="case-section security" aria-labelledby="security-title">
      <header>
        <p class="eyebrow">Privacidad desde el diseño</p>
        <h2 id="security-title">La parte invisible también forma parte del producto.</h2>
      </header>
      <div class="decision-grid">
        <article><strong>Solo por invitación</strong><p>No existe registro abierto. Cada invitación caduca y solo puede utilizarse una vez.</p></article>
        <article><strong>Sesiones protegidas</strong><p>JWT breve en memoria y renovación mediante cookie HttpOnly rotatoria.</p></article>
        <article><strong>Imágenes privadas</strong><p>Sharp elimina EXIF y GPS; los objetos se sirven mediante URLs firmadas breves.</p></article>
        <article><strong>Servicios aislados</strong><p>Las claves de OpenAI y HeiGIT permanecen exclusivamente en NestJS.</p></article>
      </div>
    </section>

    <section id="demo-decisions" class="case-section decisions" aria-labelledby="decisions-title">
      <p class="eyebrow">Decisiones y aprendizaje</p>
      <h2 id="decisions-title">Un proyecto pensado para crecer sin ocultar sus límites.</h2>
      <div>
        <p>Las sugerencias de IA son borradores confirmables, nunca datos que se guardan solos.</p>
        <p>Las rutas respetan el orden manual y diferencian estimaciones de navegación real.</p>
        <p>La demo reproduce una captura local versionada, sin cuentas, analítica ni llamadas a proveedores durante la visita.</p>
      </div>
      <nav aria-label="Código fuente de Ruta">
        <a href="https://github.com/rubenasuasoto/ruta-workspace" rel="noreferrer">Código Angular ↗</a>
        <a href="https://github.com/rubenasuasoto/ruta-api" rel="noreferrer">Código API ↗</a>
      </nav>
    </section>
  `,
  styles: `
    .case-section {
      border-top: 1px solid var(--line);
      margin-top: 5rem;
      padding-top: 4rem;
    }
    header {
      max-width: 850px;
    }
    h2 {
      font-size: clamp(2.6rem, 6vw, 5.3rem);
      line-height: 0.98;
      margin: 0.7rem 0 1rem;
    }
    header > p:last-child,
    article p,
    .decisions > div {
      color: var(--muted);
      line-height: 1.65;
    }
    .architecture {
      align-items: stretch;
      display: grid;
      gap: 1rem;
      grid-template-columns: 1fr auto 1fr auto 1fr;
      margin-top: 2.5rem;
    }
    .architecture article,
    .decision-grid article {
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 1rem;
      padding: 1.4rem;
    }
    .architecture > i {
      align-self: center;
      color: var(--coral);
      font-size: 1.7rem;
      font-style: normal;
    }
    article span {
      color: var(--coral);
      display: block;
      font-size: 0.7rem;
      font-weight: 800;
      margin-bottom: 1.4rem;
    }
    article strong {
      font-family: var(--font-display);
      font-size: 1.6rem;
    }
    .decision-grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(2, 1fr);
      margin-top: 2.5rem;
    }
    .decisions {
      background: var(--ink);
      border-radius: 1.2rem;
      color: #fff;
      padding: clamp(2rem, 6vw, 5rem);
    }
    .decisions > div {
      color: #d8e3df;
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(3, 1fr);
      margin: 2rem 0;
    }
    .decisions nav {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .decisions a {
      border: 1px solid #ffffff73;
      border-radius: 2rem;
      color: #fff;
      padding: 0.75rem 1rem;
      text-decoration: none;
    }
    @media (max-width: 800px) {
      .architecture,
      .decision-grid,
      .decisions > div {
        grid-template-columns: 1fr;
      }
      .architecture > i {
        justify-self: center;
        transform: rotate(90deg);
      }
    }
  `,
})
export class DemoCaseStudyComponent {}
