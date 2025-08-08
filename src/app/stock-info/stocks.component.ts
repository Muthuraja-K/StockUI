import { Component, Input } from '@angular/core';
import { StockInfo } from './models';
import { StockInfoService } from './stock-info.service';
import { SectorService } from './sector.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NgSelectModule } from '@ng-select/ng-select';

@Component({
  selector: 'stocks',
  standalone: true,
  imports: [FormsModule, CommonModule, NgSelectModule],
  templateUrl: './stocks.component.html',
  styleUrls: ['./stocks.component.scss'],
})
export class StocksComponent {
  @Input() stock!: StockInfo;
  stocks: { sector: string; ticker: string; isxticker: boolean }[] = [];
  sectors: string[] = [];
  editingIndex: number | null = null;
  newStock: { sector: string; ticker: string; isxticker: boolean } = { sector: '', ticker: '', isxticker: false };
  filterSector: string = '';
  filterTicker: string = '';
  filterIsXticker: '' | boolean = '';
  loading = false;
  showAddModal = false;
  showEditModal = false;
  editingStock: { sector: string; ticker: string; isxticker: boolean } = { sector: '', ticker: '', isxticker: false };
  
  // Sorting properties
  sortBy: string = 'ticker';
  sortOrder: 'asc' | 'desc' = 'asc';
  sortingColumn: string | null = null;

  constructor(private stockInfoService: StockInfoService, private sectorService: SectorService) {
    this.refreshStocks();
    this.loadSectors();
  }

  loadSectors() {
    // Get all sectors by using a large page size
    this.sectorService.getSectors('', 1, 1000).subscribe({
      next: (res: any) => {
        console.log('Sectors loaded:', res);
        this.sectors = (res.results || res).map((s: any) => s.sector ?? s.Sector);
        console.log('Processed sectors:', this.sectors);
      },
      error: (error) => {
        console.error('Error loading sectors:', error);
        // Fallback sectors if API fails
        this.sectors = ['Technology', 'Consumer Discretionary', 'Financials', 'Healthcare', 'Energy'];
      }
    });
  }

  get filteredStocks() {
    let filtered = this.stocks;

    // Apply filters
    if (this.filterTicker) {
      filtered = filtered.filter(stock => 
        stock.ticker.toLowerCase().includes(this.filterTicker.toLowerCase())
      );
    }

    if (this.filterSector) {
      filtered = filtered.filter(stock => 
        stock.sector.toLowerCase() === this.filterSector.toLowerCase()
      );
    }

    if (this.filterIsXticker !== '') {
      filtered = filtered.filter(stock => stock.isxticker === this.filterIsXticker);
    }

    // Apply sorting
    if (this.sortBy) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any = a[this.sortBy as keyof typeof a];
        let bValue: any = b[this.sortBy as keyof typeof b];

        // Handle string comparison
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) return this.sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return this.sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }

  onFilterChange() {
    // No pagination needed, just update the filtered view
  }

  clearFilters() {
    this.filterTicker = '';
    this.filterSector = '';
    this.filterIsXticker = '';
  }

  sortByColumn(column: string) {
    if (this.sortBy === column) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = column;
      this.sortOrder = 'asc';
    }
    this.sortingColumn = column;
    console.log(`Sorting by: ${this.sortBy} ${this.sortOrder}`);
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

  closeAddModal() {
    this.showAddModal = false;
    this.newStock = { sector: '', ticker: '', isxticker: false };
  }

  addStock() {
    if (!this.newStock.sector || !this.newStock.ticker) return;
    this.stockInfoService.addStockApi(this.newStock).subscribe(() => {
      this.refreshStocks();
      this.closeAddModal();
    });
  }

  editStock(index: number) {
    console.log('Edit stock clicked for index:', index);
    this.editingIndex = index;
    this.editingStock = { ...this.filteredStocks[index] };
    this.showEditModal = true;
    console.log('Edit modal should be open, editingStock:', this.editingStock);
  }

  saveEdit() {
    console.log('saveEdit method called');
    if (!this.editingStock.sector.trim() || !this.editingStock.ticker.trim()) {
      console.log('Validation failed: sector or ticker is empty');
      return;
    }
    
    const oldTicker = this.filteredStocks[this.editingIndex!].ticker;
    console.log('Updating stock:', { oldTicker, newStock: this.editingStock });
    
    this.stockInfoService.updateStockApi(oldTicker, { ...this.editingStock }).subscribe({
      next: (response) => {
        console.log('Update successful:', response);
        this.refreshStocks();
        this.closeEditModal();
      },
      error: (error) => {
        console.error('Update failed:', error);
      }
    });
  }

  closeEditModal() {
    this.showEditModal = false;
    this.editingIndex = null;
    this.editingStock = { sector: '', ticker: '', isxticker: false };
  }

  cancelEdit() {
    this.closeEditModal();
  }

  deleteStock(index: number) {
    const stock = this.filteredStocks[index];
    if (confirm(`Are you sure you want to delete ${stock.ticker}?`)) {
      this.stockInfoService.deleteStockApi(stock.ticker).subscribe(() => {
        this.refreshStocks();
        if (this.editingIndex === index) this.closeEditModal();
      });
    }
  }

  refreshStocks() {
    this.loading = true;
    // Load all stocks without pagination
    this.stockInfoService.getStock('', '', 1, 1000).subscribe({
      next: (res: any) => {
        this.stocks = res.results.map((s: any) => ({
          sector: s.sector ?? s.Sector,
          ticker: s.ticker ?? s.Ticker,
          isxticker: s.isxticker ?? s.Isxticker
        }));
        this.loading = false;
        console.log(`Loaded ${this.stocks.length} stocks`);
      },
      error: (error) => {
        console.error('Error loading stocks:', error);
        this.loading = false;
      }
    });
  }
}