import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, map, take } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.authService.currentUser.pipe(
      take(1),
      map(user => {
        if (user) {
          // Check if route requires admin access
          const requiresAdmin = route.data['requiresAdmin'];
          if (requiresAdmin && user.role !== 'admin') {
            // User is not admin but route requires admin access
            this.router.navigate(['/dashboard']);
            return false;
          }
          
          // Check if route requires superuser access
          const requiresSuperuser = route.data['requiresSuperuser'];
          if (requiresSuperuser && user.username !== 'superuser') {
            // User is not superuser but route requires superuser access
            this.router.navigate(['/dashboard']);
            return false;
          }
          
          return true;
        } else {
          // User is not authenticated
          this.router.navigate(['/login']);
          return false;
        }
      })
    );
  }
} 