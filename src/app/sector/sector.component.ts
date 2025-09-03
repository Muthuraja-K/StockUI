import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SectorService } from '../service/sector.service';

@Component({
  selector: 'sector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sector.component.html',
  styleUrls: ['./sector.component.scss'],
})
export class SectorComponent implements OnInit {
  sectors: any[] = [];
  loading = false;
  filterSector = '';
  showAddSectorForm = false;
  showEditSectorForm = false;
  selectedSector: any = null;
  
  // Error modal properties
  showErrorModal = false;
  errorMessage = '';
  errorTitle = 'Error';
  errorDetails: string[] = [];
  
  // Validation properties
  newSectorValidation: { isValid: boolean; errorMessage?: string } = { isValid: false };
  editSectorValidation: { isValid: boolean; errorMessage?: string } = { isValid: false };
  
  newSector = {
    sector: ''
  };
  
  editSector = {
    sector: ''
  };

  constructor(private sectorService: SectorService) {}

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

  // Helper method to check if sector name is valid
  isSectorNameValid(sectorName: string, excludeCurrentSector?: string): { isValid: boolean; errorMessage?: string } {
    const trimmedName = sectorName.trim();
    
    if (!trimmedName) {
      return { isValid: false, errorMessage: 'Sector name is required' };
    }
    
    // Check for duplicates (case-insensitive)
    const isDuplicate = this.sectors.some(sector => {
      const existingName = sector.sector.toLowerCase();
      const newName = trimmedName.toLowerCase();
      return existingName === newName && (!excludeCurrentSector || existingName !== excludeCurrentSector.toLowerCase());
    });
    
    if (isDuplicate) {
      return { isValid: false, errorMessage: `Sector '${trimmedName}' already exists` };
    }
    
    return { isValid: true };
  }

  // Real-time validation methods
  validateNewSector() {
    this.newSectorValidation = this.isSectorNameValid(this.newSector.sector);
  }

  validateEditSector() {
    this.editSectorValidation = this.isSectorNameValid(this.editSector.sector, this.selectedSector?.sector);
  }

  ngOnInit() {
    this.loadSectors();
  }

  loadSectors() {
    this.loading = true;
    // Get all sectors without pagination limits
    this.sectorService.getSectors(this.filterSector).subscribe({
      next: (response: any) => {
        this.sectors = response.results || [];
        this.loading = false;
      },
      error: (error: any) => {
        const errorDetails = [
          `Status: ${error.status || 'Unknown'}`,
          `Status Text: ${error.statusText || 'Unknown'}`,
          `Message: ${error.message || 'Unknown error occurred'}`
        ];
        this.showError('Sector Loading Error', 'Failed to load sectors', errorDetails);
        this.loading = false;
      }
    });
  }

  searchSectors() {
    this.loadSectors();
  }

  clearFilter() {
    this.filterSector = '';
    this.loadSectors();
  }

  showAddForm() {
    this.showAddSectorForm = true;
    this.showEditSectorForm = false;
    this.resetNewSectorForm();
  }

  showEditForm(sector: any) {
    this.selectedSector = sector;
    this.editSector = { ...sector };
    this.editSectorValidation = { isValid: true }; // Initially valid since it's the same name
    this.showEditSectorForm = true;
    this.showAddSectorForm = false;
  }

  hideForms() {
    this.showAddSectorForm = false;
    this.showEditSectorForm = false;
    this.selectedSector = null;
    this.resetNewSectorForm();
    this.resetEditSectorForm();
  }

  resetNewSectorForm() {
    this.newSector = {
      sector: ''
    };
    this.newSectorValidation = { isValid: false };
  }

  resetEditSectorForm() {
    this.editSector = {
      sector: ''
    };
    this.editSectorValidation = { isValid: false };
  }

  addSector() {
    // Use helper method for validation
    const validation = this.isSectorNameValid(this.newSector.sector);
    if (!validation.isValid) {
      this.showError('Validation Error', validation.errorMessage || 'Invalid sector name');
      return;
    }

    this.sectorService.addSector(this.newSector).subscribe({
      next: (response: any) => {
        // Check if the response indicates success or duplicate
        if (response && response.success === false) {
          // Backend returned an error (likely duplicate)
          this.showError('Duplicate Sector Error', response.message || 'Sector already exists');
        } else {
          // Success - sector added
          this.hideForms();
          this.loadSectors();
        }
      },
      error: (error: any) => {
        // Handle HTTP errors
        let errorMessage = 'Failed to add sector';
        let errorTitle = 'Add Sector Error';
        
        // Check if it's a duplicate error from backend
        if (error.error && error.error.message) {
          if ('already exists' in error.error.message.toLowerCase()) {
            errorTitle = 'Duplicate Sector Error';
            errorMessage = error.error.message;
          }
        }
        
        const errorDetails = [
          `Status: ${error.status || 'Unknown'}`,
          `Status Text: ${error.statusText || 'Unknown'}`,
          `Message: ${error.error?.message || error.message || 'Unknown error occurred'}`
        ];
        this.showError(errorTitle, errorMessage, errorDetails);
      }
    });
  }

  updateSector() {
    // Use helper method for validation (exclude current sector from duplicate check)
    const validation = this.isSectorNameValid(this.editSector.sector, this.selectedSector.sector);
    if (!validation.isValid) {
      this.showError('Validation Error', validation.errorMessage || 'Invalid sector name');
      return;
    }

    this.sectorService.updateSector(this.selectedSector.sector, this.editSector).subscribe({
      next: (response: any) => {
        // Check if the response indicates success or duplicate
        if (response && response.success === false) {
          // Backend returned an error (likely duplicate)
          this.showError('Duplicate Sector Error', response.message || 'Sector already exists');
        } else {
          // Success - sector updated
          this.hideForms();
          this.loadSectors();
        }
      },
      error: (error: any) => {
        // Handle HTTP errors
        let errorMessage = 'Failed to update sector';
        let errorTitle = 'Update Sector Error';
        
        // Check if it's a duplicate error from backend
        if (error.error && error.error.message) {
          if ('already exists' in error.error.message.toLowerCase()) {
            errorTitle = 'Duplicate Sector Error';
            errorMessage = error.error.message;
          }
        }
        
        const errorDetails = [
          `Status: ${error.status || 'Unknown'}`,
          `Status Text: ${error.statusText || 'Unknown'}`,
          `Message: ${error.error?.message || error.message || 'Unknown error occurred'}`
        ];
        this.showError(errorTitle, errorMessage, errorDetails);
      }
    });
  }

  deleteSector(sectorName: string) {
    // For now, we'll keep the confirm dialog but improve the error handling
    if (confirm(`Are you sure you want to delete sector: ${sectorName}?`)) {
      this.sectorService.deleteSector(sectorName).subscribe({
        next: (response: any) => {
          // Show success message (you could add a success modal here)
          this.loadSectors();
        },
        error: (error: any) => {
          const errorDetails = [
            `Status: ${error.status || 'Unknown'}`,
            `Status Text: ${error.statusText || 'Unknown'}`,
            `Message: ${error.message || 'Unknown error occurred'}`
          ];
          this.showError('Delete Sector Error', 'Failed to delete sector', errorDetails);
        }
      });
    }
  }
}
