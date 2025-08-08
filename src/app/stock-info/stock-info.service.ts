import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, of, map, interval, switchMap, concat } from 'rxjs';
import { StockInfo, EnhancedStockInfo, LeverageFilter, RefreshInterval } from './models';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';

interface StockApiResponse {
  results: StockInfo[];
}

interface EnhancedStockApiResponse {
  results: EnhancedStockInfo[];
  total: number;
}

@Injectable({ providedIn: 'root' })
export class StockInfoService {
  private readonly fallbackStocks: StockInfo[] = [
    {
      Sector: 'Technology',
      Ticker: 'AAPL',
      MarketCap: '$2.5T',
      PE: '28.5',
      NextEarningDate: '2024-08-01',
      CurrentPrice: '$195.30',
      TodayLow: '$192.00',
      TodayHigh: '$196.50',
      TodayPercentageChange: '+1.2%',
      PreviousDayLow: '$191.50',
      PreviousDayHigh: '$195.80',
      PreviousDayClose: '$193.00',
      PreviousDayPercentageChange: '+0.8%',
      FiveDayLow: '$190.00',
      FiveDayHigh: '$197.00',
      FiveDayPercentageChange: '+2.5%',
      OneMonthLow: '$185.00',
      OneMonthHigh: '$198.00',
      OneMonthPercentageChange: '+4.0%',
      SixMonthLow: '$160.00',
      SixMonthHigh: '$200.00',
      SixMonthPercentageChange: '+12.5%',
      OneYearLow: '$140.00',
      OneYearHigh: '$210.00',
      OneYearPercentageChange: '+18.0%',
      EarningsData: [
        {
          date: '2024-05-01',
          eps_actual: '$1.52',
          eps_estimate: '$1.48',
          revenue_actual: '$90.8B',
          revenue_estimate: '$89.2B'
        },
        {
          date: '2024-02-01',
          eps_actual: '$2.18',
          eps_estimate: '$2.10',
          revenue_actual: '$119.6B',
          revenue_estimate: '$117.9B'
        }
      ],
      isxticker: false
    },
    {
      Sector: 'Consumer Discretionary',
      Ticker: 'TSLA',
      MarketCap: '$800B',
      PE: '70.2',
      NextEarningDate: '2024-07-20',
      CurrentPrice: '$720.10',
      TodayLow: '$710.00',
      TodayHigh: '$725.00',
      TodayPercentageChange: '+0.8%',
      PreviousDayLow: '$708.50',
      PreviousDayHigh: '$718.90',
      PreviousDayClose: '$714.50',
      PreviousDayPercentageChange: '+1.5%',
      FiveDayLow: '$700.00',
      FiveDayHigh: '$730.00',
      FiveDayPercentageChange: '+3.1%',
      OneMonthLow: '$650.00',
      OneMonthHigh: '$740.00',
      OneMonthPercentageChange: '+6.2%',
      SixMonthLow: '$600.00',
      SixMonthHigh: '$750.00',
      SixMonthPercentageChange: '+15.0%',
      OneYearLow: '$500.00',
      OneYearHigh: '$780.00',
      OneYearPercentageChange: '+22.0%',
      EarningsData: [
        {
          date: '2024-04-23',
          eps_actual: '$0.45',
          eps_estimate: '$0.52',
          revenue_actual: '$21.3B',
          revenue_estimate: '$22.1B'
        },
        {
          date: '2024-01-24',
          eps_actual: '$0.71',
          eps_estimate: '$0.74',
          revenue_actual: '$25.2B',
          revenue_estimate: '$25.6B'
        }
      ],
      isxticker: false
    },
    {
      Sector: 'Financials',
      Ticker: 'JPM',
      MarketCap: '$470B',
      PE: '11.8',
      NextEarningDate: '2024-07-15',
      CurrentPrice: '$155.60',
      TodayLow: '$154.00',
      TodayHigh: '$157.00',
      TodayPercentageChange: '+0.5%',
      PreviousDayLow: '$153.80',
      PreviousDayHigh: '$156.20',
      PreviousDayClose: '$154.80',
      PreviousDayPercentageChange: '+0.3%',
      FiveDayLow: '$150.00',
      FiveDayHigh: '$158.00',
      FiveDayPercentageChange: '+1.8%',
      OneMonthLow: '$148.00',
      OneMonthHigh: '$160.00',
      OneMonthPercentageChange: '+3.2%',
      SixMonthLow: '$135.00',
      SixMonthHigh: '$162.00',
      SixMonthPercentageChange: '+8.5%',
      OneYearLow: '$120.00',
      OneYearHigh: '$165.00',
      OneYearPercentageChange: '+12.0%',
      EarningsData: [
        {
          date: '2024-04-12',
          eps_actual: '$4.44',
          eps_estimate: '$4.11',
          revenue_actual: '$42.5B',
          revenue_estimate: '$41.8B'
        },
        {
          date: '2024-01-12',
          eps_actual: '$3.57',
          eps_estimate: '$3.35',
          revenue_actual: '$38.6B',
          revenue_estimate: '$39.7B'
        }
      ],
      isxticker: false
    },
    
  ];

  private readonly apigetStockDetails = environment.stockApiBaseUrl + '/api/getstockdetails';
  private readonly apigetEnhancedStockDetails = environment.stockApiBaseUrl + '/api/getenhancedstockdetails';
  private readonly apirealtimePrices = environment.stockApiBaseUrl + '/api/realtime-prices';
  private readonly apiupdateTickerData = environment.stockApiBaseUrl + '/api/update-ticker-data';
  private readonly apistockAddIrl = environment.stockApiBaseUrl + '/api/stocks';
  private readonly apistockDeleteUrl = environment.stockApiBaseUrl + '/api/stocks';
  private readonly apistockUpdateUrl = environment.stockApiBaseUrl + '/api/stocks';
  private readonly apigetStocks = environment.stockApiBaseUrl + '/api/getstock';


  constructor(private http: HttpClient) {}

  // Enhanced stock details methods
  getEnhancedStockDetails(
    ticker?: string, 
    sector?: string, 
    leverageFilter: LeverageFilter = 'Ticker Only', 
    sortBy?: string, 
    sortOrder?: string
  ): Observable<{ stocks: EnhancedStockInfo[], total: number }> {
    let url = `${this.apigetEnhancedStockDetails}?`;
    if (ticker && ticker.trim() !== '') {
      url += `&ticker=${encodeURIComponent(ticker.trim())}`;
    }
    if (sector && sector.trim() !== '') {
      url += `&sector=${encodeURIComponent(sector.trim())}`;
    }
    url += `&leverage_filter=${encodeURIComponent(leverageFilter)}`;
    if (sortBy) {
      url += `&sort_by=${encodeURIComponent(sortBy)}`;
    }
    if (sortOrder) {
      url += `&sort_order=${encodeURIComponent(sortOrder)}`;
    }
    
    console.log(`Service: API call with sort_by=${sortBy}, sort_order=${sortOrder}`);
    console.log(`Service: Full URL: ${url}`);
    
    return this.http.get<EnhancedStockApiResponse>(url)
      .pipe(
        map(response => ({
          stocks: response.results || [],
          total: response.total || 0
        })),
        catchError(() => of({
          stocks: [],
          total: 0
        }))
      );
  }

    getRealtimePrices(tickers: string[]): Observable<{[key: string]: {current_price: string, today_change: string, ah_percentage: string}}> {
    if (!tickers || tickers.length === 0) {
      console.log('No tickers provided for real-time prices request');
      return of({});
    }

    const tickersParam = tickers.join(',');
    console.log(`Requesting real-time prices for tickers: ${tickersParam}`);
    return this.http.get<{[key: string]: {current_price: string, today_change: string, ah_percentage: string}}>(`${this.apirealtimePrices}?tickers=${encodeURIComponent(tickersParam)}`)
      .pipe(
        catchError((error) => {
          console.error('Error fetching real-time prices:', error);
          return of({});
        })
      );
  }

  updateTickerData(): Observable<{message: string, count: number}> {
    return this.http.post<{message: string, count: number}>(this.apiupdateTickerData, {})
      .pipe(
        catchError(() => of({message: 'Failed to update data', count: 0}))
      );
  }

  // Auto-refresh functionality
  startAutoRefresh(
    tickers: string[], 
    refreshInterval: RefreshInterval
  ): Observable<{[key: string]: {current_price: string, today_change: string, ah_percentage: string}}> {
    const intervalMs = this.getIntervalMs(refreshInterval);
    // Start with immediate call, then repeat at interval with proper delay
    return concat(
      this.getRealtimePrices(tickers),
      interval(intervalMs).pipe(
        switchMap(() => this.getRealtimePrices(tickers))
      )
    );
  }

  private getIntervalMs(interval: RefreshInterval): number {
    let ms: number;
    switch (interval) {
      case '1M': ms = 60 * 1000; break;
      case '5M': ms = 5 * 60 * 1000; break;
      case '15M': ms = 15 * 60 * 1000; break;
      case '1H': ms = 60 * 60 * 1000; break;
      default: ms = 60 * 1000; break;
    }
    console.log(`Auto-refresh interval set to: ${interval} (${ms/1000} seconds)`);
    return ms;
  }

  // Legacy methods for backward compatibility
  getStockDetails(ticker?: string, sector?: string, isxticker?: boolean | null, sortBy?: string, sortOrder?: string): Observable<{ stocks: StockInfo[], total: number }> {
    let url = `${this.apigetStockDetails}?`;
    if (ticker && ticker.trim() !== '') {
      url += `&ticker=${encodeURIComponent(ticker.trim())}`;
    }
    if (sector && sector.trim() !== '') {
      url += `&sector=${encodeURIComponent(sector.trim())}`;
    }
    if (isxticker !== null && isxticker !== undefined) {
      url += `&isxticker=${isxticker}`;
    }
    if (sortBy) {
      url += `&sort_by=${encodeURIComponent(sortBy)}`;
    }
    if (sortOrder) {
      url += `&sort_order=${encodeURIComponent(sortOrder)}`;
    }
    return this.http.get<any>(url)
      .pipe(
        map(response => ({
          stocks: response.results || [],
          total: response.total || 0
        })),
        catchError(() => of({
          stocks: this.fallbackStocks,
          total: this.fallbackStocks.length
        }))
      );
  }

  getStock(ticker?: string, sector?: string, page: number = 1, perPage: number = 10, isxticker?: boolean) {
    let url = `${this.apigetStocks}?page=${page}&per_page=${perPage}`;
    if (ticker && ticker.trim() !== '') {
      url += `&ticker=${encodeURIComponent(ticker.trim())}`;
    }
    if (sector && sector.trim() !== '') {
      url += `&sector=${encodeURIComponent(sector.trim())}`;
    }
    if (typeof isxticker === 'boolean') {
      url += `&isxticker=${isxticker}`;
    }
    return this.http.get<any>(url).pipe(
      map(response => ({
        total: response.total,
        page: response.page,
        per_page: response.per_page,
        results: response.results
      }))
    );
  }

  // API CRUD methods for sector/ticker
  addStockApi(stock: { sector: string; ticker: string; isxticker: boolean }) {
    return this.http.post(`${this.apistockAddIrl}`, stock);
  }

  updateStockApi(ticker: string, stock: { sector: string; ticker: string; isxticker: boolean }) {
    return this.http.put(`${this.apistockUpdateUrl}/update`, { oldTicker: ticker, ...stock });
  }

  deleteStockApi(ticker: string) {
    return this.http.post(`${this.apistockDeleteUrl}/delete`, { ticker });
  }
} 