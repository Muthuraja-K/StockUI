import { Injectable } from '@angular/core';
import { Observable, catchError, of, map } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';
import { StockSummaryData, SectorGroup, StockSummaryResponse } from '../stock-info/models';

@Injectable({ providedIn: 'root' })
export class StockSummaryService {
  private readonly apiUrl = environment.stockApiBaseUrl + '/api/stock-summary';

  constructor(private http: HttpClient) {}

  getStockSummary(
    sectors?: string[],
    isxticker?: boolean | null,
    dateFrom?: string,
    dateTo?: string
  ): Observable<StockSummaryResponse> {
    let url = `${this.apiUrl}?`;
    
    if (sectors && sectors.length > 0) {
      url += `sectors=${encodeURIComponent(sectors.join(','))}`;
    }
    
    if (isxticker !== null && isxticker !== undefined) {
      url += `${url.includes('?') ? '&' : ''}isxticker=${isxticker}`;
    }
    
    if (dateFrom && dateFrom.trim() !== '') {
      url += `${url.includes('?') ? '&' : ''}date_from=${encodeURIComponent(dateFrom.trim())}`;
    }
    
    if (dateTo && dateTo.trim() !== '') {
      url += `${url.includes('?') ? '&' : ''}date_to=${encodeURIComponent(dateTo.trim())}`;
    }

    return this.http.get<StockSummaryResponse>(url).pipe(
      map(response => ({
        groups: response.groups.map(group => ({
          ...group,
          expanded: false // Initialize all groups as collapsed
        }))
      })),
      catchError(() => of({
        groups: []
      }))
    );
  }
}