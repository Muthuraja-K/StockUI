import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { EnhancedStockInfo } from '../stocks/models';

@Injectable({
  providedIn: 'root'
})
export class StockInfoService {
  private apiUrl = environment.stockApiBaseUrl;

  constructor(private http: HttpClient) { }

  isAfterHours(): Observable<boolean> {
    // Check if current time is after market hours (4:00 PM ET)
    const now = new Date();
    const etTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const isAfterHours = etTime.getHours() >= 16; // After 4 PM ET
    
    return new Observable(observer => {
      observer.next(isAfterHours);
      observer.complete();
    });
  }

  getEnhancedStockDetails(
    ticker: string = '',
    sector: string = '',
    leverageFilter: string = 'Ticker Only',
    sortBy: string = 'today_percentage',
    sortOrder: string = 'desc'
  ): Observable<{ stocks: EnhancedStockInfo[], total: number }> {
    const params: any = {};
    if (ticker) params.ticker = ticker;
    if (sector) params.sector = sector;
    if (leverageFilter) params.leverage_filter = leverageFilter;
    if (sortBy) params.sort_by = sortBy;
    if (sortOrder) params.sort_order = sortOrder;

    return this.http.get<{ stocks: EnhancedStockInfo[], total: number }>(`${this.apiUrl}/api/getenhancedstockdetails`, { params });
  }

  startAutoRefresh(tickers: string[], refreshInterval: string): Observable<{[key: string]: any}> {
    // Convert interval string to milliseconds
    const intervalMs = this.getIntervalMs(refreshInterval);
    
    return interval(intervalMs).pipe(
      switchMap(() => this.getRealtimePrices(tickers))
    );
  }

  private getIntervalMs(interval: string): number {
    switch (interval) {
      case '1M': return 60000; // 1 minute
      case '5M': return 300000; // 5 minutes
      case '15M': return 900000; // 15 minutes
      case '1H': return 3600000; // 1 hour
      default: return 300000; // Default to 5 minutes
    }
  }

  private getRealtimePrices(tickers: string[]): Observable<{[key: string]: any}> {
    const tickersParam = tickers.join(',');
    return this.http.get<{[key: string]: any}>(`${this.apiUrl}/api/realtime-prices?tickers=${tickersParam}`);
  }

  updateTickerData(): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/update-ticker-data`, {});
  }

  forceUpdateTickerData(): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/force-update-ticker-data`, {});
  }

  // Methods for stocks component
  getStocks(ticker: string = '', sector: string = '', page: number = 1, perPage: number = 10000): Observable<any> {
    const params: any = { page, per_page: perPage };
    if (ticker) params.ticker = ticker;
    if (sector) params.sector = sector;
    
    return this.http.get(`${this.apiUrl}/api/getstock`, { params });
  }

  // New method to get stock data WITH prices
  getStocksWithPrices(ticker: string = ''): Observable<any> {
    if (!ticker) {
      return this.http.get(`${this.apiUrl}/api/getstock`);
    }
    
    // Use the market-data-updates endpoint to get price data
    return this.http.get(`${this.apiUrl}/api/market-data-updates?tickers=${ticker}`);
  }

  addStock(ticker: string, sector: string, isleverage: boolean): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/stocks`, { ticker, sector, isleverage });
  }

  updateStock(oldTicker: string, newTicker: string, sector: string, isleverage: boolean): Observable<any> {
    return this.http.put(`${this.apiUrl}/api/stocks/update`, { oldTicker, ticker: newTicker, sector, isleverage });
  }

  deleteStock(ticker: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/stocks/delete`, { ticker });
  }

  // New method for stock history
  getStockHistory(params: any = {}): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/stock-history`, { params });
  }

  // New method for market data updates
  getMarketDataUpdates(tickers: string[]): Observable<{[key: string]: any}> {
    const tickersParam = tickers.join(',');
    return this.http.get<{[key: string]: any}>(`${this.apiUrl}/api/market-data-updates?tickers=${tickersParam}`);
  }
}
