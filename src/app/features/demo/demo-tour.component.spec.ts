import { TestBed } from '@angular/core/testing';
import { DemoTourComponent, type DemoTourStep } from './demo-tour.component';

describe('DemoTourComponent', () => {
  const steps: readonly DemoTourStep[] = [
    {
      targetId: 'first',
      eyebrow: 'Primero',
      title: 'Primer paso',
      description: 'Descripción inicial',
    },
    {
      targetId: 'second',
      eyebrow: 'Después',
      title: 'Segundo paso',
      description: 'Descripción final',
    },
  ];

  it('avanza, retrocede y comunica que la guía se ha saltado', async () => {
    await TestBed.configureTestingModule({ imports: [DemoTourComponent] }).compileComponents();
    const fixture = TestBed.createComponent(DemoTourComponent);
    const component = fixture.componentInstance;
    const results: string[] = [];
    component.closed.subscribe((result) => results.push(result));
    fixture.componentRef.setInput('steps', steps);
    fixture.componentRef.setInput('active', true);
    fixture.detectChanges();

    expect(component.current()?.title).toBe('Primer paso');
    component.next();
    expect(component.current()?.title).toBe('Segundo paso');
    component.previous();
    expect(component.current()?.title).toBe('Primer paso');

    component.skip();
    expect(results).toEqual(['skipped']);
    expect(component.index()).toBe(0);
  });

  it('termina la guía desde el último paso', async () => {
    await TestBed.configureTestingModule({ imports: [DemoTourComponent] }).compileComponents();
    const fixture = TestBed.createComponent(DemoTourComponent);
    const component = fixture.componentInstance;
    const results: string[] = [];
    component.closed.subscribe((result) => results.push(result));
    fixture.componentRef.setInput('steps', steps);
    fixture.componentRef.setInput('active', true);
    fixture.detectChanges();

    component.next();
    component.next();

    expect(results).toEqual(['completed']);
    expect(component.index()).toBe(0);
  });
});
