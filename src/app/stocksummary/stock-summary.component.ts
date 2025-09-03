import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StockSummaryService } from '../service/stock-summary.service';
import { SectorService } from '../service/sector.service';
import { StockSummaryData, SectorGroup } from '../stocks/models';
import { Chart, ChartConfiguration, ChartData } from 'chart.js';
import { CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, BarController } from 'chart.js';
import { Subscription, interval, Subject, timer } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'stock-summary',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stock-summary.component.html',
  styleUrls: ['./stock-summary.component.scss'],
})
export class StockSummaryComponent implements OnInit, OnDestroy {
  @ViewChild('chartCanvas', { static: false }) chartCanvas!: ElementRef<HTMLCanvasElement>;
  
  sectorGroups: SectorGroup[] = [];
  sectors: string[] = [];
  selectedSectors: string[] = [];
  loading = false;
  filterIsXticker: boolean | null = null;
  selectedPeriod: 'today' | '1D' | '1W' | '1M' | 'custom' = '1W';
  dateFrom = '';
  dateTo = '';
  dateRangeError = '';
  viewMode: 'grid' | 'chart' = 'grid';
  hasSearched = false; // Track if user has performed a search
  lastRefreshTime: string = ''; // Track when data was last refreshed
  
  // Auto-refresh properties (only for Today filter)
  public refreshSubscription: Subscription | null = null;
  private destroy$ = new Subject<void>();
  private loadSummaryTrigger$ = new Subject<void>();
  isAutoRefreshEnabled = false;
  refreshInterval: '1M' | '5M' | '15M' | '1H' = '5M';
  refreshOptions: ('1M' | '5M' | '15M' | '1H')[] = ['1M', '5M', '15M', '1H'];
  
  private chart: Chart | null = null;

  constructor(
    private stockSummaryService: StockSummaryService,
    private sectorService: SectorService
  ) {
    // Register Chart.js components
    Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, BarController);
    this.selectedPeriod = 'today'; // Set default to today
    this.setDefaultDateRange();
    // Ensure initial state is set correctly
    this.hasSearched = true; // Set to true to show grid initially
    this.sectorGroups = [];
  }

  ngOnInit() {
    // Auto-trigger initial search after sectors are loaded
    this.sectorService.getSectors().subscribe({
      next: (res) => {
        this.sectors = res.results.map((s: any) => s.sector || s.Sector);
        // Default to select all sectors
        this.selectedSectors = [...this.sectors];
        // Auto-trigger initial search
        this.hasSearched = true;
        this.loadSummaryData();
      },
      error: () => {
        // Fallback sectors if API fails
        this.sectors = ['Technology', 'Consumer Discretionary', 'Financials', 'Healthcare', 'Energy'];
        // Default to select all sectors
        this.selectedSectors = [...this.sectors];
        // Auto-trigger initial search even with fallback sectors
        this.hasSearched = true;
        this.loadSummaryData();
      }
    });

    // Set up debounced load summary mechanism
    this.loadSummaryTrigger$.pipe(
      debounceTime(300), // Debounce for 300ms
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.loadSummaryData();
    });

    // Periodic check to ensure auto-refresh is running (only when enabled)
    interval(30000).pipe( // Check every 30 seconds
      takeUntil(this.destroy$)
    ).subscribe(() => {
      if (this.isAutoRefreshEnabled) {
        this.ensureAutoRefresh();
      }
    });
  }

  ngOnDestroy() {
    this.stopAutoRefresh();
    this.destroy$.next();
    this.destroy$.complete();
    this.loadSummaryTrigger$.complete();
    
    if (this.chart) {
      this.chart.destroy();
    }
  }

  private setDefaultDateRange() {
    this.updateDatesForPeriod(this.selectedPeriod);
  }

  /**
   * Update dates based on selected period
   */
  private updateDatesForPeriod(period: 'today' | '1D' | '1W' | '1M' | 'custom') {
    const today = new Date();
    
    switch (period) {
      case 'today':
        // Today - no date range needed for today filter
        this.dateFrom = '';
        this.dateTo = '';
        break;
        
      case '1D':
        // Yesterday
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        this.dateFrom = this.formatDate(yesterday);
        this.dateTo = this.formatDate(yesterday);
        break;
        
      case '1W':
        // Last week (Monday to Friday)
        const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        let daysToLastMonday = currentDay === 0 ? 6 : currentDay - 1; // If Sunday, go back 6 days, otherwise currentDay - 1
        const lastMonday = new Date(today);
        lastMonday.setDate(today.getDate() - daysToLastMonday - 7); // Go back to previous week
        
        const lastFriday = new Date(lastMonday);
        lastFriday.setDate(lastMonday.getDate() + 4);
        
        this.dateFrom = this.formatDate(lastMonday);
        this.dateTo = this.formatDate(lastFriday);
        break;
        
      case '1M':
        // Last month
        const lastMonth = new Date(today);
        lastMonth.setMonth(today.getMonth() - 1);
        this.dateFrom = this.formatDate(lastMonth);
        this.dateTo = this.formatDate(today);
        break;
        
      case 'custom':
        // Keep existing dates, don't change them
        break;
    }
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Validate the date range before loading data
   */
  private validateDateRange(): boolean {
    this.dateRangeError = '';
    
    if (this.dateFrom && this.dateTo) {
      const fromDate = new Date(this.dateFrom);
      const toDate = new Date(this.dateTo);
      
      if (fromDate > toDate) {
        this.dateRangeError = 'Start date cannot be after end date';
        return false;
      }
      
      // Allow same dates - this is valid for single-day analysis
      if (fromDate.getTime() === toDate.getTime()) {
        console.log('Same date selected for stock summary analysis');
      }
      
      // Check if date range is not too far in the past (more than 5 years)
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
      
      if (fromDate < fiveYearsAgo) {
        this.dateRangeError = 'Start date cannot be more than 5 years ago';
        return false;
      }
    }
    
    return true;
  }

  /**
   * Load stock summary data from the service
   */
  loadSummaryData() {
    // For 'today' period, skip date validation since we don't need dates
    if (this.selectedPeriod !== 'today' && !this.validateDateRange()) {
      return; // Don't load data if date validation fails
    }
    
    // Debug: Log current expansion state before loading
    console.log('Current expansion state before loading:', this.sectorGroups.map(g => ({ sector: g.sector, expanded: g.expanded })));
    
    // Preserve current expansion state
    const currentExpansionState = new Map<string, boolean>();
    this.sectorGroups.forEach(group => {
      currentExpansionState.set(group.sector, group.expanded);
    });
    
    this.loadSummaryDataWithExpansionState(currentExpansionState);
  }

  /**
   * Load stock summary data with specific expansion state preservation
   */
  private loadSummaryDataWithExpansionState(expansionState: Map<string, boolean>) {
    console.log('Loading data with expansion state:', Array.from(expansionState.entries()));
    
    this.loading = true;
    
    const params: any = {};
    
    if (this.selectedSectors.length > 0) {
      params.sectors = this.selectedSectors;
    }
    
    if (this.filterIsXticker !== null) {
      params.isleverage = this.filterIsXticker;
    }
    
    if (this.selectedPeriod === 'today') {
      params.today = true;
    } else if (this.dateFrom && this.dateTo) {
      params.dateFrom = this.dateFrom;
      params.dateTo = this.dateTo;
    }
    
    this.stockSummaryService.getStockSummary(
      params.sectors,
      params.isleverage,
      params.dateFrom,
      params.dateTo,
      params.today
    ).subscribe({
      next: (response) => {
        this.sectorGroups = response.groups || [];
        
        // Apply the preserved expansion state
        this.sectorGroups.forEach(group => {
          if (expansionState.has(group.sector)) {
            const wasExpanded = group.expanded;
            group.expanded = expansionState.get(group.sector)!;
            console.log(`Applied expansion state for ${group.sector}: ${wasExpanded} -> ${group.expanded}`);
          }
        });
        
        // Sort the data
        this.sortStocksByPercentage();
        this.sortSectorGroupsByAveragePercentage();
        
        // Debug: Log expansion state after loading
        console.log('Expansion state after loading:', this.sectorGroups.map(g => ({ sector: g.sector, expanded: g.expanded })));
        
        this.loading = false;
        this.lastRefreshTime = new Date().toLocaleTimeString();
        
        // Restart auto-refresh if it was enabled and we're on Today filter
        if (this.selectedPeriod === 'today' && this.isAutoRefreshEnabled && !this.refreshSubscription) {
          console.log('Restarting auto-refresh after data load...');
          setTimeout(() => {
            this.startAutoRefresh();
          }, 100);
        }
        
        // Update chart if in chart view
        if (this.viewMode === 'chart') {
          this.updateChart();
        }
      },
      error: (error) => {
        console.error('Error loading stock summary data:', error);
        this.loading = false;
        this.sectorGroups = [];
      }
    });
  }

  /**
   * Refresh today's data (for manual refresh and auto-refresh)
   */
  refreshTodayData() {
    if (this.selectedPeriod === 'today') {
      console.log('Refreshing today data...');
      
      // Show loading state specifically for refresh
      this.loading = true;
      
      // Store current expansion state before clearing data
      const currentExpansionState = new Map<string, boolean>();
      this.sectorGroups.forEach(group => {
        currentExpansionState.set(group.sector, group.expanded);
      });
      
      // Force refresh by clearing current data and reloading
      this.sectorGroups = [];
      
      // Add a small delay to show the refresh is happening
      setTimeout(() => {
        // Pass the preserved expansion state to loadSummaryData
        this.loadSummaryDataWithExpansionState(currentExpansionState);
      }, 100);
    }
  }

  // Auto-refresh functionality (only for Today filter)
  toggleAutoRefresh() {
    if (this.isAutoRefreshEnabled) {
      this.stopAutoRefresh();
      console.log('Auto-refresh stopped by user');
    } else {
      if (this.selectedPeriod !== 'today') {
        console.log('Auto-refresh is only available for Today filter');
        return;
      }
      if (this.sectorGroups.length === 0) {
        console.log('Please load Today data first before starting auto-refresh');
        return;
      }
      this.startAutoRefresh();
      console.log('Auto-refresh started by user');
    }
  }

  startAutoRefresh() {
    // Only start if user is on Today filter and has data
    if (this.selectedPeriod !== 'today') {
      console.log('Auto-refresh is only available for Today filter');
      return;
    }
    
    if (this.sectorGroups.length === 0) {
      console.log('No Today data loaded - please load data first before starting auto-refresh');
      return;
    }
    
    // Stop any existing auto-refresh before starting a new one
    this.stopAutoRefresh();
    
    this.isAutoRefreshEnabled = true;
    console.log(`Starting auto-refresh for Today filter with interval: ${this.refreshInterval}`);
    
    // Calculate interval in milliseconds
    const intervalMs = this.getIntervalMs(this.refreshInterval);
    
    this.refreshSubscription = interval(intervalMs)
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        console.log(`Auto-refresh triggered at ${new Date().toLocaleTimeString()}`);
        this.refreshTodayData();
      });
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

  private getIntervalMs(interval: string): number {
    switch (interval) {
      case '1M': return 60 * 1000; // 1 minute
      case '5M': return 5 * 60 * 1000; // 5 minutes
      case '15M': return 15 * 60 * 1000; // 15 minutes
      case '1H': return 60 * 60 * 1000; // 1 hour
      default: return 5 * 60 * 1000; // Default to 5 minutes
    }
  }

  // Ensure auto-refresh is running
  ensureAutoRefresh() {
    if (this.isAutoRefreshEnabled && this.selectedPeriod === 'today' && this.sectorGroups.length > 0 && !this.refreshSubscription) {
      console.log('Auto-refresh was stopped, restarting...');
      this.startAutoRefresh();
    }
  }

  // Manual restart of auto-refresh
  restartAutoRefresh() {
    console.log('Manually restarting auto-refresh...');
    this.stopAutoRefresh();
    setTimeout(() => {
      if (this.isAutoRefreshEnabled && this.selectedPeriod === 'today' && this.sectorGroups.length > 0) {
        this.startAutoRefresh();
      }
    }, 100);
  }

  // Check if auto-refresh should be available
  isAutoRefreshAvailable(): boolean {
    return this.selectedPeriod === 'today' && this.sectorGroups.length > 0;
  }

  onSectorFilterChange() {
    // Stop auto-refresh when filters change
    if (this.isAutoRefreshEnabled) {
      this.stopAutoRefresh();
    }
    
    // Auto-trigger search when sector filter changes
    this.hasSearched = true;
    this.loadSummaryData();
  }

  onIsXtickerFilterChange() {
    // Stop auto-refresh when filters change
    if (this.isAutoRefreshEnabled) {
      this.stopAutoRefresh();
    }
    
    // Auto-trigger search when leverage filter changes
    this.hasSearched = true;
    this.loadSummaryData();
  }

  onDateFilterChange() {
    // Stop auto-refresh when dates change
    if (this.isAutoRefreshEnabled) {
      this.stopAutoRefresh();
    }
    
    // Auto-trigger search when custom dates change
    if (this.selectedPeriod === 'custom') {
      this.hasSearched = true;
      this.loadSummaryData();
    }
  }

  clearFilters() {
    this.selectedSectors = [];
    this.filterIsXticker = null;
    this.selectedPeriod = 'today';
    this.dateRangeError = '';
    this.setDefaultDateRange(); // Reset to default date range instead of clearing
    
    // Stop auto-refresh when clearing filters
    if (this.isAutoRefreshEnabled) {
      this.stopAutoRefresh();
    }
    
    // Auto-trigger search when clearing filters (resets to 'today' period)
    this.hasSearched = true;
    this.loadSummaryData();
  }

  /**
   * Select a time period and update dates accordingly
   */
  selectPeriod(period: 'today' | '1D' | '1W' | '1M' | 'custom') {
    this.selectedPeriod = period;
    this.updateDatesForPeriod(period);
    
    // Stop auto-refresh if switching away from Today filter
    if (period !== 'today' && this.isAutoRefreshEnabled) {
      this.stopAutoRefresh();
    }
    
    // Auto-trigger search for predefined periods (Today, 1D, 1W, 1M)
    // Custom period requires user to set dates first, so don't auto-trigger
    if (period !== 'custom') {
      this.hasSearched = true;
      this.loadSummaryData();
    } else {
      // For custom period, reset search state - user must click Search button after setting dates
      this.hasSearched = false;
      this.sectorGroups = [];
    }
  }

  performSearch() {
    // Stop auto-refresh when manually searching
    if (this.isAutoRefreshEnabled) {
      this.stopAutoRefresh();
    }
    
    this.hasSearched = true;
    this.loadSummaryData();
  }

  toggleGroup(group: SectorGroup) {
    const wasExpanded = group.expanded;
    group.expanded = !group.expanded;
    console.log(`Toggled ${group.sector} from ${wasExpanded} to ${group.expanded}`);
  }

  /**
   * Toggle all sector groups (expand if any collapsed, collapse if all expanded)
   */
  toggleAllGroups(): void {
    if (this.areAllGroupsExpanded()) {
      this.collapseAllGroups();
    } else {
      this.expandAllGroups();
    }
  }

  /**
   * Expand all sector groups
   */
  expandAllGroups(): void {
    this.sectorGroups.forEach(group => {
      group.expanded = true;
    });
    console.log('All groups expanded');
  }

  /**
   * Collapse all sector groups
   */
  collapseAllGroups(): void {
    this.sectorGroups.forEach(group => {
      group.expanded = false;
    });
    console.log('All groups collapsed');
  }

  /**
   * Check if all groups are currently expanded
   */
  areAllGroupsExpanded(): boolean {
    return this.sectorGroups.length > 0 && this.sectorGroups.every(group => group.expanded);
  }

  /**
   * Check if any groups are currently expanded
   */
  areAnyGroupsExpanded(): boolean {
    return this.sectorGroups.some(group => group.expanded);
  }

  toggleSector(sector: string) {
    const index = this.selectedSectors.indexOf(sector);
    if (index > -1) {
      this.selectedSectors.splice(index, 1);
    } else {
      this.selectedSectors.push(sector);
    }
    
    // Stop auto-refresh when sectors change
    if (this.isAutoRefreshEnabled) {
      this.stopAutoRefresh();
    }
    
    // Auto-trigger search when sectors change (user is actively filtering)
    this.hasSearched = true;
    this.loadSummaryData();
  }

  isSectorSelected(sector: string): boolean {
    return this.selectedSectors.includes(sector);
  }

  isAllSectorsSelected(): boolean {
    return this.selectedSectors.length === this.sectors.length && this.sectors.length > 0;
  }

  getSectorDisplayText(): string {
    if (this.isAllSectorsSelected()) {
      return 'All';
    }
    return this.selectedSectors.length > 0 ? `${this.selectedSectors.length} selected` : 'Select sectors';
  }

  getPercentageChangeClass(value: string): string {
    if (!value) return 'neutral-change';
    const num = parseFloat(value.replace(/[^\d.-]/g, ''));
    if (isNaN(num)) return 'neutral-change';
    if (num > 0) return 'positive-change';
    if (num < 0) return 'negative-change';
    return 'neutral-change';
  }

  getDateRangeDisplay(): string {
    if (this.dateFrom && this.dateTo) {
      const fromDate = new Date(this.dateFrom);
      const toDate = new Date(this.dateTo);
      return `${fromDate.toLocaleDateString()} - ${toDate.toLocaleDateString()}`;
    }
    return 'All dates';
  }

  isSameDateSelected(): boolean {
    if (this.dateFrom && this.dateTo) {
      return this.dateFrom === this.dateTo;
    }
    return false;
  }

  toggleViewMode() {
    this.viewMode = this.viewMode === 'grid' ? 'chart' : 'grid';
    if (this.viewMode === 'chart' && this.sectorGroups.length > 0) {
      // Use setTimeout to ensure DOM is ready and chart canvas is available
      setTimeout(() => {
        this.createChart();
      }, 100);
    }
  }

  private createChart() {
    // Check if we have the required elements and data
    if (!this.chartCanvas || !this.sectorGroups.length) {
      console.log('Chart creation skipped:', {
        hasCanvas: !!this.chartCanvas,
        hasData: this.sectorGroups.length > 0,
        viewMode: this.viewMode
      });
      return;
    }

    // Destroy existing chart
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) {
      console.error('Failed to get chart context');
      return;
    }

    // Prepare chart data
    const labels = this.sectorGroups.map(group => group.sector);
    const data = this.sectorGroups.map(group => {
      const percentage = parseFloat(group.averagePercentage.replace(/[^\d.-]/g, ''));
      return isNaN(percentage) ? 0 : percentage;
    });

    // Create color array based on positive/negative values
    const colors = data.map(value => value >= 0 ? '#4caf50' : '#f44336');

    const chartData: ChartData<'bar'> = {
      labels: labels,
      datasets: [{
        label: 'Average Percentage Change (%)',
        data: data,
        backgroundColor: colors,
        borderColor: colors,
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false,
      }]
    };

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: this.isSameDateSelected() 
              ? 'Stock Summary by Sector (Intraday Analysis: Open vs Close)'
              : 'Stock Summary by Sector',
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const sectorGroup = this.sectorGroups[context.dataIndex];
                const tooltipLines = [`Average Change: ${context.parsed.y.toFixed(2)}%`];
                tooltipLines.push(''); // Empty line for separation
                tooltipLines.push('Individual Stocks:');
                
                // Add individual stock percentages
                sectorGroup.stocks.forEach(stock => {
                  const percentage = parseFloat(stock.percentageChange.replace(/[^\d.-]/g, ''));
                  const displayPercentage = isNaN(percentage) ? '0.00' : percentage.toFixed(2);
                  tooltipLines.push(`${stock.ticker}: ${displayPercentage}%`);
                });
                
                return tooltipLines;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Percentage Change (%)'
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Sectors'
            },
            grid: {
              display: false
            }
          }
        },
        animation: {
          duration: 1000
        }
      }
    };

    this.chart = new Chart(ctx, config);
  }

  updateChart() {
    if (this.viewMode === 'chart') {
      // Force chart recreation
      if (this.chart) {
        this.chart.destroy();
        this.chart = null;
      }
      setTimeout(() => {
        this.createChart();
      }, 100);
    }
  }

  /**
   * Force refresh chart when data changes
   */
  refreshChart() {
    if (this.viewMode === 'chart' && this.sectorGroups.length > 0) {
      setTimeout(() => {
        this.createChart();
      }, 100);
    }
  }

  /**
   * Sort stocks within each sector group by percentage change in descending order
   */
  private sortStocksByPercentage() {
    this.sectorGroups.forEach(group => {
      if (group.stocks && group.stocks.length > 0) {
        group.stocks.sort((a, b) => {
          // Extract numeric percentage values, removing % and other characters
          const aPercentage = parseFloat(a.percentageChange.replace(/[^\d.-]/g, ''));
          const bPercentage = parseFloat(b.percentageChange.replace(/[^\d.-]/g, ''));
          
          // Handle NaN values (put them at the end)
          if (isNaN(aPercentage) && isNaN(bPercentage)) return 0;
          if (isNaN(aPercentage)) return 1;
          if (isNaN(bPercentage)) return -1;
          
          // Sort in descending order (highest percentage first)
          return bPercentage - aPercentage;
        });
      }
    });
  }

  /**
   * Sort sector groups by average percentage in descending order
   */
  private sortSectorGroupsByAveragePercentage() {
    this.sectorGroups.sort((a, b) => {
      // Extract numeric percentage values, removing % and other characters
      const aPercentage = parseFloat(a.averagePercentage.replace(/[^\d.-]/g, ''));
      const bPercentage = parseFloat(b.averagePercentage.replace(/[^\d.-]/g, ''));
      
      // Handle NaN values (put them at the end)
      if (isNaN(aPercentage) && isNaN(bPercentage)) return 0;
      if (isNaN(aPercentage)) return 1;
      if (isNaN(bPercentage)) return -1;
      
      // Sort in descending order (highest percentage first)
      return bPercentage - aPercentage;
    });
  }

  /**
   * Get the appropriate label for the start date column based on selected period
   */
  getStartDateLabel(): string {
    if (this.selectedPeriod === 'today') {
      return 'Prev Close Price';
    } else if (this.isSameDateSelected()) {
      return `${this.dateFrom} Opening Price`;
    } else {
      return `${this.dateFrom} Closing Price`;
    }
  }

  /**
   * Get the appropriate label for the end date column based on selected period
   */
  getEndDateLabel(): string {
    if (this.selectedPeriod === 'today') {
      return 'Open Price';
    } else if (this.isSameDateSelected()) {
      return `${this.dateTo} Closing Price`;
    } else {
      return `${this.dateTo} Closing Price`;
    }
  }
}