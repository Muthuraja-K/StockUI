import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-admin-cache',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-cache.component.html',
  styleUrls: ['./admin-cache.component.scss']
})
export class AdminCacheComponent implements OnInit {
  cacheOverview: any = null;
  earningsStatus: any = null;
  loading = false;
  message = '';
  messageType: 'success' | 'error' | 'info' = 'info';
  selectedStartDate: string = '';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadCacheOverview();
    this.loadEarningsStatus();
  }

  loadCacheOverview() {
    this.loading = true;
    this.http.get(`${environment.stockApiBaseUrl}/api/admin/cache-overview`).subscribe({
      next: (response: any) => {
        this.cacheOverview = response;
        this.loading = false;
        this.showMessage('Cache overview loaded successfully', 'success');
      },
      error: (error) => {
        console.error('Error loading cache overview:', error);
        this.loading = false;
        this.showMessage('Error loading cache overview', 'error');
      }
    });
  }

  refreshStockHistory() {
    this.loading = true;
    this.http.post(`${environment.stockApiBaseUrl}/api/admin/refresh-stock-history`, {}).subscribe({
      next: (response: any) => {
        this.loading = false;
        this.showMessage('Stock history cache refreshed successfully', 'success');
        this.loadCacheOverview(); // Reload overview
      },
      error: (error) => {
        console.error('Error refreshing stock history:', error);
        this.loading = false;
        this.showMessage('Error refreshing stock history cache', 'error');
      }
    });
  }

  refreshAllCaches() {
    this.loading = true;
    this.http.post(`${environment.stockApiBaseUrl}/api/admin/refresh-all-caches`, {}).subscribe({
      next: (response: any) => {
        this.loading = false;
        this.showMessage('All caches refreshed successfully', 'success');
        this.loadCacheOverview(); // Reload overview
      },
      error: (error) => {
        console.error('Error refreshing all caches:', error);
        this.loading = false;
        this.showMessage('Error refreshing all caches', 'error');
      }
    });
  }

  forcePopulateHistory() {
    this.loading = true;
    this.http.post(`${environment.stockApiBaseUrl}/api/admin/force-populate-history`, {}).subscribe({
      next: (response: any) => {
        this.loading = false;
        this.showMessage('Stock history data populated successfully', 'success');
        this.loadCacheOverview(); // Reload overview
      },
      error: (error) => {
        console.error('Error populating history:', error);
        this.loading = false;
        this.showMessage('Error populating stock history data', 'error');
      }
    });
  }

  showMessage(message: string, type: 'success' | 'error' | 'info') {
    this.message = message;
    this.messageType = type;
    setTimeout(() => {
      this.message = '';
    }, 5000);
  }

  getCacheStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'valid':
        return 'status-active';
      case 'expired':
      case 'invalid':
        return 'status-expired';
      case 'missing':
      case 'not found':
        return 'status-missing';
      default:
        return 'status-unknown';
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  }

  formatFileSize(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Earnings Management Methods
  loadEarningsStatus() {
    this.http.get(`${environment.stockApiBaseUrl}/api/admin/earnings-status`).subscribe({
      next: (response: any) => {
        this.earningsStatus = response.data;
      },
      error: (error) => {
        console.error('Error loading earnings status:', error);
        this.showMessage('Error loading earnings status', 'error');
      }
    });
  }

  sendEarningsEmail() {
    this.loading = true;
    this.http.post(`${environment.stockApiBaseUrl}/api/admin/send-earnings-email`, {}).subscribe({
      next: (response: any) => {
        this.loading = false;
        this.showMessage('Earnings email notifications sent successfully', 'success');
      },
      error: (error) => {
        console.error('Error sending earnings email:', error);
        this.loading = false;
        this.showMessage('Error sending earnings email notifications', 'error');
      }
    });
  }

  runEnhancedEarningsUpdate() {
    this.loading = true;
    this.http.post(`${environment.stockApiBaseUrl}/api/admin/run-enhanced-earnings-update`, {}).subscribe({
      next: (response: any) => {
        this.loading = false;
        this.showMessage('Enhanced earnings update completed successfully', 'success');
        this.loadEarningsStatus(); // Reload earnings status
      },
      error: (error) => {
        console.error('Error running enhanced earnings update:', error);
        this.loading = false;
        this.showMessage('Error running enhanced earnings update', 'error');
      }
    });
  }

  recreateEarningsSummary() {
    if (!confirm('Are you sure you want to recreate the earnings summary from scratch? This will overwrite all existing data.')) {
      return;
    }

    this.loading = true;
    this.http.post(`${environment.stockApiBaseUrl}/api/admin/recreate-earnings-summary`, {}).subscribe({
      next: (response: any) => {
        this.loading = false;
        this.showMessage('Earnings summary recreated successfully', 'success');
        this.loadEarningsStatus(); // Reload earnings status
      },
      error: (error) => {
        console.error('Error recreating earnings summary:', error);
        this.loading = false;
        this.showMessage('Error recreating earnings summary', 'error');
      }
    });
  }

  updateEarningsFromDate() {
    if (!this.selectedStartDate) {
      this.showMessage('Please select a start date', 'error');
      return;
    }

    this.loading = true;
    this.http.post(`${environment.stockApiBaseUrl}/api/admin/update-earnings-from-date?start_date=${this.selectedStartDate}`, {}).subscribe({
      next: (response: any) => {
        this.loading = false;
        this.showMessage(`Earnings updated from ${this.selectedStartDate} successfully`, 'success');
        this.loadEarningsStatus(); // Reload earnings status
      },
      error: (error) => {
        console.error('Error updating earnings from date:', error);
        this.loading = false;
        this.showMessage('Error updating earnings from specified date', 'error');
      }
    });
  }

  getMaxDate(): string {
    // Return today's date in YYYY-MM-DD format
    return new Date().toISOString().split('T')[0];
  }
}
