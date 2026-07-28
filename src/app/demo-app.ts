import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FeedbackComponent } from './core/feedback.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FeedbackComponent],
  template: `
    <main>
      <router-outlet />
    </main>
    <app-feedback />
  `,
})
export class DemoApp {}
