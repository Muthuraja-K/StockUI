import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';
import { environment } from '../environments/environment';

export interface WatchlistItem {
  ticker: string;
  low: number;
  high: number;
  current_price?: number; // Optional current price from API
}

export interface PriceAlert {
  ticker: string;
  current_price: number;
  threshold: number;
  type: 'low' | 'high';
  message: string;
  timestamp: string;
}

export interface DashboardData {
  watchlist: WatchlistItem[];
  alerts: PriceAlert[];
  username: string;
  isEnabled: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = environment.stockApiBaseUrl;

  constructor(private http: HttpClient) { }

  getDashboard(): Observable<DashboardData> {
    return this.http.get<DashboardData>(`${this.apiUrl}/api/dashboard`);
  }

  addToWatchlist(ticker: string, low: number, high: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/dashboard`, { ticker, low, high });
  }

  updateWatchlist(ticker: string, low: number, high: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/api/dashboard/${ticker}`, { low, high });
  }

  removeFromWatchlist(ticker: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/api/dashboard/${ticker}`);
  }

  toggleNotification(): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/dashboard/toggle-notification`, {});
  }

  getPriceAlerts(): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/dashboard/alerts`);
  }

  // Auto-refresh price alerts every minute
  getPriceAlertsWithRefresh(): Observable<any> {
    return interval(60000).pipe(
      startWith(0),
      switchMap(() => this.getPriceAlerts())
    );
  }

  // Email Recipient Management
  getEmailRecipients(): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/dashboard/email-recipients`);
  }

  addEmailRecipient(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/dashboard/email-recipients`, { email });
  }

  removeEmailRecipient(email: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/api/dashboard/email-recipients/${encodeURIComponent(email)}`);
  }

  // Email Notification Preferences
  getEmailNotificationsEnabled(): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/dashboard/email-notifications-enabled`);
  }

  setEmailNotificationsEnabled(enabled: boolean): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/dashboard/email-notifications-enabled`, { enabled });
  }

  getNotificationPreferences(): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/dashboard/notification-preferences`);
  }

  // Push Notification Preferences
  getPushNotificationsEnabled(): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/dashboard/push-notifications-enabled`);
  }

  setPushNotificationsEnabled(enabled: boolean): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/dashboard/push-notifications-enabled`, { enabled });
  }
}
