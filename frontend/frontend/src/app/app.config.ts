import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors, HTTP_INTERCEPTORS, withInterceptorsFromDi } from '@angular/common/http';
import { AuthInterceptor } from './interceptors/auth.interceptor';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptorsFromDi()),
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    provideRouter(routes)
  ]
};
