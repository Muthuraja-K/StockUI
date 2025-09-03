import { Injectable } from '@angular/core';
import { Observable, catchError, of, map } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';
import { StockSummaryData, SectorGroup, StockSummaryResponse } from '../stocks/models';

@Injectable({ providedIn: 'root' })
export class StockSummaryService {
  private readonly apiUrl = environment.stockApiBaseUrl + '/api/stock-summary';

  constructor(private http: HttpClient) {}

  getStockSummary(
    sectors?: string[],
    isleverage?: boolean | null,
    dateFrom?: string,
    dateTo?: string,
    today?: boolean
  ): Observable<StockSummaryResponse> {
    let url = `${this.apiUrl}?`;
    
    if (today) {
      url += `today=true`;
    }
    
    if (sectors && sectors.length > 0) {
      url += `${url.includes('?') ? '&' : ''}sectors=${encodeURIComponent(sectors.join(','))}`;
    }
    
    if (isleverage !== null && isleverage !== undefined) {
      url += `${url.includes('?') ? '&' : ''}isleverage=${isleverage}`;
    }
    
    if (dateFrom && dateFrom.trim() !== '') {
      url += `${url.includes('?') ? '&' : ''}date_from=${encodeURIComponent(dateFrom.trim())}`;
    }
    
    if (dateTo && dateTo.trim() !== '') {
      url += `${url.includes('?') ? '&' : ''}date_to=${encodeURIComponent(dateTo.trim())}`;
    }

    return this.http.get<StockSummaryResponse>(url).pipe(
      map(response => ({
        groups: response.groups.map((group: any) => ({
          ...group,
          expanded: false // Default to collapsed, component will override if needed
        }))
      })),
      catchError(() => of({
        groups: []
      }))
    );
  }
}