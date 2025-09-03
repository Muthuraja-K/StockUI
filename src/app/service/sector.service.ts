import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class SectorService {
  private apiUrl = environment.stockApiBaseUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getSectors(filter: string = ''): Observable<any> {
    const params: any = filter ? { filter } : {};
    
    // Check authentication status
    if (!this.authService.isAuthenticated) {
      console.error('User not authenticated for sectors request');
      return new Observable(observer => {
        observer.error('User not authenticated');
        observer.complete();
      });
    }
    
    // Get the auth token
    const token = this.authService.getToken();
    const headers: { [key: string]: string } = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return this.http.get(`${this.apiUrl}/api/sectors`, { params, headers });
  }

  addSector(sector: any): Observable<any> {
    // Check authentication status
    if (!this.authService.isAuthenticated) {
      console.error('User not authenticated for add sector request');
      return new Observable(observer => {
        observer.error('User not authenticated');
        observer.complete();
      });
    }
    
    // Get the auth token
    const token = this.authService.getToken();
    const headers: { [key: string]: string } = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return this.http.post(`${this.apiUrl}/api/sectors`, sector, { headers });
  }

  updateSector(oldSector: string, sector: any): Observable<any> {
    // Check authentication status
    if (!this.authService.isAuthenticated) {
      console.error('User not authenticated for update sector request');
      return new Observable(observer => {
        observer.error('User not authenticated');
        observer.complete();
      });
    }
    
    // Get the auth token
    const token = this.authService.getToken();
    const headers: { [key: string]: string } = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return this.http.put(`${this.apiUrl}/api/sectors/update`, {
      oldSector,
      newSector: sector.sector
    }, { headers });
  }

  deleteSector(sector: string): Observable<any> {
    // Check authentication status
    if (!this.authService.isAuthenticated) {
      console.error('User not authenticated for delete sector request');
      return new Observable(observer => {
        observer.error('User not authenticated');
        observer.complete();
      });
    }
    
    // Get the auth token
    const token = this.authService.getToken();
    const headers: { [key: string]: string } = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return this.http.post(`${this.apiUrl}/api/sectors/delete`, { sector }, { headers });
  }
}
