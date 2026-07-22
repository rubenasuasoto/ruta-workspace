import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
@Component({ selector: 'app-not-found', imports: [RouterLink], template: `<section class="lost"><p class="eyebrow">Error 404</p><h1>Esta ruta no<br><i>lleva a ninguna parte.</i></h1><p>Puede que el destino haya cambiado, pero siempre puedes volver a empezar.</p><a class="button coral" routerLink="/">Volver al inicio</a></section>`, styles: `.lost{align-content:center;min-height:calc(100vh - 72px);padding:3rem max(1.25rem,10vw)}h1{font-size:clamp(3.2rem,8vw,7.5rem);line-height:.93;margin:.7rem 0 1.3rem}i{color:var(--coral)}p:not(.eyebrow){color:var(--muted);max-width:27rem}` })
export class NotFoundPage {}
