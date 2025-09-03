import { Injectable } from '@angular/core';
import { Observable, catchError, of, map } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';
import { EarningData, EarningSummaryResponse } from '../stocks/models';
import { AuthService } from '../auth/auth.service';

@Injectable({ providedIn: 'root' })
export class EarningSummaryService {
  private readonly apiUrl = environment.stockApiBaseUrl + '/api/earning-summary';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getEarningSummary(
    sectors?: string[],
    period?: string,
    dateFrom?: string,
    dateTo?: string
  ): Observable<EarningSummaryResponse> {
    let url = `${this.apiUrl}?page=1&per_page=1000`; // Get all results
    
    if (sectors && sectors.length > 0) {
      url += `&sectors=${encodeURIComponent(sectors.join(','))}`;
    }
    
    if (period && period !== 'custom' && period !== '') {
      url += `&period=${encodeURIComponent(period)}`;
    } else if (dateFrom && dateFrom.trim() !== '') {
      url += `&date_from=${encodeURIComponent(dateFrom.trim())}`;
    }
    
    if (period === 'custom' && dateTo && dateTo.trim() !== '') {
      url += `&date_to=${encodeURIComponent(dateTo.trim())}`;
    }

    // Add debugging
    console.log('=== EARNING SUMMARY SERVICE DEBUG ===');
    console.log('URL:', url);
    console.log('Auth Service isAuthenticated:', this.authService.isAuthenticated);
    
    // Check authentication status
    if (!this.authService.isAuthenticated) {
      console.error('❌ User not authenticated for earnings summary request');
      console.log('Returning empty results due to authentication failure');
      return of({
        page: 1,
        per_page: 1000,
        total: 0,
        results: []
      });
    }

    // Get the auth token and create headers
    const token = this.authService.getToken();
    const headers: { [key: string]: string } = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('✅ Token found, adding Authorization header');
    } else {
      console.error('❌ No token found even though isAuthenticated is true');
    }

    console.log('Making HTTP request with headers:', headers);
    console.log('=== END DEBUG ===');

    return this.http.get<EarningSummaryResponse>(url, { headers }).pipe(
      catchError((error) => {
        console.error('❌ Error fetching earnings summary:', error);
        console.error('Error status:', error.status);
        console.error('Error message:', error.message);
        
        // Handle specific error cases
        if (error.status === 401) {
          console.error('❌ Authentication failed - token may be expired');
        } else if (error.status === 403) {
          console.error('❌ Access forbidden');
        }
        
        return of({
          page: 1,
          per_page: 1000,
          total: 0,
          results: []
        });
      })
    );
  }

  getHistoricalPriceData(ticker: string, date: string, interval: string = '1m'): Observable<any> {
    const url = `${environment.stockApiBaseUrl}/api/historical-price?ticker=${encodeURIComponent(ticker)}&date=${encodeURIComponent(date)}&interval=${encodeURIComponent(interval)}`;
    
    // Check authentication status
    if (!this.authService.isAuthenticated) {
      console.error('User not authenticated for historical price request');
      return of({
        error: 'User not authenticated',
        ticker: ticker,
        date: date,
        details: 'Please log in to access this feature'
      });
    }
    
    // Get the auth token
    const token = this.authService.getToken();
    const authStatus = this.checkAuthStatus();
    console.log('Making historical price request:', { 
      url, 
      ticker, 
      date, 
      interval, 
      ...authStatus
    });
    
    // Create headers with auth token
    const headers: { [key: string]: string } = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return this.http.get(url, { headers }).pipe(
      catchError((error) => {
        console.error('Error fetching historical price data:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          url: error.url
        });
        
        // Handle specific error cases
        if (error.status === 401) {
          console.error('Authentication failed - token may be expired');
          return of({
            error: 'Authentication failed',
            ticker: ticker,
            date: date,
            details: 'Token expired or invalid. Please log in again.'
          });
        } else if (error.status === 403) {
          console.error('Access forbidden');
          return of({
            error: 'Access forbidden',
            ticker: ticker,
            date: date,
            details: 'You do not have permission to access this resource.'
          });
        }
        
        return of({
          error: 'Failed to fetch historical price data',
          ticker: ticker,
          date: date,
          details: error.message || 'Unknown error'
        });
      })
    );
  }

  // Helper method to check authentication status
  private checkAuthStatus(): { isAuthenticated: boolean; hasToken: boolean; tokenPreview: string } {
    const isAuthenticated = this.authService.isAuthenticated;
    const token = this.authService.getToken();
    const tokenPreview = token ? `${token.substring(0, 10)}...` : 'None';
    
    return {
      isAuthenticated,
      hasToken: !!token,
      tokenPreview
    };
  }
} 