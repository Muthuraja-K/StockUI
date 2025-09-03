import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { DashboardService, WatchlistItem, PriceAlert, DashboardData } from '../service/dashboard.service';
import { StockInfoService } from '../service/stock-info.service';
import { SectorService } from '../service/sector.service';
import { AuthService } from '../auth/auth.service';
import { NotificationService } from '../service/notification.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  dashboardData: DashboardData | null = null;
  loading = false;
  sectors: string[] = [];
  stocks: any[] = [];
  filteredStocks: any[] = [];
  
  // No more complex price fetching needed - prices come from API
  
  // Notification permission status
  notificationPermission: NotificationPermission = 'default';
  
  // Filter properties
  filterSector = '';
  filterTicker = '';
  
  // Form properties
  showAddForm = false;
  showEditForm = false;
  selectedItem: WatchlistItem | null = null;
  
  // Form data
  newItem = {
    ticker: '',
    low: 0,
    high: 0
  };
  
  editItem = {
    ticker: '',
    low: 0,
    high: 0
  };

  // Email recipient management
  showEmailForm = false;
  newEmail = '';
  emailRecipients: string[] = [];
  emailLoading = false;
  
  // Email notification preferences
  emailNotificationsEnabled = true;
  preferencesLoading = false;
  
  // Push notification preferences
  pushNotificationsEnabled = true;
  pushPreferencesLoading = false;
  
  // Tab management
  activeTab = 'watchlist';
  
  // Error handling
  showErrorModal = false;
  errorMessage = '';
  errorTitle = 'Error';
  
  // Confirm dialog handling
  showConfirmModal = false;
  confirmTitle = 'Confirm Action';
  confirmMessage = '';
  confirmCallback: (() => void) | null = null;
  
  // Success dialog handling
  showSuccessModal = false;
  successTitle = 'Success';
  successMessage = '';
  
  // Auto-refresh
  private destroy$ = new Subject<void>();
  
  constructor(
    private dashboardService: DashboardService,
    private stockInfoService: StockInfoService,
    private sectorService: SectorService,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {}
  
  ngOnInit() {
    this.loadSectors();
    this.loadStocks();
    this.loadDashboard();
    this.loadEmailRecipients();
    this.loadNotificationPreferences();
    this.loadPushNotificationPreferences();
    this.startPriceRefresh();
    this.checkNotificationPermission();
  }
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  setActiveTab(tab: string) {
    this.activeTab = tab;
  }
  
  startPriceRefresh() {
    // Refresh dashboard data every 2 minutes to get updated prices
    setInterval(() => {
      this.loadDashboard();
    }, 120000); // 2 minutes
  }
  
  loadSectors() {
    this.sectorService.getSectors().subscribe({
      next: (response: any) => {
        this.sectors = response.results.map((sector: any) => sector.sector);
      },
      error: (error: any) => {
        this.showError('Sector Loading Error', 'Failed to load sectors');
      }
    });
  }
  
  loadStocks() {
    this.stockInfoService.getStocks('', '', 1, 10000).subscribe({
      next: (response: any) => {
        this.stocks = response.results || [];
        this.filteredStocks = [...this.stocks];
      },
      error: (error: any) => {
        this.showError('Stock Loading Error', 'Failed to load stocks');
      }
    });
  }
  
  loadDashboard() {
    this.loading = true;
    this.dashboardService.getDashboard().subscribe({
      next: (data: DashboardData) => {
        this.dashboardData = data;
        this.loading = false;
        // Prices are now included in the API response - no need to fetch separately
      },
      error: (error: any) => {
        this.loading = false;
        this.showError('Dashboard Loading Error', 'Failed to load dashboard data');
      }
    });
  }
  
  filterStocks() {
    this.filteredStocks = this.stocks.filter(stock => {
      const matchesSector = !this.filterSector || stock.sector === this.filterSector;
      const matchesTicker = !this.filterTicker || 
        stock.ticker.toLowerCase().includes(this.filterTicker.toLowerCase());
      return matchesSector && matchesTicker;
    });
  }
  
  clearFilters() {
    this.filterSector = '';
    this.filterTicker = '';
    this.filteredStocks = [...this.stocks];
  }
  
  showAddWatchlistForm() {
    this.showAddForm = true;
    this.showEditForm = false;
    this.resetNewItemForm();
  }
  
  showEditWatchlistForm(item: WatchlistItem) {
    this.selectedItem = item;
    this.editItem = { ...item };
    this.showEditForm = true;
    this.showAddForm = false;
  }
  
  hideForms() {
    this.showAddForm = false;
    this.showEditForm = false;
    this.selectedItem = null;
    this.resetNewItemForm();
    this.resetEditItemForm();
  }
  
  resetNewItemForm() {
    this.newItem = {
      ticker: '',
      low: 0,
      high: 0
    };
  }
  
  resetEditItemForm() {
    this.editItem = {
      ticker: '',
      low: 0,
      high: 0
    };
  }
  
  addToWatchlist() {
    if (!this.newItem.ticker || this.newItem.low >= this.newItem.high) {
      this.showError('Validation Error', 'Please enter valid ticker, low, and high values. Low must be less than high.');
      return;
    }
    
    this.dashboardService.addToWatchlist(
      this.newItem.ticker,
      this.newItem.low,
      this.newItem.high
    ).subscribe({
      next: (response: any) => {
        this.hideForms();
        this.loadDashboard();
        // Price is now included in the API response - no need to fetch separately
      },
      error: (error: any) => {
        this.showError('Add Error', error.error?.detail?.error || 'Failed to add to watchlist');
      }
    });
  }
  
  updateWatchlist() {
    if (!this.editItem.ticker || this.editItem.low >= this.editItem.high) {
      this.showError('Validation Error', 'Please enter valid low and high values. Low must be less than high.');
      return;
    }
    
    this.dashboardService.updateWatchlist(
      this.editItem.ticker,
      this.editItem.low,
      this.editItem.high
    ).subscribe({
      next: (response: any) => {
        this.hideForms();
        this.loadDashboard();
      },
      error: (error: any) => {
        this.showError('Update Error', error.error?.detail?.error || 'Failed to update watchlist');
      }
    });
  }
  
  removeFromWatchlist(ticker: string) {
    this.showConfirm(
      'Remove from Watchlist',
      `Are you sure you want to remove ${ticker} from your watchlist?`,
      () => {
        this.dashboardService.removeFromWatchlist(ticker).subscribe({
          next: (response: any) => {
            this.loadDashboard();
          },
          error: (error: any) => {
            this.showError('Remove Error', error.error?.detail?.error || 'Failed to remove from watchlist');
          }
        });
      }
    );
  }
  
  getCurrentPrice(ticker: string): number | null {
    // Get price directly from watchlist data (prices now come from API)
    if (this.dashboardData && this.dashboardData.watchlist) {
      const watchlistItem = this.dashboardData.watchlist.find((item: any) => item.ticker === ticker);
      if (watchlistItem && watchlistItem.current_price) {
        return watchlistItem.current_price;
      }
    }
    return null;
  }
  
  // No more complex price fetching needed - prices come from API
  
  // No more manual price fetching needed - prices come from API
  refreshAllPrices() {
    // Simply reload dashboard to get fresh prices
    this.loadDashboard();
  }
  
  getPriceStatus(ticker: string, low: number, high: number): string {
    const currentPrice = this.getCurrentPrice(ticker);
    if (currentPrice === null) return 'unknown';
    
    if (currentPrice <= low) return 'low-alert';
    if (currentPrice >= high) return 'high-alert';
    return 'normal';
  }
  
  showError(title: string, message: string) {
    this.errorTitle = title;
    this.errorMessage = message;
    this.showErrorModal = true;
  }
  
  closeErrorModal() {
    this.showErrorModal = false;
    this.errorMessage = '';
    this.errorTitle = 'Error';
  }
  
  // Confirm dialog methods
  showConfirm(title: string, message: string, callback: () => void) {
    this.confirmTitle = title;
    this.confirmMessage = message;
    this.confirmCallback = callback;
    this.showConfirmModal = true;
  }
  
  closeConfirmModal() {
    this.showConfirmModal = false;
    this.confirmTitle = 'Confirm Action';
    this.confirmMessage = '';
    this.confirmCallback = null;
  }
  
  confirmAction() {
    if (this.confirmCallback) {
      this.confirmCallback();
    }
    this.closeConfirmModal();
  }
  
  // Success dialog methods
  showSuccess(title: string, message: string) {
    this.successTitle = title;
    this.successMessage = message;
    this.showSuccessModal = true;
  }
  
  closeSuccessModal() {
    this.showSuccessModal = false;
    this.successTitle = 'Success';
    this.successMessage = '';
  }
  
  // Check current notification permission status
  checkNotificationPermission() {
    if (this.notificationService.isNotificationSupported()) {
      this.notificationPermission = Notification.permission;
    } else {
      this.notificationPermission = 'denied';
    }
  }
  
  // Request notification permission
  async requestNotificationPermission() {
    try {
      const granted = await this.notificationService.requestPermission();
      if (granted) {
        console.log('Notification permission granted');
        this.notificationPermission = 'granted';
        this.showSuccess('Notifications Enabled', 'Browser notifications are now enabled for price alerts!');
      } else {
        this.notificationPermission = 'denied';
        const status = this.notificationService.getNotificationStatus();
        this.showError('Notification Permission', status);
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      this.notificationPermission = 'denied';
      this.showError('Notification Error', 'Failed to request notification permission');
    }
  }
  
  // Send test notification
  sendTestNotification() {
    this.notificationService.sendTestNotification('Test Alert', 'This is a test notification');
  }
  
  // Format alert message for display
  formatAlertMessage(alert: any): string {
    if (alert.type === 'low') {
      return `🔻 ${alert.ticker} just dropped to $${alert.current_price?.toFixed(2)} — below your target. Great time to grab the deal!`;
    } else if (alert.type === 'high') {
      return `🔺 ${alert.ticker} surged to $${alert.current_price?.toFixed(2)} — above your threshold. You might want to hold off or reassess.`;
    }
    return alert.message || 'Price alert';
  }
  
  // Safe getter for watchlist to avoid null safety issues
  get watchlist(): any[] {
    return this.dashboardData?.watchlist || [];
  }
  
  // Safe getter for watchlist length
  get watchlistLength(): number {
    return this.watchlist.length;
  }

  // Helper method to safely format price for display
  getFormattedPrice(ticker: string): string {
    const price = this.getCurrentPrice(ticker);
    if (price === null || price === 0 || typeof price !== 'number') {
      return '0.00';
    }
    return price.toFixed(2);
  }

  // No more manual change detection needed - Angular handles it automatically

  toggleNotification() {
    this.dashboardService.toggleNotification().subscribe({
      next: (response: any) => {
        // Show custom success dialog instead of browser alert
        this.showSuccess('Notification Status', response.message);
        // Reload dashboard to get updated notification status
        this.loadDashboard();
      },
      error: (error: any) => {
        // Show custom error dialog instead of browser alert
        this.showError('Notification Error', error.error?.detail?.error || 'Failed to toggle notification');
      }
    });
  }

  // Email Recipient Management
  loadEmailRecipients() {
    this.emailLoading = true;
    this.dashboardService.getEmailRecipients().subscribe({
      next: (response: any) => {
        this.emailRecipients = response.recipients || [];
        this.emailLoading = false;
      },
      error: (error: any) => {
        this.showError('Email Loading Error', 'Failed to load email recipients');
        this.emailLoading = false;
      }
    });
  }

  showAddEmailForm() {
    this.showEmailForm = true;
    this.newEmail = '';
  }

  hideEmailForm() {
    this.showEmailForm = false;
    this.newEmail = '';
  }

  addEmailRecipient() {
    if (!this.newEmail || !this.newEmail.trim()) {
      this.showError('Validation Error', 'Please enter a valid email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.newEmail.trim())) {
      this.showError('Validation Error', 'Please enter a valid email address');
      return;
    }

    this.dashboardService.addEmailRecipient(this.newEmail.trim()).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.loadEmailRecipients();
          this.hideEmailForm();
          this.showSuccess('Email Added', 'Email added successfully');
        } else {
          this.showError('Email Error', response.message || 'Failed to add email');
        }
      },
      error: (error: any) => {
        this.showError('Email Error', 'Failed to add email recipient');
      }
    });
  }

  removeEmailRecipient(email: string) {
    this.showConfirm(
      'Remove Email Recipient',
      `Are you sure you want to remove ${email} from email notifications?`,
      () => {
        this.dashboardService.removeEmailRecipient(email).subscribe({
          next: (response: any) => {
            if (response.success) {
              this.loadEmailRecipients();
              this.showSuccess('Email Removed', 'Email removed successfully');
            } else {
              this.showError('Email Error', response.message || 'Failed to remove email');
            }
          },
          error: (error: any) => {
            this.showError('Email Error', 'Failed to remove email recipient');
          }
        });
      }
    );
  }

  // Email Notification Preferences
  loadNotificationPreferences() {
    this.preferencesLoading = true;
    this.dashboardService.getNotificationPreferences().subscribe({
      next: (response: any) => {
        this.emailNotificationsEnabled = response.emailNotificationsEnabled || true;
        this.preferencesLoading = false;
      },
      error: (error: any) => {
        this.showError('Preferences Loading Error', 'Failed to load notification preferences');
        this.preferencesLoading = false;
      }
    });
  }

  toggleEmailNotifications() {
    const newStatus = !this.emailNotificationsEnabled;
    this.preferencesLoading = true;
    
    this.dashboardService.setEmailNotificationsEnabled(newStatus).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.emailNotificationsEnabled = newStatus;
          this.showSuccess(
            'Email Notifications Updated', 
            `Email notifications have been ${newStatus ? 'enabled' : 'disabled'} successfully`
          );
        } else {
          this.showError('Update Error', response.message || 'Failed to update email notification status');
        }
        this.preferencesLoading = false;
      },
      error: (error: any) => {
        this.showError('Update Error', 'Failed to update email notification status');
        this.preferencesLoading = false;
      }
    });
  }

  // Push Notification Preferences
  loadPushNotificationPreferences() {
    this.pushPreferencesLoading = true;
    this.dashboardService.getPushNotificationsEnabled().subscribe({
      next: (response: any) => {
        this.pushNotificationsEnabled = response.enabled || true;
        this.pushPreferencesLoading = false;
      },
      error: (error: any) => {
        this.showError('Push Preferences Loading Error', 'Failed to load push notification preferences');
        this.pushPreferencesLoading = false;
      }
    });
  }

  togglePushNotifications() {
    const newStatus = !this.pushNotificationsEnabled;
    this.pushPreferencesLoading = true;
    
    this.dashboardService.setPushNotificationsEnabled(newStatus).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.pushNotificationsEnabled = newStatus;
          this.showSuccess(
            'Push Notifications Updated', 
            `Push notifications have been ${newStatus ? 'enabled' : 'disabled'} successfully`
          );
        } else {
          this.showError('Update Error', response.message || 'Failed to update push notification status');
        }
        this.pushPreferencesLoading = false;
      },
      error: (error: any) => {
        this.showError('Update Error', 'Failed to update push notification status');
        this.pushPreferencesLoading = false;
      }
    });
  }
  
  // Get browser info for debugging
  getBrowserInfo(): any {
    return this.notificationService.getBrowserInfo();
  }
  
  // Get notification status message
  getNotificationStatusMessage(): string {
    return this.notificationService.getNotificationStatus();
  }
  
  // Check if running on Safari iPhone
  isSafariIPhone(): boolean {
    const browserInfo = this.getBrowserInfo();
    return browserInfo.isSafari && browserInfo.isIOS;
  }
}
