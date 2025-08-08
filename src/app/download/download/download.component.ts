import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DownloadService } from '../download.service';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-download',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './download.component.html',
  styleUrls: ['./download.component.scss']
})
export class DownloadComponent {
  selectedFileType: 'users' | 'stocks' | 'sectors' = 'stocks';
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private downloadService: DownloadService,
    private authService: AuthService
  ) {}

  get isAdmin(): boolean {
    return this.authService.isAdmin;
  }

  get availableFileTypes(): Array<{value: string, label: string, adminOnly: boolean}> {
    return [
      { value: 'users', label: 'Users', adminOnly: true },
      { value: 'stocks', label: 'Stocks', adminOnly: false },
      { value: 'sectors', label: 'Sectors', adminOnly: false }
    ];
  }

  onFileTypeChange(): void {
    // Reset messages when selection changes
    this.errorMessage = '';
    this.successMessage = '';
  }

  downloadFile(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.downloadService.downloadFile(this.selectedFileType).subscribe({
      next: (data) => {
        this.isLoading = false;
        const filename = `${this.selectedFileType}_data`;
        this.downloadService.downloadAsJson(data, filename);
        this.successMessage = `${this.selectedFileType.charAt(0).toUpperCase() + this.selectedFileType.slice(1)} data downloaded successfully!`;
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Download error:', error);
        this.errorMessage = error.error?.error || 'Failed to download file. Please try again.';
      }
    });
  }

  getFileTypeLabel(type: string): string {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }
} 