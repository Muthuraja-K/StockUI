import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EarningSummaryService } from './earning-summary.service';
import { SectorService } from '../stock-info/sector.service';
import { EarningData } from '../stock-info/models';

@Component({
  selector: 'earning-summary',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './earning-summary.component.html',
  styleUrls: ['./earning-summary.component.scss'],
})
export class EarningSummaryComponent {
  earnings: EarningData[] = [];
  sectors: string[] = [];
  selectedSectors: string[] = [];
  loading = false;
  dateFrom = '';
  dateTo = '';
  dateRangeError = '';
  
  // Pagination
  currentPage = 1;
  pageSize = 10;
  total = 0;
  pageCount = 1;

  constructor(
    private earningSummaryService: EarningSummaryService,
    private sectorService: SectorService
  ) {
    this.setDefaultDateRange();
    this.loadSectors();
    // loadEarningData() will be called after sectors are loaded
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
    this.sectorService.getSectors().subscribe({
      next: (res) => {
        this.sectors = res.results.map((s: any) => s.sector || s.Sector);
        // Default to select all sectors
        this.selectedSectors = [...this.sectors];
        this.loadEarningData();
      },
      error: () => {
        // Fallback sectors if API fails
        this.sectors = ['Technology', 'Consumer Discretionary', 'Financials', 'Healthcare', 'Energy'];
        // Default to select all sectors
        this.selectedSectors = [...this.sectors];
        this.loadEarningData();
      }
    });
  }

  loadEarningData() {
    if (!this.validateDateRange()) {
      return; // Don't load data if date validation fails
    }
    
    this.loading = true;
    this.earningSummaryService.getEarningSummary(
      this.selectedSectors,
      this.dateFrom,
      this.dateTo,
      this.currentPage,
      this.pageSize
    ).subscribe({
      next: res => {
        this.earnings = res.results;
        this.currentPage = res.page;
        this.pageSize = res.per_page;
        this.total = res.total;
        this.pageCount = Math.ceil(this.total / this.pageSize) || 1;
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        console.error('Error loading earning summary:', err);
      }
    });
  }

  onSectorFilterChange() {
    this.goToPage(1);
  }

  onDateFilterChange() {
    this.goToPage(1);
  }

  clearFilters() {
    this.selectedSectors = [];
    this.dateRangeError = '';
    this.setDefaultDateRange(); // Reset to current week (Monday to Friday)
    this.goToPage(1);
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

  goToPage(page: number) {
    if (page < 1 || page > this.pageCount) return;
    this.currentPage = page;
    this.loadEarningData();
  }



  getVisiblePages(): number[] {
    const total = this.pageCount;
    const current = this.currentPage;
    const maxPages = 5;
    let start = Math.max(1, current - Math.floor(maxPages / 2));
    let end = start + maxPages - 1;
    if (end > total) {
      end = total;
      start = Math.max(1, end - maxPages + 1);
    }
    const pages = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
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
} 