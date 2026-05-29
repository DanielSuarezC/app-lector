import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'pos', pathMatch: 'full' },
  {
    path: 'pos',
    loadComponent: () => import('./pos/pos.component').then((m) => m.PosComponent),
  },
  {
    path: 'inventory',
    loadComponent: () => import('./inventory/inventory.component').then((m) => m.InventoryComponent),
  },
  {
    path: 'reports',
    loadComponent: () => import('./reports/reports.component').then((m) => m.ReportsComponent),
  },
  {
    path: 'monitor',
    loadComponent: () => import('./monitor/monitor.component').then((m) => m.MonitorComponent),
  },
  {
    path: 'settings',
    loadComponent: () => import('./settings/settings.component').then((m) => m.SettingsComponent),
  },
  { path: '**', redirectTo: 'pos' },
];
