import { Injectable } from '@angular/core';
import { DashboardService, PriceAlert } from './dashboard.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationCache = new Set<string>(); // Track sent notifications per session
  private lastCheckTime = 0; // Track when we last checked for alerts
  private isSafari = false;
  private isIOS = false;
  
  constructor(private dashboardService: DashboardService) {
    this.detectBrowser();
    this.initializeNotifications();
  }
  
  private detectBrowser() {
    // Detect Safari and iOS
    const userAgent = navigator.userAgent;
    this.isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
    this.isIOS = /iPad|iPhone|iPod/.test(userAgent);
    
    console.log(`Browser detected: Safari=${this.isSafari}, iOS=${this.isIOS}`);
  }
  
  private async initializeNotifications() {
    if (this.isNotificationSupported()) {
      const permission = await this.requestPermission();
      if (permission) {
        console.log('Notification permission granted');
        this.startNotificationMonitoring();
      } else {
        console.log('Notification permission denied or not supported');
      }
    } else {
      console.log('Notifications not supported on this browser/platform');
    }
  }
  
  private startNotificationMonitoring() {
    // Check for price alerts every 5 minutes instead of every minute
    // This reduces unnecessary API calls and prevents spam
    setInterval(() => {
      this.checkPriceAlerts();
    }, 300000); // 5 minutes = 300,000 ms
  }
  
  private async checkPriceAlerts() {
    try {
      const response = await this.dashboardService.getPriceAlerts().toPromise();
      if (response && response.alerts) {
        this.processAlerts(response.alerts);
      }
    } catch (error) {
      console.error('Error checking price alerts:', error);
    }
  }
  
  private processAlerts(alerts: PriceAlert[]) {
    alerts.forEach(alert => {
      // Create a stable key that doesn't change with timestamps
      // Use ticker + type + current price to identify unique alerts
      const currentPrice = alert.current_price || 0;
      const notificationKey = `${alert.ticker}-${alert.type}-${Math.round(currentPrice * 100)}`;
      
      // Only send notification once per session for this specific price level
      if (!this.notificationCache.has(notificationKey)) {
        this.sendNotification(alert);
        this.notificationCache.add(notificationKey);
        console.log(`Notification sent for ${alert.ticker} ${alert.type} at $${currentPrice}`);
      } else {
        console.log(`Notification already sent for ${alert.ticker} ${alert.type} at $${currentPrice}`);
      }
    });
  }
  
  private sendNotification(alert: PriceAlert) {
    // Create engaging title based on alert type
    const title = alert.type === 'low' ? '🔻 Low Price Alert' : '🔺 High Price Alert';
    const body = alert.message;
    
    if (this.isNotificationSupported() && this.isNotificationEnabled()) {
      try {
        const notification = new Notification(title, {
          body: body,
          icon: '/assets/icons/notification-icon.png', // You can add an icon
          badge: '/assets/icons/badge-icon.png',
          tag: `alert-${alert.ticker}-${alert.type}`,
          requireInteraction: true, // Require user interaction to dismiss
          silent: false
        });
        
        // Handle notification click
        notification.onclick = () => {
          window.focus();
          notification.close();
          // You can navigate to the dashboard or specific stock
          // window.location.href = '/dashboard';
        };
      } catch (error) {
        console.error('Error creating notification:', error);
        // Fallback to in-app notification for unsupported browsers
        this.showInAppNotification(title, body);
      }
    } else {
      // Fallback for unsupported browsers
      this.showInAppNotification(title, body);
    }
  }
  
  // Fallback in-app notification for unsupported browsers
  private showInAppNotification(title: string, body: string) {
    // Create a temporary notification element
    const notificationElement = document.createElement('div');
    notificationElement.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 15px 20px;
      border-radius: 5px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      z-index: 10000;
      max-width: 300px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      animation: slideIn 0.3s ease-out;
    `;
    
    notificationElement.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 5px;">${title}</div>
      <div>${body}</div>
      <button onclick="this.parentElement.remove()" style="
        position: absolute;
        top: 5px;
        right: 5px;
        background: none;
        border: none;
        color: white;
        font-size: 16px;
        cursor: pointer;
      ">×</button>
    `;
    
    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notificationElement);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notificationElement.parentElement) {
        notificationElement.remove();
      }
    }, 5000);
  }
  
  // Public method to manually send notification (for testing)
  public sendTestNotification(title: string, body: string) {
    if (this.isNotificationSupported() && this.isNotificationEnabled()) {
      try {
        new Notification(title, { 
          body,
          requireInteraction: true // Require user interaction to dismiss
        });
      } catch (error) {
        console.error('Error sending test notification:', error);
        this.showInAppNotification(title, body);
      }
    } else {
      this.showInAppNotification(title, body);
    }
  }
  
  // Clear notification cache (useful for testing)
  public clearNotificationCache() {
    this.notificationCache.clear();
    console.log('Notification cache cleared');
  }
  
  // Check if notifications are supported and enabled
  public isNotificationSupported(): boolean {
    // Safari on iOS doesn't support notifications
    if (this.isSafari && this.isIOS) {
      return false;
    }
    return 'Notification' in window;
  }
  
  public isNotificationEnabled(): boolean {
    if (!this.isNotificationSupported()) {
      return false;
    }
    return Notification.permission === 'granted';
  }
  
  // Get browser-specific notification status
  public getNotificationStatus(): string {
    if (this.isSafari && this.isIOS) {
      return 'Safari on iOS does not support browser notifications. Use in-app notifications instead.';
    }
    
    if (!this.isNotificationSupported()) {
      return 'Browser notifications are not supported on this platform.';
    }
    
    switch (Notification.permission) {
      case 'granted':
        return 'Browser notifications are enabled.';
      case 'denied':
        return 'Browser notifications are blocked. Please enable them in your browser settings.';
      case 'default':
        return 'Browser notification permission not yet requested.';
      default:
        return 'Unknown notification status.';
    }
  }
  
  // Request notification permission
  public async requestPermission(): Promise<boolean> {
    if (this.isSafari && this.isIOS) {
      console.log('Safari on iOS does not support browser notifications');
      return false;
    }
    
    if (this.isNotificationSupported()) {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          this.startNotificationMonitoring();
          return true;
        }
        return false;
      } catch (error) {
        console.error('Error requesting notification permission:', error);
        return false;
      }
    }
    return false;
  }
  
  // Get browser info for debugging
  public getBrowserInfo(): any {
    return {
      userAgent: navigator.userAgent,
      isSafari: this.isSafari,
      isIOS: this.isIOS,
      notificationSupported: this.isNotificationSupported(),
      notificationEnabled: this.isNotificationEnabled(),
      permission: 'Notification' in window ? Notification.permission : 'not-supported'
    };
  }
}
