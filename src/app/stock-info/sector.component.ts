import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SectorService } from './sector.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'sector',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './sector.component.html',
  styleUrls: ['./sector.component.scss'],
})
export class SectorComponent {
  sectors: { sector: string }[] = [];
  editingIndex: number | null = null;
  newSector: string = '';
  filterSector: string = '';
  loading = false;
  showAddModal = false;
  showEditModal = false;
  editingSector: string = '';
  
  // Sorting properties
  sortBy: string = 'sector';
  sortOrder: 'asc' | 'desc' = 'asc';
  sortingColumn: string | null = null;

  constructor(private sectorService: SectorService) {
    this.refreshSectors();
  }

  get filteredSectors() {
    let filtered = this.sectors;

    // Apply filters
    if (this.filterSector) {
      filtered = filtered.filter(sector => 
        sector.sector.toLowerCase().includes(this.filterSector.toLowerCase())
      );
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
    this.filterSector = '';
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
    this.newSector = '';
  }

  addSector() {
    if (!this.newSector.trim()) return;
    this.sectorService.addSector(this.newSector.trim()).subscribe(() => {
      this.refreshSectors();
      this.closeAddModal();
    });
  }

  editSector(index: number) {
    this.editingIndex = index;
    this.editingSector = this.filteredSectors[index].sector;
    this.showEditModal = true;
  }

  saveEdit() {
    if (!this.editingSector.trim()) return;
    const oldSector = this.filteredSectors[this.editingIndex!].sector;
    this.sectorService.updateSector(oldSector, this.editingSector.trim()).subscribe({
      next: () => {
        this.refreshSectors();
        this.closeEditModal();
      }
    });
  }

  closeEditModal() {
    this.showEditModal = false;
    this.editingIndex = null;
    this.editingSector = '';
  }

  cancelEdit() {
    this.closeEditModal();
  }

  deleteSector(index: number) {
    const sector = this.filteredSectors[index].sector;
    if (confirm(`Are you sure you want to delete sector "${sector}"?`)) {
      this.sectorService.deleteSector(sector).subscribe({
        next: () => {
          this.refreshSectors();
          if (this.editingIndex === index) this.closeEditModal();
        }
      });
    }
  }

  refreshSectors() {
    this.loading = true;
    // Load all sectors without pagination
    this.sectorService.getSectors('', 1, 1000).subscribe({
      next: (res: any) => {
        this.sectors = res.results.map((s: any) => ({ sector: s.sector ?? s.Sector }));
        this.loading = false;
        console.log(`Loaded ${this.sectors.length} sectors`);
      },
      error: (error) => {
        console.error('Error loading sectors:', error);
        this.loading = false;
      }
    });
  }
} 