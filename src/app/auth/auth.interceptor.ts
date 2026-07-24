import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthStore } from './auth.store';

const sessionPaths = [
  '/auth/login',
  '/auth/register',
  '/auth/google',
  '/auth/refresh',
  '/auth/verify-email',
  '/auth/confirm-email-change',
  '/auth/resend-verification',
  '/auth/forgot-password',
  '/auth/reset-password',
];

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthStore);
  const isApi = request.url.startsWith('/api') || request.url.startsWith('http://localhost:3000');
  if (!isApi) return next(request);

  const withAuth = (token: string | null) =>
    request.clone({
      withCredentials: true,
      setHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    });

  return next(withAuth(auth.accessToken())).pipe(
    catchError((error: unknown) => {
      const canRefresh =
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !sessionPaths.some((path) => request.url.includes(path));
      if (!canRefresh) return throwError(() => error);
      return from(auth.refresh()).pipe(
        switchMap((token) => (token ? next(withAuth(token)) : throwError(() => error))),
      );
    }),
  );
};
