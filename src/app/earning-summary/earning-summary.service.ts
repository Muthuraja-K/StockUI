import { Injectable } from '@angular/core';
import { Observable, catchError, of, map } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';
import { EarningData, EarningSummaryResponse } from '../stock-info/models';

@Injectable({ providedIn: 'root' })
export class EarningSummaryService {
  private readonly apiUrl = environment.stockApiBaseUrl + '/api/earning-summary';

  constructor(private http: HttpClient) {}

  getEarningSummary(
    sectors?: string[],
    dateFrom?: string,
    dateTo?: string,
    page: number = 1,
    perPage: number = 10
  ): Observable<EarningSummaryResponse> {
    let url = `${this.apiUrl}?page=${page}&per_page=${perPage}`;
    
    if (sectors && sectors.length > 0) {
      url += `&sectors=${encodeURIComponent(sectors.join(','))}`;
    }
    
    if (dateFrom && dateFrom.trim() !== '') {
      url += `&date_from=${encodeURIComponent(dateFrom.trim())}`;
    }
    
    if (dateTo && dateTo.trim() !== '') {
      url += `&date_to=${encodeURIComponent(dateTo.trim())}`;
    }

    return this.http.get<EarningSummaryResponse>(url).pipe(
      catchError(() => of({
        page: 1,
        per_page: perPage,
        total: 0,
        results: []
      }))
    );
  }
} 