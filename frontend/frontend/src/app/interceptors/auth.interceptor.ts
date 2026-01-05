import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
} from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private username = 'admin';
  private password = 'admin';

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    // Only add auth header for API requests
    if (req.url.includes('/api/')) {
      const encodedAuth = btoa(`${this.username}:${this.password}`);
      req = req.clone({
        setHeaders: {
          Authorization: `Basic ${encodedAuth}`,
        },
      });
    }

    return next.handle(req);
  }
}
