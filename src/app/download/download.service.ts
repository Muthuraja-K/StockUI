import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class DownloadService {
  private apiUrl = environment.stockApiBaseUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  downloadFile(fileType: string): Observable<any> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.get(`${this.apiUrl}/api/download/${fileType}`, { headers });
  }
}
