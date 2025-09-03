import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, User } from './auth/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, CommonModule],
  templateUrl: './app.html',
  standalone: true,
  styleUrl: './app.scss'
})
export class App implements OnInit {
  currentUser: User | null = null;
  isAuthenticated = false;
  isAdmin = false;
  isSuperuser = false;
  isMobileMenuOpen = false;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    // Subscribe to user changes
    this.authService.currentUser.subscribe(user => {
      console.log('Current user data:', user);
      this.currentUser = user;
      this.isAuthenticated = !!user;
      this.isAdmin = user?.role === 'admin';
      // Superuser check: Only users with username "superuser" can access download functionality
      this.isSuperuser = user?.username === 'superuser';
    });

    // Refresh user data from server to get updated firstname/lastname
    this.authService.refreshUserData();
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu() {
    this.isMobileMenuOpen = false;
  }

  logout() {
    // Clear all authentication data
    this.authService.logout();
    
    // Clear any additional cookies or session data
    this.clearAllCookies();
    
    // Navigate to login page
    this.router.navigate(['/login']);
  }

  private clearAllCookies(): void {
    // Clear all cookies by setting them to expire in the past
    const cookies = document.cookie.split(';');
    
    for (let cookie of cookies) {
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      
      // Set cookie to expire in the past to delete it
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname};`;
    }
    
    // Also clear sessionStorage
    sessionStorage.clear();
  }
}
