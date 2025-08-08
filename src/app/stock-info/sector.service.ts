import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class SectorService {
  private readonly apiUrl = environment.stockApiBaseUrl + '/api/sectors';

  getSectors(filter?: string, page: number = 1, perPage: number = 10) {
    let url = this.apiUrl + `?page=${page}&per_page=${perPage}`;
    if (filter && filter.trim() !== '') {
      url += `&filter=${encodeURIComponent(filter.trim())}`;
    }
   
    console.log('Fetching sectors from URL:', url);
    
    return this.http.get<any>(url).pipe(
      map(response => {
        console.log('Raw sector response:', response);
        return {
          total: response.total,
          page: response.page,
          per_page: response.per_page,
          results: response.results
        };
      })
    );

  }

  addSector(sector: string) {
    return this.http.post(this.apiUrl, { sector });
  }

  updateSector(oldSector: string, newSector: string) {
    return this.http.put(`${this.apiUrl}/update`, { oldSector, newSector });
  }

  deleteSector(sector: string) {
    return this.http.post(`${this.apiUrl}/delete`, { sector });
  }

  constructor(private http: HttpClient) {}
} 