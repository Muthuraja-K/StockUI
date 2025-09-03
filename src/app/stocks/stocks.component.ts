import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StockInfoService } from '../service/stock-info.service';
import { SectorService } from '../service/sector.service';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'stocks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stocks.component.html',
  styleUrls: ['./stocks.component.scss'],
})
export class StocksComponent implements OnInit {
  stocks: any[] = [];
  sectors: string[] = [];
  loading = false;
  filterTicker = '';
  filterSector = '';
  showAddStockForm = false;
  showEditStockForm = false;
  selectedStock: any = null;
  
  // Error modal properties
  showErrorModal = false;
  errorMessage = '';
  errorTitle = 'Error';
  errorDetails: string[] = [];
  
  // Validation properties
  newStockValidation: { isValid: boolean; errorMessage?: string } = { isValid: false };
  editStockValidation: { isValid: boolean; errorMessage?: string } = { isValid: false };
  
  newStock = {
    ticker: '',
    sector: '',
    isleverage: false,
    company_name: ''
  };
  
  editStock = {
    ticker: '',
    sector: '',
    isleverage: false,
    company_name: ''
  };

  constructor(
    private stockInfoService: StockInfoService,
    private sectorService: SectorService,
    private authService: AuthService
  ) {}

  // Error modal methods
  showError(title: string, message: string, details?: string[]) {
    this.errorTitle = title;
    this.errorMessage = message;
    this.errorDetails = details || [];
    this.showErrorModal = true;
    console.error(`${title}: ${message}`, details);
  }

  closeErrorModal() {
    this.showErrorModal = false;
    this.errorMessage = '';
    this.errorTitle = 'Error';
    this.errorDetails = [];
  }

  // Helper method to check if stock ticker is valid
  isStockTickerValid(ticker: string, sector: string, excludeCurrentTicker?: string): { isValid: boolean; errorMessage?: string } {
    const trimmedTicker = ticker.trim();
    const trimmedSector = sector.trim();
    
    if (!trimmedTicker) {
      return { isValid: false, errorMessage: 'Ticker is required' };
    }
    
    if (!trimmedSector) {
      return { isValid: false, errorMessage: 'Sector is required' };
    }
    
    // Check for duplicate tickers (case-insensitive)
    const isDuplicate = this.stocks.some(stock => {
      const existingTicker = stock.ticker.toLowerCase();
      const newTicker = trimmedTicker.toLowerCase();
      return existingTicker === newTicker && (!excludeCurrentTicker || existingTicker !== excludeCurrentTicker.toLowerCase());
    });
    
    if (isDuplicate) {
      return { isValid: false, errorMessage: `Stock with ticker '${trimmedTicker.toUpperCase()}' already exists` };
    }
    
    return { isValid: true };
  }

  // Real-time validation methods
  validateNewStock() {
    this.newStockValidation = this.isStockTickerValid(this.newStock.ticker, this.newStock.sector);
  }

  validateEditStock() {
    this.editStockValidation = this.isStockTickerValid(this.editStock.ticker, this.editStock.sector, this.selectedStock?.ticker);
  }

  ngOnInit() {
    this.loadSectors();
    this.loadStocks();
  }

  loadSectors() {
    this.sectorService.getSectors().subscribe({
      next: (response: any) => {
        this.sectors = response.results.map((sector: any) => sector.sector);
      },
      error: (error: any) => {
        const errorDetails = [
          `Status: ${error.status || 'Unknown'}`,
          `Status Text: ${error.statusText || 'Unknown'}`,
          `Message: ${error.error?.detail?.error || error.error?.message || error.message || 'Unknown error occurred'}`
        ];
        this.showError('Sector Loading Error', 'Failed to load sectors', errorDetails);
      }
    });
  }

  loadStocks() {
    this.loading = true;
    // Get all stocks without pagination limits (set perPage to a very high number)
    this.stockInfoService.getStocks(this.filterTicker, this.filterSector, 1, 10000).subscribe({
      next: (response: any) => {
        this.stocks = response.results || [];
        this.loading = false;
      },
      error: (error: any) => {
        const errorDetails = [
          `Status: ${error.status || 'Unknown'}`,
          `Status Text: ${error.statusText || 'Unknown'}`,
          `Message: ${error.error?.detail?.error || error.error?.message || error.message || 'Unknown error occurred'}`
        ];
        this.showError('Stock Loading Error', 'Failed to load stocks', errorDetails);
        this.loading = false;
      }
    });
  }

  searchStocks() {
    this.loadStocks();
  }

  clearFilters() {
    this.filterTicker = '';
    this.filterSector = '';
    this.loadStocks();
  }

  showAddForm() {
    console.log('showAddForm() called');
    this.showAddStockForm = true;
    this.showEditStockForm = false;
    this.resetNewStockForm();
    console.log('showAddStockForm set to:', this.showAddStockForm);
  }

  showEditForm(stock: any) {
    this.selectedStock = stock;
    this.editStock = { ...stock };
    this.editStockValidation = { isValid: true }; // Initially valid since it's the same data
    this.showEditStockForm = true;
    this.showAddStockForm = false;
  }

  hideForms() {
    this.showAddStockForm = false;
    this.showEditStockForm = false;
    this.selectedStock = null;
    this.resetNewStockForm();
    this.resetEditStockForm();
  }

  resetNewStockForm() {
    this.newStock = {
      ticker: '',
      sector: '',
      isleverage: false,
      company_name: ''
    };
    this.newStockValidation = { isValid: false };
  }

  resetEditStockForm() {
    this.editStock = {
      ticker: '',
      sector: '',
      isleverage: false,
      company_name: ''
    };
    this.editStockValidation = { isValid: false };
  }

  addStock() {
    // Use helper method for validation
    const validation = this.isStockTickerValid(this.newStock.ticker, this.newStock.sector);
    if (!validation.isValid) {
      this.showError('Validation Error', validation.errorMessage || 'Invalid stock data');
      return;
    }

    console.log('Attempting to add stock:', this.newStock);
    console.log('Current user role:', this.authService.currentUserValue?.role);
    console.log('Is admin?', this.authService.isAdmin);

    this.stockInfoService.addStock(this.newStock.ticker, this.newStock.sector, this.newStock.isleverage).subscribe({
      next: (response: any) => {
        console.log('Stock added successfully:', response);
        // Success - stock added
        this.hideForms();
        this.loadStocks();
      },
      error: (error: any) => {
        console.error('Error adding stock:', error);
        console.error('Error status:', error.status);
        console.error('Error message:', error.error);
        
        let errorMessage = 'Failed to add stock';
        let errorTitle = 'Add Stock Error';
        
        // Check if it's a duplicate error from backend
        if (error.error && error.error.detail && error.error.detail.error) {
          if ('already exists' in error.error.detail.error.toLowerCase()) {
            errorTitle = 'Duplicate Stock Error';
            errorMessage = error.error.detail.error;
          }
        }
        
        // Handle specific HTTP errors
        if (error.status === 401) {
          errorTitle = 'Authentication Error';
          errorMessage = 'Authentication failed. Please log in as admin.';
        } else if (error.status === 403) {
          errorTitle = 'Access Denied';
          errorMessage = 'Access denied. Admin privileges required.';
        }
        
        const errorDetails = [
          `Status: ${error.status || 'Unknown'}`,
          `Status Text: ${error.statusText || 'Unknown'}`,
          `Message: ${error.error?.detail?.error || error.error?.error || error.error?.message || error.message || 'Unknown error occurred'}`
        ];
        this.showError(errorTitle, errorMessage, errorDetails);
      }
    });
  }

  updateStock() {
    // Use helper method for validation
    const validation = this.isStockTickerValid(this.editStock.ticker, this.editStock.sector, this.selectedStock?.ticker);
    if (!validation.isValid) {
      this.showError('Validation Error', validation.errorMessage || 'Invalid stock data');
      return;
    }

    this.stockInfoService.updateStock(this.selectedStock.ticker, this.editStock.ticker, this.editStock.sector, this.editStock.isleverage).subscribe({
      next: (response: any) => {
        // Success - stock updated
        this.hideForms();
        this.loadStocks();
      },
      error: (error: any) => {
        console.error('Error updating stock:', error);
        
        let errorMessage = 'Failed to update stock';
        let errorTitle = 'Update Stock Error';
        
        // Check if it's a duplicate error from backend
        if (error.error && error.error.detail && error.error.detail.error) {
          if ('already exists' in error.error.detail.error.toLowerCase()) {
            errorTitle = 'Duplicate Stock Error';
            errorMessage = error.error.detail.error;
          }
        }
        
        const errorDetails = [
          `Status: ${error.status || 'Unknown'}`,
          `Status Text: ${error.statusText || 'Unknown'}`,
          `Message: ${error.error?.detail?.error || error.error?.error || error.error?.message || error.message || 'Unknown error occurred'}`
        ];
        this.showError(errorTitle, errorMessage, errorDetails);
      }
    });
  }

  deleteStock(ticker: string) {
    if (confirm(`Are you sure you want to delete stock: ${ticker}?`)) {
      this.stockInfoService.deleteStock(ticker).subscribe({
        next: (response: any) => {
          // Success - stock deleted
          this.loadStocks();
        },
        error: (error: any) => {
          console.error('Error deleting stock:', error);
          
          const errorDetails = [
            `Status: ${error.status || 'Unknown'}`,
            `Status Text: ${error.statusText || 'Unknown'}`,
            `Message: ${error.error?.detail?.error || error.error?.error || error.error?.message || error.message || 'Unknown error occurred'}`
          ];
          this.showError('Delete Stock Error', 'Failed to delete stock', errorDetails);
        }
      });
    }
  }

  getIsLeverageClass(isleverage: boolean): string {
    return isleverage ? 'isleverage-true' : 'isleverage-false';
  }

  // Debug method to show current user status
  getCurrentUserStatus(): string {
    const user = this.authService.currentUserValue;
    if (!user) {
      return 'Not logged in';
    }
    return `Logged in as: ${user.username} (${user.role})`;
  }

  // Test authentication method
  testAuth() {
    const user = this.authService.currentUserValue;
    const token = this.authService.getToken();
    
    console.log('=== AUTH TEST ===');
    console.log('Current user:', user);
    console.log('Token exists:', !!token);
    console.log('Token length:', token ? token.length : 0);
    console.log('Is authenticated:', this.authService.isAuthenticated);
    console.log('Is admin:', this.authService.isAdmin);
    console.log('==================');
    
    if (!user) {
      alert('No user logged in. Please log in first.');
      return;
    }
    
    if (user.role !== 'admin') {
      alert(`User role is '${user.role}', but admin role is required.`);
      return;
    }
    
    alert(`Authentication OK! Logged in as ${user.username} (${user.role})`);
  }
}
