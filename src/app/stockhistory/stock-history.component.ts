import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, interval, switchMap, debounceTime, distinctUntilChanged, Subscription } from 'rxjs';
import { StockInfoService } from '../service/stock-info.service';
import { SentimentService, SentimentData } from '../service/sentiment.service';
import { AuthService } from '../auth/auth.service';
import { EnhancedStockInfo, OptionChain, OptionData, LeverageFilter, RefreshInterval } from '../stocks/models';
import { SectorService } from '../service/sector.service';

@Component({
  selector: 'stock-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stock-history.component.html',
  styleUrls: ['./stock-history.component.scss'],
})
export class StockHistoryComponent implements OnInit, OnDestroy {
  stocks: EnhancedStockInfo[] = [];
  sectors: string[] = [];
  loading = false;
  sectorsLoading = false; // New loading state for sectors
  filterTicker = '';
  filterSector = '';
  leverageFilter: LeverageFilter = 'Ticker Only';
  refreshInterval: RefreshInterval = '1M';  // Changed default to 1M for stock history updates
  sortBy: string = '1D_percentage';
  sortOrder: 'asc' | 'desc' = 'desc';
  sortingColumn: string | null = null; // Track which column is being sorted
  sortingLoading: boolean = false; // Track if sorting is in progress

  // After hours state
  isAfterHours = false;
  afterHoursCheckSubscription?: Subscription;

  // Total records count
  totalRecords = 0;

  // Sentiment popup properties
  showSentimentModal = false;
  sentimentData: SentimentData | null = null;
  sentimentLoading = false;

  // Option popup properties
  optionData: OptionChain | null = null;
  selectedExpiration: string = '';
  filteredCalls: OptionData[] = [];
  filteredPuts: OptionData[] = [];

  // Error modal properties
  showErrorModal = false;
  errorMessage = '';
  errorTitle = 'Error';
  errorDetails: string[] = [];

  // Auto-refresh properties
  public refreshSubscription: Subscription | null = null;
  private loadStocksSubscription: Subscription | null = null;
  private destroy$ = new Subject<void>();
  private loadStocksTrigger$ = new Subject<void>();

  isAutoRefreshEnabled = false;  // Changed default to false - user must start manually

  // Leverage filter options
  leverageOptions: LeverageFilter[] = ['Ticker Only', 'Leverage Only', 'Both'];
   
  // Refresh interval options
  refreshOptions: RefreshInterval[] = ['1M', '5M', '15M', '1H'];

  // Analysis toggle
  showAnalysis: boolean = false;

  /**
   * IMPORTANT: ALWAYS use this method to format market cap values in the UI.
   * Market cap values must be displayed as T (Trillion), B (Billion), M (Million), K (Thousand).
   * 
   * Formats market cap value to display in trillions, billions, millions, or thousands.
   * Handles both raw numbers and pre-formatted strings from Finviz API.
   * @param marketCap - The market cap value as a number or string
   * @returns Formatted market cap string (e.g., "$1.5T", "$750B", "$500M", "$250K")
   */
  formatMarketCap(marketCap: number | string | null | undefined): string {
    if (marketCap === null || marketCap === undefined || marketCap === '') {
      return 'N/A';
    }
    
    // If it's already a formatted string from backend (e.g., "$2.3T", "$1.5B"), return as-is
    if (typeof marketCap === 'string') {
      const trimmed = marketCap.trim();
      // Check if it's already formatted with currency symbol (e.g., "$2.3T", "$750B")
      if (/^\$[\d.]+[TBMK]$/.test(trimmed)) {
        return trimmed; // Keep the $ symbol and return as-is
      }
      // Check if it's already formatted without currency symbol (e.g., "2.3T", "750B")
      if (/^[\d.]+[TBMK]$/.test(trimmed)) {
        return '$' + trimmed; // Add $ symbol to match our format
      }
    }
    
    // Convert to number if it's a string
    const numValue = typeof marketCap === 'string' ? parseFloat(marketCap) : marketCap;
    
    if (isNaN(numValue) || numValue === 0) {
      return 'N/A';
    }
    
    // Format based on size - always use B, M, T format with $ symbol
    if (numValue >= 1000000000000) {
      return '$' + (numValue / 1000000000000).toFixed(1) + 'T';
    } else if (numValue >= 1000000000) {
      return '$' + (numValue / 1000000000).toFixed(1) + 'B';
    } else if (numValue >= 1000000) {
      return '$' + (numValue / 1000000).toFixed(1) + 'M';
    } else if (numValue >= 1000) {
      return '$' + (numValue / 1000).toFixed(1) + 'K';
    } else {
      return '$' + numValue.toString();
    }
  }

  constructor(
    private stockInfoService: StockInfoService,
    private sectorService: SectorService,
    private sentimentService: SentimentService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadSectors();
    this.checkAfterHours(); // Check if it's after hours for column visibility
    
    // Set up debounced load stocks mechanism
    this.loadStocksTrigger$.pipe(
      debounceTime(300), // Debounce for 300ms
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.performLoadStocks();
    });
    
    // Trigger initial load
    this.loadStocksTrigger$.next();
    
    // Auto-refresh is disabled by default - user must start manually
    // Periodic check to ensure auto-refresh is running (only when enabled)
    interval(30000).pipe( // Check every 30 seconds
      takeUntil(this.destroy$)
    ).subscribe(() => {
      if (this.isAutoRefreshEnabled) {
        this.ensureAutoRefresh();
      }
    });

    // Periodic sector refresh to ensure sectors are always up-to-date
    interval(300000).pipe( // Refresh sectors every 5 minutes
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.refreshSectors();
    });
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
    this.cancelLoadStocks();
    this.destroy$.next();
    this.destroy$.complete();
    this.loadStocksTrigger$.complete();
    
    if (this.afterHoursCheckSubscription) {
      this.afterHoursCheckSubscription.unsubscribe();
    }
  }

  // Check if it's after hours
  checkAfterHours() {
    this.afterHoursCheckSubscription = this.stockInfoService.isAfterHours()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (isAfterHours: boolean) => {
          const wasAfterHours = this.isAfterHours;
          this.isAfterHours = isAfterHours;

          
          // If switching from after-hours to market hours, reset AH column sorting
          if (wasAfterHours && !isAfterHours && 
              (this.sortingColumn === 'ah_price' || this.sortingColumn === 'ah_change')) {

            this.sortingColumn = '';
            this.sortOrder = 'desc';
            this.sortStocks(); // Re-sort without AH columns
          }
        },
        error: (error: any) => {
          this.showError('After Hours Check Error', 'Failed to check after hours status', [
            `Message: ${error.message || 'Unknown error occurred'}`
          ]);
          this.isAfterHours = false; // Default to false on error
        }
      });
  }

  loadSectors() {

    this.sectorsLoading = true;
    this.sectorService.getSectors()
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response: any) => {
          if (response && response.results && Array.isArray(response.results)) {
            this.sectors = response.results.map((sector: any) => sector.sector);
          } else if (response && Array.isArray(response)) {
            // Handle case where response is directly an array
            this.sectors = response.map((sector: any) => sector.sector || sector);
          } else {

            this.sectors = [];
          }

          this.sectorsLoading = false;
        },
        error: (error: any) => {
          const errorDetails = [
            `Status: ${error.status || 'Unknown'}`,
            `Status Text: ${error.statusText || 'Unknown'}`,
            `Message: ${error.message || 'Unknown error occurred'}`
          ];
          this.showError('Sector Loading Error', 'Failed to load sectors', errorDetails);
          this.sectors = [];
          this.sectorsLoading = false;
        }
      });
  }

  // Method to refresh sectors (can be called manually or automatically)
  refreshSectors() {

    this.loadSectors();
  }

  // Method to handle sector updates (can be called from parent components or services)
  onSectorUpdated() {

    this.refreshSectors();
  }

  // Error modal methods
  showError(title: string, message: string, details?: string[]) {
    this.errorTitle = title;
    this.errorMessage = message;
    this.errorDetails = details || [];
    this.showErrorModal = true;

  }

  closeErrorModal() {
    this.showErrorModal = false;
    this.errorMessage = '';
    this.errorTitle = 'Error';
    this.errorDetails = [];
  }

  loadStocks() {
    // Trigger the debounced load mechanism
    this.loadStocksTrigger$.next();
  }

  private performLoadStocks() {
    // Cancel any existing load request
    this.cancelLoadStocks();
    
    this.loading = true;
    

    
    // Use the new stock history API
    const params: any = {};
    if (this.filterTicker) params.ticker = this.filterTicker;
    if (this.filterSector) params.sector = this.filterSector;
    if (this.leverageFilter === 'Leverage Only') params.leverage_filter = 'true';
    else if (this.leverageFilter === 'Ticker Only') params.leverage_filter = 'false';
    
    this.loadStocksSubscription = this.stockInfoService.getStockHistory(params).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response: any) => {
        if (response && response.results && Array.isArray(response.results)) {
          // API returns {results: [...], total: number}
          this.stocks = response.results;
          this.totalRecords = response.total || response.results.length;
        } else if (response && response.stocks && Array.isArray(response.stocks)) {
          // Handle case where response has stocks property
          this.stocks = response.stocks;
          this.totalRecords = response.total || response.stocks.length;
        } else if (response && Array.isArray(response)) {
          // Handle case where response is directly an array
          this.stocks = response;
          this.totalRecords = response.length;
        } else {

          this.stocks = [];
          this.totalRecords = 0;
        }
        
        this.loading = false;
        
        // Apply default sorting if no specific sorting is set
        if (!this.sortingColumn) {
          this.sortingColumn = this.sortBy;
          this.sortStocks();
        }
        

        
        // Refresh sectors to ensure they're up-to-date
        this.refreshSectors();
        
        // Auto-refresh is not automatically restarted - user controls it manually
        // If auto-refresh was running, it continues with the new filtered stocks
      },
      error: (error: any) => {
        const errorDetails = [
          `Status: ${error.status || 'Unknown'}`,
          `Status Text: ${error.statusText || 'Unknown'}`,
          `Message: ${error.message || 'Unknown error occurred'}`
        ];
        this.showError('Stock Loading Error', 'Failed to load stocks', errorDetails);
        this.stocks = [];
        this.totalRecords = 0;
        this.loading = false;
        this.sortingColumn = null; // Clear sorting indicator on error
      }
    });
  }

  cancelLoadStocks() {
    if (this.loadStocksSubscription) {
      this.loadStocksSubscription.unsubscribe();
      this.loadStocksSubscription = null;

    }
  }

  searchStocks() {

    // Stop current auto-refresh before loading new data
    this.stopAutoRefresh();
    // Trigger immediate load for search
    this.performLoadStocks();
  }

  onLeverageFilterChange() {

    // Stop current auto-refresh before loading new data
    this.stopAutoRefresh();
    // Trigger immediate load for leverage changes
    this.performLoadStocks();
  }

  onSectorFilterChange() {

    // Stop current auto-refresh before loading new data
    this.stopAutoRefresh();
    // Trigger immediate load for sector changes
    this.performLoadStocks();
  }

  clearFilters() {
    this.filterTicker = '';
    this.filterSector = '';
    this.leverageFilter = 'Ticker Only';
    this.sortBy = '1D_percentage';
    this.sortOrder = 'desc';
    // Stop current auto-refresh before loading new data
    this.stopAutoRefresh();
    // Trigger immediate load for filter clear
    this.performLoadStocks();
  }


  getPercentageChangeClass(value: string): string {
    if (!value || value === 'N/A') return '';
    const numValue = parseFloat(value.replace('%', '').replace('+', ''));
    return numValue > 0 ? 'positive-change' : numValue < 0 ? 'negative-change' : '';
  }

  // Calculate today's high-low percentage range
  calculateTodayRange(stock: EnhancedStockInfo): string {
    if (!stock.today?.high || !stock.today?.low) return 'N/A';
    
    const high = stock.today.high;
    const low = stock.today.low;
    
    if (typeof high === 'number' && typeof low === 'number' && low > 0) {
      const percentage = ((high - low) / low) * 100;
      return `${percentage.toFixed(2)}%`;
    }
    
    return 'N/A';
  }

  // Auto-refresh functionality
  toggleAutoRefresh() {
    if (this.isAutoRefreshEnabled) {
      console.log('StockHistory: Toggling auto-refresh OFF');
      this.stopAutoRefresh();
    } else {
      if (this.stocks.length === 0) {
        console.log('StockHistory: Cannot start auto-refresh - no stocks loaded');
        return;
      }
      console.log('StockHistory: Toggling auto-refresh ON');
      this.startAutoRefresh();
    }
  }

  startAutoRefresh() {
    // Only start if user has stocks loaded
    const tickers = this.stocks.map(stock => stock.ticker);
    
    if (tickers.length === 0) {
      console.log('StockHistory: Cannot start auto-refresh - no stocks loaded');
      return;
    }
    
    // Stop any existing auto-refresh before starting a new one
    this.stopAutoRefresh();
    
    this.isAutoRefreshEnabled = true;
    console.log(`StockHistory: Starting auto-refresh for ${tickers.length} tickers with ${this.refreshInterval} interval`);

    // Set up interval-based updates using the market data endpoint
    const intervalMs = this.getIntervalMs(this.refreshInterval);
    
    // Create a timer that starts immediately and then repeats at intervals
    this.refreshSubscription = interval(intervalMs).pipe(
      takeUntil(this.destroy$),
      switchMap(() => {
        console.log(`StockHistory: Fetching market data updates for tickers: ${tickers.join(', ')}`);
        return this.stockInfoService.getMarketDataUpdates(tickers);
      })
    ).subscribe({
      next: (marketUpdates: any) => {
        console.log('StockHistory: Received market data updates:', Object.keys(marketUpdates || {}).length, 'tickers updated');
        
        // Update only the market data fields in the existing stocks array
        this.updateMarketDataFields(marketUpdates);
      },
      error: (error: any) => {
        console.error('StockHistory: Error in auto-refresh:', error);
        
        // On error, try to restart auto-refresh after a delay
        setTimeout(() => {
          if (this.isAutoRefreshEnabled) {
            console.log('StockHistory: Restarting auto-refresh after error');
            this.startAutoRefresh();
          }
        }, 5000);
      }
    });
    
    // Make an immediate call to get initial data
    console.log('StockHistory: Making immediate market data call');
    this.stockInfoService.getMarketDataUpdates(tickers).subscribe({
      next: (marketUpdates: any) => {
        console.log('StockHistory: Immediate call received:', Object.keys(marketUpdates || {}).length, 'tickers updated');
        this.updateMarketDataFields(marketUpdates);
      },
      error: (error: any) => {
        console.error('StockHistory: Error in immediate market data call:', error);
      }
    });
  }

  // Helper method to get interval in milliseconds
  private getIntervalMs(interval: string): number {
    switch (interval) {
      case '1M': return 60000; // 1 minute
      case '5M': return 300000; // 5 minutes
      case '15M': return 900000; // 15 minutes
      case '1H': return 3600000; // 1 hour
      default: return 60000; // Default to 1 minute for stock history
    }
  }

  // Method to update only market data fields in the existing stocks array
  private updateMarketDataFields(marketUpdates: {[key: string]: any}) {
    if (!marketUpdates || Object.keys(marketUpdates).length === 0) {
      return;
    }

    let updatedCount = 0;
    
    // Update each stock's market data fields
    this.stocks.forEach(stock => {
      const ticker = stock.ticker;
      const update = marketUpdates[ticker];
      
      if (update) {
        // Update price fields
        if (update.price !== 'N/A') {
          stock.price = update.price;
        }
        if (update.after_hour_price !== 'N/A') {
          stock.after_hour_price = update.after_hour_price;
        }
        
        // Update today's data
        if (update.today) {
          if (!stock.today) {
            stock.today = {
              low: 0,
              high: 0,
              open: 0,
              close: 0,
              prev_close: 0,
              ah_change: '',
              change: ''
            };
          }
          
          // Update today's fields
          if (update.today.low !== 'N/A') {
            stock.today.low = update.today.low;
          }
          if (update.today.high !== 'N/A') {
            stock.today.high = update.today.high;
          }
          if (update.today.open !== 'N/A') {
            stock.today.open = update.today.open;
          }
          if (update.today.close !== 'N/A') {
            stock.today.close = update.today.close;
          }
          if (update.today.prev_close !== 'N/A') {
            stock.today.prev_close = update.today.prev_close;
          }
          if (update.today.ah_change !== 'N/A') {
            stock.today.ah_change = update.today.ah_change;
          }
          if (update.today.change !== 'N/A') {
            stock.today.change = update.today.change;
          }
          // Update SMA values when provided
          if (Object.prototype.hasOwnProperty.call(update.today, 'sma20')) {
            stock.today.sma20 = update.today.sma20;
          }
          if (Object.prototype.hasOwnProperty.call(update.today, 'sma50')) {
            stock.today.sma50 = update.today.sma50;
          }
          if (Object.prototype.hasOwnProperty.call(update.today, 'sma200')) {
            stock.today.sma200 = update.today.sma200;
          }
        }
        
        updatedCount++;
      }
    });
    
    if (updatedCount > 0) {

      
      // Trigger change detection by creating a new reference to the stocks array
      this.stocks = [...this.stocks];
    }
  }

  stopAutoRefresh() {
    console.log('StockHistory: Stopping auto-refresh');
    this.isAutoRefreshEnabled = false;
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
      this.refreshSubscription = null;
      console.log('StockHistory: Auto-refresh subscription unsubscribed');
    }
  }

  onRefreshIntervalChange() {
    if (this.isAutoRefreshEnabled) {
      this.stopAutoRefresh();
      this.startAutoRefresh();
    }
  }



  // Update ticker data manually
  updateTickerData() {
    this.stockInfoService.updateTickerData()
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response: any) => {

          this.loadStocks(); // Reload data after update
        },
        error: (error: any) => {
          this.showError('Ticker Update Error', 'Failed to update ticker data', [
            `Message: ${error.message || 'Unknown error occurred'}`
          ]);
        }
      });
  }

  // Ensure auto-refresh is running
  ensureAutoRefresh() {
    if (this.isAutoRefreshEnabled && this.stocks.length > 0 && !this.refreshSubscription) {

      this.startAutoRefresh();
    }
  }

  // Manual restart of auto-refresh
  restartAutoRefresh() {

    this.stopAutoRefresh();
    setTimeout(() => {
      if (this.isAutoRefreshEnabled && this.stocks.length > 0) {
        this.startAutoRefresh();
      }
    }, 100);
  }



  showSentiment(ticker: string) {
    this.sentimentLoading = true;
    this.showSentimentModal = true;
    
    // Load both sentiment and option data from the same endpoint
    this.loadSentimentData(ticker);
  }

  private loadSentimentData(ticker: string) {
    this.sentimentService.getSentiment(ticker)
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (data: any) => {
          this.sentimentData = data;
          this.sentimentLoading = false;
          
          // Extract option data from sentiment response
          if (data.option_data) {
            this.optionData = {
              ticker: data.ticker,
              current_price: data.option_data.current_price || 0,
              expiration_dates: data.option_data.expiration_dates || [],
              calls: data.option_data.calls || [],
              puts: data.option_data.puts || [],
              last_updated: data.option_data.last_updated || new Date().toISOString()
            };
            
            // Set default expiration if available
            if (this.optionData.expiration_dates && this.optionData.expiration_dates.length > 0) {
              this.selectedExpiration = this.optionData.expiration_dates[0];
              this.filterOptionsByExpiration();
            }
          } else {
            this.optionData = null;
          }
        },
        error: (error: any) => {
          this.showError('Sentiment Loading Error', 'Failed to load sentiment data', [
            `Message: ${error.message || 'Unknown error occurred'}`
          ]);
          this.sentimentLoading = false;
          this.sentimentData = null;
          this.optionData = null;
        }
      });
  }

  private loadOptionData(ticker: string) {
    // This method is no longer needed since options come with sentiment data
    // Keeping it for backward compatibility but it won't be called
    console.log('loadOptionData is deprecated - options now come with sentiment data');
  }

  onExpirationChange() {
    this.filterOptionsByExpiration();
  }

  private filterOptionsByExpiration() {
    if (!this.optionData || !this.selectedExpiration) {
      this.filteredCalls = [];
      this.filteredPuts = [];
      return;
    }

    // Filter calls and puts by selected expiration
    this.filteredCalls = this.optionData.calls.filter(option => 
      option.expiration_date === this.selectedExpiration
    );
    
    this.filteredPuts = this.optionData.puts.filter(option => 
      option.expiration_date === this.selectedExpiration
    );

    // Sort by strike price
    this.filteredCalls.sort((a, b) => a.strike_price - b.strike_price);
    this.filteredPuts.sort((a, b) => a.strike_price - b.strike_price);
  }

  formatExpirationDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    } catch {
      return dateString;
    }
  }

  getAuthStatus(): string {
    const token = this.authService.getToken();
    const isAuthenticated = this.authService.isAuthenticated;
    const currentUser = this.authService.currentUserValue;
    
    if (!token) return 'No token';
    if (!isAuthenticated) return 'Token invalid';
    if (!currentUser) return 'No user data';
    
    return `Authenticated as ${currentUser.username} (${currentUser.role})`;
  }

  closeSentimentModal() {
    this.showSentimentModal = false;
    this.sentimentData = null;
    this.optionData = null;
    this.selectedExpiration = '';
    this.filteredCalls = [];
    this.filteredPuts = [];
    this.sentimentLoading = false;
  }

  getSentimentClass(sentiment: string): string {
    switch (sentiment.toLowerCase()) {
      case 'positive':
        return 'sentiment-positive';
      case 'negative':
        return 'sentiment-negative';
      case 'neutral':
        return 'sentiment-neutral';
      default:
        return 'sentiment-neutral';
    }
  }

  getSentimentIcon(sentiment: string): string {
    switch (sentiment.toLowerCase()) {
      case 'positive':
        return '😊';
      case 'negative':
        return '😞';
      case 'neutral':
        return '😐';
      default:
        return '😐';
    }
  }

  showTooltip(event: MouseEvent, text: string) {
    // Tooltip implementation if needed
  }

  hideTooltip() {
    // Tooltip implementation if needed
  }

  getTop10Holdings() {
    if (!this.sentimentData?.individual_holdings?.holdings) {
      return [];
    }
    return this.sentimentData.individual_holdings.holdings
      .slice(0, 10); // Get top 10 holdings
  }

  getTop10TotalPercentage() {
    if (!this.sentimentData?.individual_holdings?.holdings) {
      return 0;
    }
    const top10 = this.sentimentData.individual_holdings.holdings.slice(0, 10);
    const total = top10.reduce((sum: number, holding: any) => sum + holding.percentage_out, 0);
    return total.toFixed(1);
  }

  // Sorting methods
  sortByColumn(column: string) {
    // Prevent sorting by AH columns when they're hidden during market hours
    if ((column === 'ah_price' || column === 'ah_change') && !this.isAfterHours) {
      console.log('AH columns are hidden during market hours - sorting disabled');
      return;
    }
    
    if (this.sortingColumn === column) {
      // If clicking the same column, toggle sort order
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      // If clicking a new column, set it as the sorting column and default to desc
      this.sortingColumn = column;
      this.sortOrder = 'desc';
    }
    
    // Set loading state for sorting
    this.sortingLoading = true;
    
    // Simulate a small delay to show loading state (optional)
    setTimeout(() => {
      this.sortStocks();
      this.sortingLoading = false;
    }, 100);
  }

  sortStocks() {
    if (!this.sortingColumn) return;

    this.stocks.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      // Extract values based on the sorting column
      switch (this.sortingColumn) {
        case 'ticker':
          aValue = a.ticker.toLowerCase();
          bValue = b.ticker.toLowerCase();
          break;
        case 'sector':
          aValue = a.sector.toLowerCase();
          bValue = b.sector.toLowerCase();
          break;
        case 'market_cap':
          aValue = this.parseMarketCap(a.market_cap);
          bValue = this.parseMarketCap(b.market_cap);
          break;
        case 'earning_date':
          aValue = this.parseEarningDate(a.earning_date);
          bValue = this.parseEarningDate(b.earning_date);
          break;
        case 'price':
          aValue = this.parsePrice(a.price || 'N/A');
          bValue = this.parsePrice(b.price || 'N/A');
          break;
        case 'ah_price':
          aValue = this.parsePrice(a.after_hour_price || 'N/A');
          bValue = this.parsePrice(b.after_hour_price || 'N/A');
          break;
        case 'ah_change':
          aValue = this.parsePercentage(a.today?.ah_change || 'N/A');
          bValue = this.parsePercentage(b.today?.ah_change || 'N/A');
          break;
        case 'today_change':
          aValue = this.parsePercentage(a.today?.change || 'N/A');
          bValue = this.parsePercentage(b.today?.change || 'N/A');
          break;
        case 'today_range':
          aValue = this.parsePercentage(this.calculateTodayRange(a));
          bValue = this.parsePercentage(this.calculateTodayRange(b));
          break;
        case '1D_percentage':
          aValue = this.parsePercentage(a['1D']?.percentage || 'N/A');
          bValue = this.parsePercentage(b['1D']?.percentage || 'N/A');
          break;
        case '1D_range':
          aValue = this.parsePercentage(a['1D']?.high_low_percentage || 'N/A');
          bValue = this.parsePercentage(b['1D']?.high_low_percentage || 'N/A');
          break;
        case '5D_percentage':
          aValue = this.parsePercentage(a['5D']?.percentage || 'N/A');
          bValue = this.parsePercentage(b['5D']?.percentage || 'N/A');
          break;
        case '5D_range':
          aValue = this.parsePercentage(a['5D']?.high_low_percentage || 'N/A');
          bValue = this.parsePercentage(b['5D']?.high_low_percentage || 'N/A');
          break;
        case '1M_percentage':
          aValue = this.parsePercentage(a['1M']?.percentage || 'N/A');
          bValue = this.parsePercentage(b['1M']?.percentage || 'N/A');
          break;
        case '6M_percentage':
          aValue = this.parsePercentage(a['6M']?.percentage || 'N/A');
          bValue = this.parsePercentage(b['6M']?.percentage || 'N/A');
          break;
        case '1Y_percentage':
          aValue = this.parsePercentage(a['1Y']?.percentage || 'N/A');
          bValue = this.parsePercentage(b['1Y']?.percentage || 'N/A');
          break;
        case 'pe_ratio':
          aValue = parseFloat((a.pe_ratio || '').toString()) || 0;
          bValue = parseFloat((b.pe_ratio || '').toString()) || 0;
          break;
        case 'sma20':
          aValue = a.today?.sma20 ?? -Infinity;
          bValue = b.today?.sma20 ?? -Infinity;
          break;
        case 'sma50':
          aValue = a.today?.sma50 ?? -Infinity;
          bValue = b.today?.sma50 ?? -Infinity;
          break;
        case 'sma200':
          aValue = a.today?.sma200 ?? -Infinity;
          bValue = b.today?.sma200 ?? -Infinity;
          break;
        default:
          return 0;
      }

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) aValue = this.sortOrder === 'asc' ? Infinity : -Infinity;
      if (bValue === null || bValue === undefined) bValue = this.sortOrder === 'asc' ? Infinity : -Infinity;

      // Sort based on type
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        if (this.sortOrder === 'asc') {
          return aValue.localeCompare(bValue);
        } else {
          return bValue.localeCompare(aValue);
        }
      } else {
        if (this.sortOrder === 'asc') {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      }
    });
  }

  getSortIcon(column: string): string {
    if (this.sortingColumn !== column) {
      return '↕️'; // Default sort icon
    }
    return this.sortOrder === 'asc' ? '↑' : '↓';
  }

  isSorting(column: string): boolean {
    return this.sortingColumn === column;
  }

  getSortingClass(column: string): string {
    return this.isSorting(column) ? 'sorting' : '';
  }

  // Helper methods for parsing values for sorting
  parseMarketCap(marketCap: string): number {
    if (!marketCap || marketCap === 'N/A') return 0;
    
    const value = marketCap.replace(/[$,]/g, '');
    if (value.includes('T')) {
      return parseFloat(value.replace('T', '')) * 1000000000000;
    } else if (value.includes('B')) {
      return parseFloat(value.replace('B', '')) * 1000000000;
    } else if (value.includes('M')) {
      return parseFloat(value.replace('M', '')) * 1000000;
    } else if (value.includes('K')) {
      return parseFloat(value.replace('K', '')) * 1000;
    } else {
      return parseFloat(value) || 0;
    }
  }

  parseEarningDate(earningDate: string): number {
    if (!earningDate || earningDate === 'N/A') return 0;
    
    // Convert date strings to timestamps for sorting
    const date = new Date(earningDate);
    return isNaN(date.getTime()) ? 0 : date.getTime();
  }

  parsePrice(price: string): number {
    if (!price || price === 'N/A') return 0;
    return parseFloat(price.replace(/[$,]/g, '')) || 0;
  }

  parsePercentage(percentage: string): number {
    if (!percentage || percentage === 'N/A') return 0;
    
    // Remove % sign and convert to number
    const value = percentage.replace('%', '');
    return parseFloat(value) || 0;
  }


}
