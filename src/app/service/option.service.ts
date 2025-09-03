import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { OptionChain } from '../stocks/models';

@Injectable({
  providedIn: 'root'
})
export class OptionService {
  private apiUrl = environment.stockApiBaseUrl;

  constructor(private http: HttpClient) { }

  getOptionChain(ticker: string): Observable<OptionChain> {
    return this.http.get<OptionChain>(`${this.apiUrl}/api/options/${ticker}`);
  }

  getOptionsByExpiration(ticker: string, expirationDate: string): Observable<{
    calls: any[];
    puts: any[];
  }> {
    return this.http.get<{
      calls: any[];
      puts: any[];
    }>(`${this.apiUrl}/api/options/${ticker}/${expirationDate}`);
  }
}
