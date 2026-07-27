import type { CanDeactivateFn } from '@angular/router';

export interface DemoExitAware {
  canLeaveDemo(): boolean | Promise<boolean>;
}

export const demoExitGuard: CanDeactivateFn<DemoExitAware> = (component) =>
  component.canLeaveDemo();
