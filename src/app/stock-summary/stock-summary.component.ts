import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StockSummaryService } from './stock-summary.service';
import { SectorService } from '../stock-info/sector.service';
import { StockSummaryData, SectorGroup } from '../stock-info/models';
import { Chart, ChartConfiguration, ChartData } from 'chart.js';
import { CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, BarController } from 'chart.js';

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
  dateFrom = '';
  dateTo = '';
  dateRangeError = '';
  viewMode: 'grid' | 'chart' = 'grid';
  hasSearched = false; // Track if user has performed a search
  private chart: Chart | null = null;

  constructor(
    private stockSummaryService: StockSummaryService,
    private sectorService: SectorService
  ) {
    // Register Chart.js components
    Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, BarController);
    this.setDefaultDateRange();
  }

  ngOnInit() {
    this.loadSectors();
  }

  ngOnDestroy() {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  private setDefaultDateRange() {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    
    // Calculate last Monday (go back to previous Monday)
    let daysToLastMonday = currentDay === 0 ? 6 : currentDay - 1; // If Sunday, go back 6 days, otherwise currentDay - 1
    const lastMonday = new Date(today);
    lastMonday.setDate(today.getDate() - daysToLastMonday - 7); // Go back to previous week
    
    // Calculate last Friday (4 days after Monday)
    const lastFriday = new Date(lastMonday);
    lastFriday.setDate(lastMonday.getDate() + 4);
    
    // Format dates as YYYY-MM-DD
    this.dateFrom = this.formatDate(lastMonday);
    this.dateTo = this.formatDate(lastFriday);
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
    this.sectorService.getSectors().subscribe({
      next: (res) => {
        this.sectors = res.results.map((s: any) => s.sector || s.Sector);
        // Default to select all sectors
        this.selectedSectors = [...this.sectors];
        // Don't load data automatically - wait for search button click
      },
      error: () => {
        // Fallback sectors if API fails
        this.sectors = ['Technology', 'Consumer Discretionary', 'Financials', 'Healthcare', 'Energy'];
        // Default to select all sectors
        this.selectedSectors = [...this.sectors];
        // Don't load data automatically - wait for search button click
      }
    });
  }

  loadSummaryData() {
    if (!this.validateDateRange()) {
      return; // Don't load data if date validation fails
    }
    
    this.loading = true;
    this.stockSummaryService.getStockSummary(
      this.selectedSectors,
      this.filterIsXticker,
      this.dateFrom,
      this.dateTo
    ).subscribe({
      next: res => {
        this.sectorGroups = res.groups;
        this.loading = false;
        this.updateChart();
      },
      error: err => {
        this.loading = false;
        console.error('Error loading stock summary:', err);
      }
    });
  }

  onSectorFilterChange() {
    // Don't auto-load data when filters change
  }

  onIsXtickerFilterChange() {
    // Don't auto-load data when filters change
  }

  onDateFilterChange() {
    // Don't auto-load data when filters change
  }

  clearFilters() {
    this.selectedSectors = [];
    this.filterIsXticker = null;
    this.dateRangeError = '';
    this.setDefaultDateRange(); // Reset to default date range instead of clearing
    // Don't auto-load data when clearing filters
  }

  performSearch() {
    this.hasSearched = true;
    this.loadSummaryData();
  }

  toggleGroup(group: SectorGroup) {
    group.expanded = !group.expanded;
  }

  toggleSector(sector: string) {
    const index = this.selectedSectors.indexOf(sector);
    if (index > -1) {
      this.selectedSectors.splice(index, 1);
    } else {
      this.selectedSectors.push(sector);
    }
    // Don't auto-load data when toggling sectors
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

  toggleViewMode() {
    this.viewMode = this.viewMode === 'grid' ? 'chart' : 'grid';
    if (this.viewMode === 'chart') {
      setTimeout(() => {
        this.createChart();
      }, 100);
    }
  }

  private createChart() {
    if (!this.chartCanvas || !this.sectorGroups.length) return;

    // Destroy existing chart
    if (this.chart) {
      this.chart.destroy();
    }

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

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
            text: 'Stock Summary by Sector',
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
              label: function(context) {
                return `Average Change: ${context.parsed.y.toFixed(2)}%`;
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
    if (this.viewMode === 'chart' && this.chart) {
      this.createChart();
    }
  }
}