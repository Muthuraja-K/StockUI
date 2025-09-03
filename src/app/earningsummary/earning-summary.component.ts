import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EarningSummaryService } from '../service/earning-summary.service';
import { SectorService } from '../service/sector.service';
import { EarningData } from '../stocks/models';
import { PriceChartComponent } from './price-chart.component';

@Component({
  selector: 'earning-summary',
  standalone: true,
  imports: [CommonModule, FormsModule, PriceChartComponent],
  templateUrl: './earning-summary.component.html',
  styleUrls: ['./earning-summary.component.scss'],
})
export class EarningSummaryComponent {
  earnings: EarningData[] = [];
  sectors: string[] = [];
  selectedSectors: string[] = [];
  loading = false;
  selectedPeriod: '1D' | '1W' | '1M' | 'custom' | '' = '1W';
  hasSearched: boolean = false;
  dateFrom = '';
  dateTo = '';
  dateRangeError = '';
  
  // Sorting properties
  sortBy: string = 'earningDate';
  sortOrder: 'asc' | 'desc' = 'asc';
  sortingColumn: string = '';
  
  // Popup properties
  isEarningDatesPopupVisible = false;
  showPriceChartPopup = false;
  selectedTicker = '';
  selectedEarningData: EarningData | null = null;
  selectedChartDate = '';
  chartLoading = false;
  priceChartData: any = null;
  selectedInterval: '1h' = '1h'; // Chart interval: only hourly
  
  // Tooltip properties
  tooltipVisible = false;
  tooltipX = 0;
  tooltipY = 0;
  tooltipData: any = null;
  


  constructor(
    private earningSummaryService: EarningSummaryService,
    private sectorService: SectorService
  ) {
    this.setDefaultDateRange();
    this.loadSectors();
    // loadEarningData() will be called after sectors are loaded
  }

  ngOnInit() {
    console.log('=== COMPONENT INITIALIZED ===');
    console.log('Component state:', {
      selectedPeriod: this.selectedPeriod,
      selectedSectors: this.selectedSectors,
      dateFrom: this.dateFrom,
      dateTo: this.dateTo
    });
    
    this.setDefaultDateRange();
    console.log('Default date range set:', {
      dateFrom: this.dateFrom,
      dateTo: this.dateTo
    });
    
    // Load initial data when component loads
    console.log('Calling performSearch()...');
    this.performSearch();
    console.log('=== END INIT ===');
  }

  // Time period filter methods
  selectPeriod(period: '1D' | '1W' | '1M' | 'custom' | '') {
    this.selectedPeriod = period;
    if (period === 'custom') {
      // For custom dates, we'll use the date pickers
      // The dates are already set by the user
    } else if (period !== '') {
      // For predefined periods, we don't need to set dates
      // The backend will handle the period filtering
      this.dateFrom = '';
      this.dateTo = '';
    }
    // Don't auto-trigger search, wait for user to click search button
  }

  private updateDatesForPeriod() {
    const today = new Date();
    let startDate: Date;
    let endDate: Date;
    
    switch (this.selectedPeriod) {
      case '1D':
        // Show earnings for today only
        startDate = new Date(today);
        endDate = new Date(today);
        break;
      case '1W':
        // Show earnings within the next 7 days
        startDate = new Date(today);
        endDate = new Date(today);
        endDate.setDate(today.getDate() + 7);
        break;
      case '1M':
        // Show earnings within the next 30 days
        startDate = new Date(today);
        endDate = new Date(today);
        endDate.setDate(today.getDate() + 30);
        break;
      default:
        return;
    }
    
    this.dateFrom = startDate.toISOString().split('T')[0];
    this.dateTo = endDate.toISOString().split('T')[0];
  }

  get filteredAndSortedEarnings(): EarningData[] {
    let filtered = [...this.earnings];
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (this.sortBy) {
        case 'ticker':
          aValue = a.ticker;
          bValue = b.ticker;
          break;
        case 'currentPrice':
          aValue = this.parseNumericValue(a.currentPrice);
          bValue = this.parseNumericValue(b.currentPrice);
          break;
        case 'earningDate':
          aValue = new Date(a.earningDate || '1900-01-01').getTime();
          bValue = new Date(b.earningDate || '1900-01-01').getTime();
          break;
        default:
          return 0;
      }
      
      // Handle string comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const result = aValue.localeCompare(bValue);
        return this.sortOrder === 'asc' ? result : -result;
      }
      
      // Handle numeric comparison
      if (aValue < bValue) {
        return this.sortOrder === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return this.sortOrder === 'asc' ? 1 : -1;
      }
      return 0;
    });
    
    return filtered;
  }

  private parseNumericValue(value: string): number {
    if (!value || value === 'N/A') return 0;
    // Remove currency symbols, commas, and other non-numeric characters except decimal point and minus
    const numericValue = parseFloat(value.replace(/[^0-9.-]/g, ''));
    return isNaN(numericValue) ? 0 : numericValue;
  }

  private setDefaultDateRange() {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    
    // Calculate this Monday (current week's Monday)
    let daysToThisMonday = currentDay === 0 ? 1 : currentDay - 1; // If Sunday, go forward 1 day, otherwise go back to Monday
    const thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() - daysToThisMonday);
    
    // Calculate this Friday (4 days after Monday)
    const thisFriday = new Date(thisMonday);
    thisFriday.setDate(thisMonday.getDate() + 4);
    
    // Format dates as YYYY-MM-DD
    this.dateFrom = this.formatDate(thisMonday);
    this.dateTo = this.formatDate(thisFriday);
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private validateDateRange(): boolean {
    this.dateRangeError = '';
    
    if (this.dateFrom && this.dateTo) {
      const fromDate = new Date(this.dateFrom);
      const toDate = new Date(this.dateTo);
      
      if (fromDate > toDate) {
        this.dateRangeError = 'Start date cannot be after end date';
        return false;
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

  loadSectors() {
    console.log('=== COMPONENT DEBUG: loadSectors called ===');
    
    this.sectorService.getSectors().subscribe({
      next: (res) => {
        console.log('✅ Sectors loaded successfully:', res);
        this.sectors = res.results.map((s: any) => s.sector || s.Sector);
        console.log('Mapped sectors:', this.sectors);
        
        // Default to select all sectors
        this.selectedSectors = [...this.sectors];
        console.log('Selected sectors set to:', this.selectedSectors);
        
        console.log('Calling loadEarningData from sectors success...');
        this.loadEarningData();
      },
      error: (err) => {
        console.error('❌ Error loading sectors:', err);
        
        // Fallback sectors if API fails
        this.sectors = ['Technology', 'Consumer Discretionary', 'Financials', 'Healthcare', 'Energy'];
        console.log('Using fallback sectors:', this.sectors);
        
        // Default to select all sectors
        this.selectedSectors = [...this.sectors];
        console.log('Selected sectors set to:', this.selectedSectors);
        
        console.log('Calling loadEarningData from sectors error fallback...');
        this.loadEarningData();
      }
    });
  }

  loadEarningData() {
    console.log('=== COMPONENT DEBUG: loadEarningData called ===');
    console.log('Selected period:', this.selectedPeriod);
    console.log('Selected sectors:', this.selectedSectors);
    console.log('Date from:', this.dateFrom);
    console.log('Date to:', this.dateTo);
    
    if (this.selectedPeriod === 'custom' && !this.validateDateRange()) {
      console.log('❌ Date validation failed, returning early');
      return; // Don't load data if date validation fails for custom period
    }
    
    console.log('✅ Starting API call to earnings summary service...');
    this.loading = true;
    
    this.earningSummaryService.getEarningSummary(
      this.selectedSectors,
      this.selectedPeriod,
      this.dateFrom,
      this.dateTo
    ).subscribe({
      next: res => {
        console.log('✅ API call successful, response received:', res);
        this.earnings = res.results;
        console.log('Earnings data received:', this.earnings);
        console.log('Number of earnings:', this.earnings.length);
        
        if (this.earnings.length > 0) {
          console.log('First earning entry:', this.earnings[0]);
          console.log('First earning lastTwoEarnings:', this.earnings[0].lastTwoEarnings);
        } else {
          console.log('⚠️ No earnings data in response');
        }
        
        this.loading = false;
        console.log('=== END COMPONENT DEBUG ===');
      },
      error: err => {
        console.error('❌ API call failed with error:', err);
        this.loading = false;
        console.log('=== END COMPONENT DEBUG ===');
      }
    });
  }

  onSectorFilterChange() {
    // Don't auto-trigger search, wait for user to click search button
  }

  onDateFilterChange() {
    this.dateRangeError = '';
    // Don't auto-trigger search, wait for user to click search button
  }

  clearFilters() {
    this.selectedSectors = [];
    this.selectedPeriod = '1W'; // Reset period to 1W (default)
    this.dateRangeError = '';
    this.dateFrom = '';
    this.dateTo = '';
    // Don't auto-trigger search, wait for user to click search button
  }

  sortByColumn(column: string) {
    if (this.sortBy === column) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = column;
      this.sortOrder = 'asc';
    }
    
    // Show loading indicator for the column being sorted
    this.sortingColumn = column;
    setTimeout(() => {
      this.sortingColumn = '';
    }, 500);
  }

  getSortIcon(column: string): string {
    if (this.sortBy !== column) return '';
    return this.sortOrder === 'asc' ? '▲' : '▼';
  }

  isSorting(column: string): boolean {
    return this.sortingColumn === column;
  }

  toggleSector(sector: string) {
    const index = this.selectedSectors.indexOf(sector);
    if (index > -1) {
      this.selectedSectors.splice(index, 1);
    } else {
      this.selectedSectors.push(sector);
    }
    this.onSectorFilterChange();
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

  // Popup methods
  showEarningDatesPopup(earning: EarningData) {
    this.selectedTicker = earning.ticker;
    this.selectedEarningData = earning;
    this.isEarningDatesPopupVisible = true;
  }

  closeEarningDatesPopup() {
    this.isEarningDatesPopupVisible = false;
    this.selectedTicker = '';
    this.selectedEarningData = null;
  }

  showPriceChart(ticker: string, date: string) {
    this.selectedTicker = ticker;
    this.selectedChartDate = date;
    this.showPriceChartPopup = true;
    this.loadPriceChartData(ticker, date);
    
    // Close the earning dates popup if it's open
    if (this.isEarningDatesPopupVisible) {
      this.closeEarningDatesPopup();
    }
  }

  closePriceChartPopup() {
    this.showPriceChartPopup = false;
    this.selectedTicker = '';
    this.selectedChartDate = '';
    this.priceChartData = null;
  }

  private loadPriceChartData(ticker: string, date: string) {
    this.chartLoading = true;
    
    console.log('Loading price chart data for:', ticker, date, 'interval:', this.selectedInterval);
    
    // Call the service to get historical price data with selected interval
    // This single call returns both intraday and after-hours data
    this.earningSummaryService.getHistoricalPriceData(ticker, date, this.selectedInterval).subscribe({
      next: (data) => {
        if (data.error) {
          console.error('Error loading price chart data:', data.error);
          this.priceChartData = null;
          this.chartLoading = false;
        } else {
          console.log('Received price chart data:', data);
          console.log('Data type:', typeof data);
          console.log('Data keys:', Object.keys(data));
          console.log('Intraday points:', data.intradayPoints?.length || 0);
          console.log('After-hours points:', data.afterHoursPoints?.length || 0);
          
          // Set the main chart data - this already includes both intraday and after-hours data
          this.priceChartData = data;
          console.log('Set priceChartData:', this.priceChartData);
          console.log('Chart data structure:', {
            hasIntradayPoints: !!data.intradayPoints,
            intradayPointsLength: data.intradayPoints?.length || 0,
            hasAfterHoursPoints: !!data.afterHoursPoints,
            afterHoursPointsLength: data.afterHoursPoints?.length || 0,
            hasOHLC: !!(data.open && data.close && data.high && data.low),
            open: data.open,
            close: data.close,
            high: data.high,
            low: data.low
          });
          
          // Set loading to false since we have all the data
          this.chartLoading = false;
        }
      },
      error: (error) => {
        console.error('Error loading price chart data:', error);
        this.priceChartData = null;
        this.chartLoading = false;
      }
    });
  }

  getAllChartPoints(): any[] {
    if (!this.priceChartData) return [];
    
    console.log('Chart data structure:', this.priceChartData);
    console.log('Intraday points:', this.priceChartData.intradayPoints);
    console.log('After-hours points:', this.priceChartData.afterHoursPoints);
    
    let allPoints = [...(this.priceChartData.intradayPoints || [])];
    
    // Include after-hours data
    if (this.priceChartData.afterHoursPoints && this.priceChartData.afterHoursPoints.length > 0) {
      allPoints = [...allPoints, ...this.priceChartData.afterHoursPoints];
    }
    
    // Sort points by time to ensure proper order
    allPoints.sort((a, b) => {
      const timeA = a.time || '';
      const timeB = b.time || '';
      return timeA.localeCompare(timeB);
    });
    
    console.log('Total chart points:', allPoints.length);
    return allPoints;
  }

  hasChartData(): boolean {
    if (!this.priceChartData) return false;
    
    // Check if we have any chart points or at least OHLC data
    const hasIntradayData = this.priceChartData.intradayPoints && this.priceChartData.intradayPoints.length > 0;
    const hasAfterHoursData = this.priceChartData.afterHoursPoints && this.priceChartData.afterHoursPoints.length > 0;
    const hasOHLCData = this.priceChartData.open && this.priceChartData.close && this.priceChartData.high && this.priceChartData.low;
    
    return hasIntradayData || hasAfterHoursData || hasOHLCData;
  }

  getPriceChange(): number {
    if (!this.priceChartData || !this.priceChartData.open || !this.priceChartData.close) return 0;
    
    const openPrice = parseFloat(this.priceChartData.open);
    const closePrice = parseFloat(this.priceChartData.close);
    
    if (isNaN(openPrice) || isNaN(closePrice)) return 0;
    
    return closePrice - openPrice;
  }

  // New method to perform the actual search
  performSearch() {
    console.log('=== COMPONENT DEBUG: performSearch called ===');
    console.log('Selected period:', this.selectedPeriod);
    console.log('Date validation result:', this.validateDateRange());
    
    if (this.selectedPeriod === 'custom' && !this.validateDateRange()) {
      console.log('❌ Date validation failed, returning early');
      return;
    }
    
    console.log('✅ Setting hasSearched to true and calling loadEarningData');
    this.hasSearched = true;
    this.loadEarningData();
    console.log('=== END performSearch DEBUG ===');
  }

  // Method to calculate revenue surprise percentage
  getRevenueSurprise(lastEarning: any): string {
    if (!lastEarning.expectedRevenue || !lastEarning.actualRevenue) {
      return 'N/A';
    }

    try {
      // Remove any non-numeric characters and convert to numbers
      const expected = parseFloat(lastEarning.expectedRevenue.replace(/[^\d.-]/g, ''));
      const actual = parseFloat(lastEarning.actualRevenue.replace(/[^\d.-]/g, ''));
      
      if (isNaN(expected) || isNaN(actual) || expected === 0) {
        return 'N/A';
      }

      const percentageChange = ((actual - expected) / expected) * 100;
      const sign = percentageChange >= 0 ? '+' : '';
      return `${sign}${percentageChange.toFixed(2)}%`;
    } catch (error) {
      return 'N/A';
    }
  }

  // Method to refresh data from backend
  refreshData() {
    console.log('Refreshing earnings data...');
    this.loadEarningData();
  }

  // Method to format revenue values with abbreviated units (M, B, T)
  formatRevenueWithAbbreviation(revenueValue: string): string {
    if (!revenueValue || revenueValue === 'N/A') {
      return 'N/A';
    }

    try {
      // Handle already formatted values like "$1.63 billion", "$500 million", etc.
      const lowercaseValue = revenueValue.toLowerCase();
      
      if (lowercaseValue.includes('trillion')) {
        const numericValue = parseFloat(revenueValue.replace(/[^\d.-]/g, ''));
        if (!isNaN(numericValue)) {
          return `$${numericValue.toFixed(2)}T`;
        }
      } else if (lowercaseValue.includes('billion')) {
        const numericValue = parseFloat(revenueValue.replace(/[^\d.-]/g, ''));
        if (!isNaN(numericValue)) {
          return `$${numericValue.toFixed(2)}B`;
        }
      } else if (lowercaseValue.includes('million')) {
        const numericValue = parseFloat(revenueValue.replace(/[^\d.-]/g, ''));
        if (!isNaN(numericValue)) {
          return `$${numericValue.toFixed(2)}M`;
        }
      } else if (lowercaseValue.includes('thousand')) {
        const numericValue = parseFloat(revenueValue.replace(/[^\d.-]/g, ''));
        if (!isNaN(numericValue)) {
          return `$${numericValue.toFixed(2)}K`;
        }
      } else {
        // Handle numeric values without text descriptors
        const numericValue = parseFloat(revenueValue.replace(/[^\d.-]/g, ''));
        
        if (isNaN(numericValue)) {
          return revenueValue; // Return original if can't parse
        }

        if (numericValue >= 1e12) { // 1 trillion or more
          return `$${(numericValue / 1e12).toFixed(2)}T`;
        } else if (numericValue >= 1e9) { // 1 billion or more
          return `$${(numericValue / 1e9).toFixed(2)}B`;
        } else if (numericValue >= 1e6) { // 1 million or more
          return `$${(numericValue / 1e6).toFixed(2)}M`;
        } else if (numericValue >= 1e3) { // 1 thousand or more
          return `$${(numericValue / 1e3).toFixed(2)}K`;
        } else {
          return `$${numericValue.toFixed(2)}`;
        }
      }
    } catch (error) {
      return revenueValue; // Return original if error
    }
    
    return revenueValue; // Fallback return
  }
} 