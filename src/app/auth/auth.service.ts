import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../environments/environment';

export interface User {
  username: string;
  role: 'admin' | 'user';
  firstname: string;
  lastname: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  username?: string;
  role?: string;
  firstname?: string;
  lastname?: string;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.stockApiBaseUrl + '/api';
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;

  constructor(private http: HttpClient) {
    this.currentUserSubject = new BehaviorSubject<User | null>(this.getUserFromStorage());
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  public get isAuthenticated(): boolean {
    return !!this.currentUserValue;
  }

  public get isAdmin(): boolean {
    return this.currentUserValue?.role === 'admin';
  }

  public get isUser(): boolean {
    return this.currentUserValue?.role === 'user';
  }

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { username, password })
      .pipe(
        map(response => {
          if (response.success && response.token && response.username && response.role) {
            // Store user details and token in localStorage
            const userData: User = {
              username: response.username,
              role: response.role as 'admin' | 'user',
              firstname: response.firstname || '',
              lastname: response.lastname || ''
            };
            localStorage.setItem('currentUser', JSON.stringify(userData));
            localStorage.setItem('token', response.token);
            
            // Update the current user subject
            this.currentUserSubject.next(userData);
          }
          return response;
        })
      );
  }

  refreshUserData(): void {
    // Force refresh user data from token
    this.verifyToken().subscribe();
  }

  logout(): void {
    // Remove user from localStorage
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    
    // Clear any other auth-related items that might exist
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('userToken');
    
    // Clear sessionStorage as well
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('userToken');
    
    // Update the current user subject
    this.currentUserSubject.next(null);
  }

  verifyToken(): Observable<boolean> {
    const token = localStorage.getItem('token');
    if (!token) {
      return new Observable(observer => {
        observer.next(false);
        observer.complete();
      });
    }

    return this.http.post<{valid: boolean, username?: string, role?: string, firstname?: string, lastname?: string}>(`${this.apiUrl}/verify-token`, { token })
      .pipe(
        map(response => {
          console.log('Token verification response:', response);
          if (response.valid && response.username && response.role) {
            // Update stored user info
            const userData: User = {
              username: response.username,
              role: response.role as 'admin' | 'user',
              firstname: response.firstname || '',
              lastname: response.lastname || ''
            };
            console.log('Updating user data:', userData);
            localStorage.setItem('currentUser', JSON.stringify(userData));
            
            // Update the current user subject
            this.currentUserSubject.next(userData);
            return true;
          } else {
            this.logout();
            return false;
          }
        })
      );
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  private getUserFromStorage(): User | null {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        // Ensure firstname and lastname fields exist (backward compatibility)
        return {
          username: user.username || '',
          role: (user.role || 'user') as 'admin' | 'user',
          firstname: user.firstname || '',
          lastname: user.lastname || ''
        };
      } catch {
        return null;
      }
    }
    return null;
  }
} 