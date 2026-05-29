import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';

import { ScannerService } from './services/scanner.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    MatToolbarModule, MatButtonModule, MatIconModule,
    MatSidenavModule, MatListModule, MatTooltipModule, MatDividerModule,
  ],
  template: `
    <mat-toolbar color="primary">
      <button mat-icon-button (click)="sidenav.toggle()">
        <mat-icon>menu</mat-icon>
      </button>
      <span style="margin-left:8px">Impresiones Colina Real</span>
      <span class="spacer"></span>

      <!-- Indicador de estado del lector -->
      <div style="display:flex; align-items:center; gap:6px; margin-right:16px; font-size:0.82rem; opacity:0.95"
           [matTooltip]="scanner.bridgeOnline
             ? 'Lector de código de barras activo'
             : (scanner.connected$.value
               ? 'Bridge conectado — sin actividad reciente del lector'
               : 'Bridge desconectado del backend')">
        <mat-icon style="font-size:18px; width:18px; height:18px"
          [style.color]="scanner.bridgeOnline ? '#69f0ae' : (scanner.connected$.value ? '#fff176' : '#ff8a80')">
          {{ scanner.bridgeOnline ? 'qr_code_scanner' : (scanner.connected$.value ? 'sensors_off' : 'link_off') }}
        </mat-icon>
        <span [style.color]="scanner.bridgeOnline ? '#69f0ae' : (scanner.connected$.value ? '#fff176' : '#ff8a80')">
          {{ scanner.bridgeOnline ? 'Lector activo' : (scanner.connected$.value ? 'Sin señal' : 'Desconectado') }}
        </span>
      </div>

      <span style="font-size:0.85rem; opacity:0.8">Sistema IoT Inventario & POS</span>
    </mat-toolbar>

    <mat-sidenav-container style="height: calc(100vh - 64px)">
      <mat-sidenav #sidenav mode="side" [opened]="true" style="width:220px">
        <mat-nav-list>
          <a mat-list-item routerLink="/pos" routerLinkActive="active-link">
            <mat-icon matListItemIcon>point_of_sale</mat-icon>
            <span matListItemTitle>Punto de Venta</span>
          </a>
          <a mat-list-item routerLink="/inventory" routerLinkActive="active-link">
            <mat-icon matListItemIcon>inventory_2</mat-icon>
            <span matListItemTitle>Inventario</span>
          </a>
          <a mat-list-item routerLink="/reports" routerLinkActive="active-link">
            <mat-icon matListItemIcon>bar_chart</mat-icon>
            <span matListItemTitle>Reportes</span>
          </a>
          <a mat-list-item routerLink="/monitor" routerLinkActive="active-link">
            <mat-icon matListItemIcon>developer_board</mat-icon>
            <span matListItemTitle>Nodo Arduino</span>
          </a>
          <mat-divider style="margin:8px 0"></mat-divider>
          <a mat-list-item routerLink="/settings" routerLinkActive="active-link">
            <mat-icon matListItemIcon>settings</mat-icon>
            <span matListItemTitle>Configuración</span>
          </a>
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content style="padding: 0">
        <router-outlet />
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .spacer { flex: 1 1 auto; }
    mat-sidenav { border-right: 1px solid #e0e0e0; }
    .active-link { background: rgba(63, 81, 181, 0.12); color: #3f51b5; }
    mat-nav-list a { margin: 4px 8px; border-radius: 4px; }
  `],
})
export class AppComponent {
  readonly scanner = inject(ScannerService);
}
