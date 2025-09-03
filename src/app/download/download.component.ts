import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DownloadService } from './download.service';
import { AuthService } from '../auth/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'download',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './download.component.html',
  styleUrls: ['./download.component.scss'],
})
export class DownloadComponent implements OnInit, OnDestroy {
  downloadOptions = [
    { value: 'users', label: 'Users Data', description: 'Download complete user information including passwords (superuser only)' },
    { value: 'stocks', label: 'Stocks Data', description: 'Download stock information and configurations' },
    { value: 'sectors', label: 'Sectors Data', description: 'Download sector information and configurations' },
    { value: 'earningsummary', label: 'Earnings Summary', description: 'Download earnings summary data and analysis' },
    { value: 'dashboard', label: 'Dashboard Data', description: 'Download user watchlists and email recipients' },
    { value: 'earnings_notification_history', label: 'Earnings Notification History', description: 'Download earnings notification tracking and history' }
  ];

  selectedOption = '';
  downloading = false;
  downloadProgress = 0;
  isSuperuser = false;
  accessDenied = false;
  private authSubscription: Subscription | undefined;

  constructor(
    private downloadService: DownloadService,
    public authService: AuthService
  ) {}

  ngOnInit() {
    // Refresh user data to ensure we have the latest information
    this.authService.refreshUserData();
    
    // Subscribe to user changes
    this.authSubscription = this.authService.currentUser.subscribe(user => {
      this.checkSuperuserAccess();
    });
    
    // Check superuser access after a short delay to allow auth service to update
    setTimeout(() => {
      this.checkSuperuserAccess();
    }, 100);
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  private checkSuperuserAccess() {
    const currentUser = this.authService.currentUserValue;
    this.isSuperuser = currentUser?.username === 'superuser';
    this.accessDenied = !this.isSuperuser;
  }

  selectOption(option: string) {
    this.selectedOption = option;
  }

  downloadData() {
    if (!this.selectedOption) {
      alert('Please select a data type to download');
      return;
    }

    if (!this.isSuperuser) {
      alert('Access denied. Only superuser can download data.');
      return;
    }

    this.downloading = true;
    this.downloadProgress = 0;

    // Simulate download progress
    const progressInterval = setInterval(() => {
      this.downloadProgress += 10;
      if (this.downloadProgress >= 100) {
        clearInterval(progressInterval);
        this.downloading = false;
        this.downloadProgress = 0;
        this.selectedOption = '';
      }
    }, 200);

    this.downloadService.downloadFile(this.selectedOption).subscribe({
      next: (response) => {
        // Create and download file
        this.createAndDownloadFile(response, this.selectedOption);
        clearInterval(progressInterval);
        this.downloading = false;
        this.downloadProgress = 0;
        this.selectedOption = '';
      },
      error: (error) => {
        console.error('Error downloading data:', error);
        
        if (error.status === 403) {
          alert('Access denied. Only superuser can download data. Please contact your administrator.');
        } else {
          alert('Error downloading data. Please try again.');
        }
        
        clearInterval(progressInterval);
        this.downloading = false;
        this.downloadProgress = 0;
      }
    });
  }

  private createAndDownloadFile(data: any, fileType: string) {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileType}_data_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  getOptionIcon(option: string): string {
    switch (option) {
      case 'users':
        return '👥';
      case 'stocks':
        return '📈';
      case 'sectors':
        return '🏢';
      case 'earningsummary':
        return '💰';
      case 'dashboard':
        return '📊';
      case 'earnings_notification_history':
        return '📧';
      default:
        return '📄';
    }
  }
}
