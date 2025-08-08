import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DownloadResponse {
  success: boolean;
  data?: any;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DownloadService {
  private apiUrl = 'http://localhost:5000/api';

  constructor(private http: HttpClient) {}

  downloadFile(fileType: 'users' | 'stocks' | 'sectors'): Observable<any> {
    return this.http.get(`${this.apiUrl}/download/${fileType}`);
  }

  downloadAsJson(data: any, filename: string): void {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  downloadUsers(): Observable<any> {
    return this.downloadFile('users');
  }

  downloadStocks(): Observable<any> {
    return this.downloadFile('stocks');
  }

  downloadSectors(): Observable<any> {
    return this.downloadFile('sectors');
  }
} 