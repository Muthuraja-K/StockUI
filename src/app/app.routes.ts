import { Routes } from '@angular/router';
import { StockDetailsComponent } from './stock-info/stock-details.component';
import { StocksComponent } from './stock-info/stocks.component';
import { SectorComponent } from './stock-info/sector.component';
import { UserComponent } from './user/user.component';
import { StockSummaryComponent } from './stock-summary/stock-summary.component';
import { EarningSummaryComponent } from './earning-summary/earning-summary.component';
import { LoginComponent } from './auth/login/login.component';
import { DownloadComponent } from './download/download/download.component';
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
  
  // User-accessible routes
  { 
    path: 'stock-details', 
    component: StockDetailsComponent, 
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
    path: 'download', 
    component: DownloadComponent, 
    canActivate: [AuthGuard]
  },
  
  // Redirect to login for any unknown routes
  { path: '**', redirectTo: 'login' }
];
