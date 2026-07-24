import { TestBed } from '@angular/core/testing';
import { FeedbackService } from './feedback.service';

describe('FeedbackService', () => {
  it('resolves an accessible confirmation without using window.confirm', async () => {
    TestBed.configureTestingModule({ providers: [FeedbackService] });
    const service = TestBed.inject(FeedbackService);
    const answer = service.confirm({
      title: 'Eliminar',
      message: 'Confirma la acción',
      danger: true,
    });

    expect(service.confirmation()?.title).toBe('Eliminar');
    service.answer(true);

    await expect(answer).resolves.toBe(true);
    expect(service.confirmation()).toBeNull();
  });
});
