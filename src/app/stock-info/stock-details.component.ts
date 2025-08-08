import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StockInfo, EnhancedStockInfo, LeverageFilter, RefreshInterval } from './models';
import { StockInfoService } from './stock-info.service';
import { SectorService } from './sector.service';
import { SentimentService, SentimentData } from './sentiment.service';
import { Subscription, interval, Subject, timer } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'stock-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stock-details.component.html',
  styleUrls: ['./stock-details.component.scss'],
})
export class StockDetailsComponent implements OnInit, OnDestroy {
  stocks: EnhancedStockInfo[] = [];
  sectors: string[] = [];
  loading = false;
  filterTicker = '';
  filterSector = '';
  leverageFilter: LeverageFilter = 'Ticker Only';
  refreshInterval: RefreshInterval = '1M';  // Changed default to 1M
  sortBy: string = 'today_percentage';
  sortOrder: 'asc' | 'desc' = 'desc';
  sortingColumn: string | null = null; // Track which column is being sorted

  // Total records count
  totalRecords = 0;

  // Sentiment popup properties
  showSentimentModal = false;
  sentimentData: SentimentData | null = null;
  sentimentLoading = false;

  // Auto-refresh properties
  private refreshSubscription: Subscription | null = null;
  private loadStocksSubscription: Subscription | null = null;
  private destroy$ = new Subject<void>();
  private loadStocksTrigger$ = new Subject<void>();
  realtimePrices: {[key: string]: {current_price: string, today_change: string, ah_percentage: string}} = {};
  isAutoRefreshEnabled = true;  // Changed default to true
  private autoRefreshStarted = false; // Track if auto-refresh has been started

  // Leverage filter options
  leverageOptions: LeverageFilter[] = ['Ticker Only', 'Leverage Only', 'Both'];
  
  // Refresh interval options
  refreshOptions: RefreshInterval[] = ['1M', '5M', '15M', '1H'];

  constructor(
    private stockInfoService: StockInfoService,
    private sectorService: SectorService,
    private sentimentService: SentimentService
  ) {}

  ngOnInit() {
    this.loadSectors();
    
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
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
    this.cancelLoadStocks();
    this.destroy$.next();
    this.destroy$.complete();
    this.loadStocksTrigger$.complete();
  }

  loadSectors() {
    this.sectorService.getSectors()
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          this.sectors = response.results.map((sector: any) => sector.sector);
        },
        error: (error) => {
          console.error('Error loading sectors:', error);
        }
      });
  }

  loadStocks() {
    // Trigger the debounced load mechanism
    this.loadStocksTrigger$.next();
  }

  private performLoadStocks() {
    // Cancel any existing load request
    this.cancelLoadStocks();
    
    this.loading = true;
    
    console.log(`Loading stocks with filters: Ticker="${this.filterTicker}", Sector="${this.filterSector}", Leverage="${this.leverageFilter}", Sort="${this.sortBy} ${this.sortOrder}"`);
    
    this.loadStocksSubscription = this.stockInfoService.getEnhancedStockDetails(
      this.filterTicker,
      this.filterSector,
      this.leverageFilter,
      this.sortBy,
      this.sortOrder
    ).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        this.stocks = response.stocks;
        this.totalRecords = response.total;
        this.loading = false;
        this.sortingColumn = null; // Clear sorting indicator
        
        console.log(`Loaded ${this.totalRecords} stocks with current filters`);
        console.log(`Filtered tickers: ${this.stocks.map(s => s.ticker).join(', ')}`);
        
        // Start auto-refresh only once
        if (!this.autoRefreshStarted) {
          this.startAutoRefresh();
          this.autoRefreshStarted = true;
        }
      },
      error: (error) => {
        console.error('Error loading stocks:', error);
        this.loading = false;
        this.sortingColumn = null; // Clear sorting indicator on error
      }
    });
  }

  cancelLoadStocks() {
    if (this.loadStocksSubscription) {
      this.loadStocksSubscription.unsubscribe();
      this.loadStocksSubscription = null;
      console.log('Cancelled previous load stocks request');
    }
  }

  searchStocks() {
    console.log(`Search triggered with ticker: "${this.filterTicker}"`);
    // Trigger immediate load for search
    this.performLoadStocks();
  }

  onLeverageFilterChange() {
    console.log(`Leverage filter changed to: ${this.leverageFilter}`);
    // Reset auto-refresh flag for new filter
    this.autoRefreshStarted = false;
    // Trigger immediate load for leverage changes
    this.performLoadStocks();
  }

  onSectorFilterChange() {
    console.log(`Sector filter changed to: ${this.filterSector}`);
    // Reset auto-refresh flag for new filter
    this.autoRefreshStarted = false;
    // Trigger immediate load for sector changes
    this.performLoadStocks();
  }

  clearFilters() {
    this.filterTicker = '';
    this.filterSector = '';
    this.leverageFilter = 'Ticker Only';
    this.sortBy = 'today_percentage';
    this.sortOrder = 'desc';
    // Reset auto-refresh flag for new filter
    this.autoRefreshStarted = false;
    // Trigger immediate load for filter clear
    this.performLoadStocks();
  }

  sortByColumn(column: string) {
    if (this.sortBy === column) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = column;
      this.sortOrder = 'asc';
    }
    this.sortingColumn = column; // Set sorting indicator
    console.log(`Frontend: Sorting by: ${this.sortBy} ${this.sortOrder}`);
    // Trigger immediate load for sorting
    this.performLoadStocks();
  }

  getSortIcon(column: string): string {
    if (this.sortBy === column) {
      return this.sortOrder === 'asc' ? '↑' : '↓';
    }
    return '';
  }

  isSorting(column: string): boolean {
    return this.sortingColumn === column;
  }

  getPercentageChangeClass(value: string): string {
    if (!value || value === 'N/A') return '';
    const numValue = parseFloat(value.replace('%', '').replace('+', ''));
    return numValue > 0 ? 'positive-change' : numValue < 0 ? 'negative-change' : '';
  }

  // Auto-refresh functionality
  toggleAutoRefresh() {
    if (this.isAutoRefreshEnabled) {
      this.stopAutoRefresh();
    } else {
      this.startAutoRefresh();
    }
  }

  startAutoRefresh() {
    // Stop any existing auto-refresh before starting a new one
    this.stopAutoRefresh();
    
    this.isAutoRefreshEnabled = true;
    const tickers = this.stocks.map(stock => stock.ticker);
    
    console.log(`Starting auto-refresh for ${tickers.length} tickers with interval: ${this.refreshInterval}`);
    
    if (tickers.length > 0) {
      this.refreshSubscription = this.stockInfoService.startAutoRefresh(tickers, this.refreshInterval)
        .pipe(
          takeUntil(this.destroy$)
        )
        .subscribe({
          next: (prices) => {
            console.log(`Auto-refresh update received at ${new Date().toLocaleTimeString()}`);
            this.realtimePrices = prices;
          },
          error: (error) => {
            console.error('Error in auto-refresh:', error);
          }
        });
    }
  }

  stopAutoRefresh() {
    this.isAutoRefreshEnabled = false;
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
      this.refreshSubscription = null;
    }
  }

  onRefreshIntervalChange() {
    if (this.isAutoRefreshEnabled) {
      this.stopAutoRefresh();
      this.startAutoRefresh();
    }
  }

  // Get current price with real-time updates
  getCurrentPrice(stock: EnhancedStockInfo): string {
    const realtimeData = this.realtimePrices[stock.ticker];
    return realtimeData?.current_price || stock.current_price;
  }

  // Get today's change with real-time updates
  // During after-hours, this should not refresh (use cached data)
  getTodayChange(stock: EnhancedStockInfo): string {
    const realtimeData = this.realtimePrices[stock.ticker];
    
    // If we have real-time data and it's not frozen, use it
    if (realtimeData && realtimeData.today_change !== 'FROZEN') {
      return realtimeData.today_change;
    }
    
    // Otherwise, use the cached data from the initial load
    return stock.today.percentage;
  }

  // Get after-hours percentage with real-time updates
  getAhPercentage(stock: EnhancedStockInfo): string {
    const realtimeData = this.realtimePrices[stock.ticker];
    return realtimeData?.ah_percentage || stock.ah_percentage;
  }

  // Update ticker data manually
  updateTickerData() {
    this.stockInfoService.updateTickerData()
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          console.log(response.message);
          this.loadStocks(); // Reload data after update
        },
        error: (error) => {
          console.error('Error updating ticker data:', error);
        }
      });
  }

  showSentiment(ticker: string) {
    this.sentimentLoading = true;
    this.showSentimentModal = true;
    
    this.sentimentService.getSentiment(ticker)
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (data) => {
          this.sentimentData = data;
          this.sentimentLoading = false;
        },
        error: (error) => {
          console.error('Error loading sentiment:', error);
          this.sentimentLoading = false;
          this.sentimentData = null;
        }
      });
  }

  closeSentimentModal() {
    this.showSentimentModal = false;
    this.sentimentData = null;
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
} 