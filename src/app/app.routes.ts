import { Routes } from '@angular/router';
import { StockHistoryComponent } from './stockhistory/stock-history.component';
import { StocksComponent } from './stocks/stocks.component';
import { SectorComponent } from './sector/sector.component';
import { UserComponent } from './user/user.component';
import { StockSummaryComponent } from './stocksummary/stock-summary.component';
import { EarningSummaryComponent } from './earningsummary/earning-summary.component';
import { StockPredictionComponent } from './stock-prediction/stock-prediction.component';
import { LoginComponent } from './auth/login/login.component';
import { DownloadComponent } from './download/download.component';
import { AdminCacheComponent } from './admin-cache/admin-cache.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AuthGuard } from './auth/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  
  // Admin-only routes
  { 
    path: 'stocks', 
    component: StocksComponent, 
    canActivate: [AuthGuard],
    data: { requiresAdmin: true }
  },
  { 
    path: 'stocks-sector', 
    component: SectorComponent, 
    canActivate: [AuthGuard],
    data: { requiresAdmin: true }
  },
  { 
    path: 'users', 
    component: UserComponent, 
    canActivate: [AuthGuard],
    data: { requiresAdmin: true }
  },
  { 
    path: 'admin-cache', 
    component: AdminCacheComponent, 
    canActivate: [AuthGuard],
    data: { requiresAdmin: true }
  },
  
  // User-accessible routes
  { 
    path: 'dashboard', 
    component: DashboardComponent, 
    canActivate: [AuthGuard]
  },
  { 
    path: 'stock-history', 
    component: StockHistoryComponent, 
    canActivate: [AuthGuard]
  },
  { 
    path: 'stock-summary', 
    component: StockSummaryComponent, 
    canActivate: [AuthGuard]
  },
  { 
    path: 'earning-summary', 
    component: EarningSummaryComponent, 
    canActivate: [AuthGuard]
  },
  { 
    path: 'stock-prediction', 
    component: StockPredictionComponent, 
    canActivate: [AuthGuard]
  },
  { 
    path: 'download', 
    component: DownloadComponent, 
    canActivate: [AuthGuard],
    data: { requiresSuperuser: true }
  },
  
  // Redirect to login for any unknown routes
  { path: '**', redirectTo: 'login' }
];
