import { Injectable } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';
import { AuthService } from '../auth/auth.service';

export interface StockPredictionRequest {
  ticker: string;
  modelType: 'lstm' | 'regression' | 'both'; // Removed 'chatgpt'
  days: number;
}

export interface StockPredictionResponse {
  ticker: string;
  timestamp: string;
  model_type: string;
  prediction_days: number;
  current_price: number;
  current_date: string;
  lstm_prediction?: any;
  regression_prediction?: any;
  chatgpt_analysis?: any; // Keep but won't be populated
  combined_prediction?: any;
  error?: string;
}

export interface StockPredictionSummary {
  ticker: string;
  current_price: number;
  prediction_summary: {
    lstm?: {
      week_prediction: number;
      week_change_percent: number;
      confidence: number;
    };
    regression?: {
      week_prediction: number;
      week_change_percent: number;
      confidence: number;
    };
  };
  recommendation: 'BUY' | 'SELL' | 'HOLD';
  average_predicted_change?: number;
  average_confidence?: number;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class StockPredictionService {
  private readonly apiUrl = environment.stockApiBaseUrl + '/api/stock-prediction';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getStockPrediction(
    ticker: string,
    modelType: 'lstm' | 'regression' | 'both',
    days: number = 30
  ): Observable<StockPredictionResponse> {
    // Note: ChatGPT calls are currently disabled in the backend
    // If modelType is 'chatgpt', the backend will return an error or fallback response
    
    const url = `${this.apiUrl}/${ticker}?model_type=${modelType}&days=${days}`;
    console.log('Stock Prediction API URL:', url); // Debug log
    
    // Check authentication status
    if (!this.authService.isAuthenticated) {
      console.error('User not authenticated for stock prediction request');
      return of({
        ticker: ticker,
        timestamp: new Date().toISOString(),
        model_type: modelType,
        prediction_days: days,
        current_price: 0,
        current_date: new Date().toISOString().split('T')[0],
        error: 'User not authenticated. Please log in to access this feature.'
      });
    }
    
    // Get the auth token
    const token = this.authService.getToken();
    const headers: { [key: string]: string } = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return this.http.get<StockPredictionResponse>(url, { headers }).pipe(
      catchError((error) => {
        console.error('Error fetching stock prediction:', error);
        return of({
          ticker: ticker,
          timestamp: new Date().toISOString(),
          model_type: modelType,
          prediction_days: days,
          current_price: 0,
          current_date: new Date().toISOString().split('T')[0],
          error: `Failed to fetch stock prediction: ${error.message || 'Unknown error'}`
        });
      })
    );
  }

  getStockPredictionSummary(
    ticker: string,
    modelType: 'lstm' | 'regression' | 'both'
  ): Observable<StockPredictionSummary> {
    const url = `${this.apiUrl}/${ticker}/summary?model_type=${modelType}`;
    
    // Check authentication status
    if (!this.authService.isAuthenticated) {
      console.error('User not authenticated for stock prediction summary request');
      return of({
        ticker: ticker,
        current_price: 0,
        prediction_summary: {},
        recommendation: 'HOLD' as const,
        error: 'User not authenticated. Please log in to access this feature.'
      });
    }
    
    // Get the auth token
    const token = this.authService.getToken();
    const headers: { [key: string]: string } = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return this.http.get<StockPredictionSummary>(url, { headers }).pipe(
      catchError((error) => {
        console.error('Error fetching stock prediction summary:', error);
        return of({
          ticker: ticker,
          current_price: 0,
          prediction_summary: {},
          recommendation: 'HOLD' as const,
          error: `Failed to fetch stock prediction summary: ${error.message || 'Unknown error'}`
        });
      })
    );
  }
}
