import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { ApiService } from '../services/api.service';
import { Sale, DailySummary } from '../models/product.model';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule, FormsModule, CurrencyPipe, DatePipe,
    MatCardModule, MatButtonModule, MatIconModule, MatInputModule,
    MatFormFieldModule, MatTableModule, MatSnackBarModule, MatProgressSpinnerModule,
  ],
  template: `
    <div class="page-container">
      <h2 style="margin-bottom:16px">
        <mat-icon style="vertical-align:middle;margin-right:8px">bar_chart</mat-icon>
        Reportes de Ventas
      </h2>

      <!-- Resumen del día -->
      @if (dailySummary) {
        <div class="card-grid" style="margin-bottom:24px">
          <mat-card class="stat-card">
            <mat-card-content style="padding-top:16px">
              <mat-card-title>{{ dailySummary.total | currency:'COP':'symbol':'1.0-0' }}</mat-card-title>
              <mat-card-subtitle>Ventas del día ({{ dailySummary.date }})</mat-card-subtitle>
            </mat-card-content>
          </mat-card>
          <mat-card class="stat-card">
            <mat-card-content style="padding-top:16px">
              <mat-card-title>{{ dailySummary.count }}</mat-card-title>
              <mat-card-subtitle>Transacciones hoy</mat-card-subtitle>
            </mat-card-content>
          </mat-card>
          <mat-card class="stat-card">
            <mat-card-content style="padding-top:16px">
              <mat-card-title>
                {{ dailySummary.count > 0 ? (dailySummary.total / dailySummary.count | currency:'COP':'symbol':'1.0-0') : '-' }}
              </mat-card-title>
              <mat-card-subtitle>Ticket promedio</mat-card-subtitle>
            </mat-card-content>
          </mat-card>
        </div>
      }

      <!-- Filtros -->
      <mat-card>
        <mat-card-header>
          <mat-card-title>Historial de Ventas</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div style="display:flex; gap:16px; align-items:flex-end; margin-bottom:16px">
            <mat-form-field appearance="outline">
              <mat-label>Desde</mat-label>
              <input matInput type="date" [(ngModel)]="fromDate">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Hasta</mat-label>
              <input matInput type="date" [(ngModel)]="toDate">
            </mat-form-field>
            <button mat-raised-button color="primary" (click)="loadSales()">
              <mat-icon>search</mat-icon> Buscar
            </button>
            <button mat-stroked-button (click)="exportCsv()">
              <mat-icon>download</mat-icon> Exportar CSV
            </button>
          </div>

          @if (loading) {
            <div style="text-align:center;padding:32px">
              <mat-spinner diameter="40" style="margin:auto"></mat-spinner>
            </div>
          } @else {
            <table mat-table [dataSource]="sales" style="width:100%">
              <ng-container matColumnDef="date">
                <th mat-header-cell *matHeaderCellDef>Fecha</th>
                <td mat-cell *matCellDef="let s">{{ s.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
              </ng-container>
              <ng-container matColumnDef="transaction">
                <th mat-header-cell *matHeaderCellDef>Transacción</th>
                <td mat-cell *matCellDef="let s">{{ s.transactionNumber }}</td>
              </ng-container>
              <ng-container matColumnDef="items">
                <th mat-header-cell *matHeaderCellDef>Productos</th>
                <td mat-cell *matCellDef="let s">{{ s.items.length }}</td>
              </ng-container>
              <ng-container matColumnDef="total">
                <th mat-header-cell *matHeaderCellDef>Total</th>
                <td mat-cell *matCellDef="let s">{{ s.total | currency:'COP':'symbol':'1.0-0' }}</td>
              </ng-container>
              <ng-container matColumnDef="payment">
                <th mat-header-cell *matHeaderCellDef>Pago</th>
                <td mat-cell *matCellDef="let s">{{ s.paymentMethod }}</td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
            <p style="text-align:right;padding:8px;color:#666">
              Total del período: <strong>{{ periodTotal | currency:'COP':'symbol':'1.0-0' }}</strong>
            </p>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class ReportsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly snack = inject(MatSnackBar);

  sales: Sale[] = [];
  dailySummary: DailySummary | null = null;
  loading = false;
  fromDate = '';
  toDate = '';
  displayedColumns = ['date', 'transaction', 'items', 'total', 'payment'];

  get periodTotal(): number {
    return this.sales.reduce((sum, s) => sum + Number(s.total), 0);
  }

  ngOnInit() {
    this.loadSales();
    this.api.getDailySummary().subscribe({ next: (s) => { this.dailySummary = s; } });
  }

  loadSales() {
    this.loading = true;
    this.api.getSales(this.fromDate || undefined, this.toDate || undefined).subscribe({
      next: (sales) => { this.sales = sales; this.loading = false; },
      error: () => { this.snack.open('Error al cargar ventas', 'Cerrar', { duration: 3000 }); this.loading = false; },
    });
  }

  exportCsv() {
    if (this.sales.length === 0) { return; }
    const header = 'Fecha,Transaccion,Productos,Total,Pago';
    const rows = this.sales.map((s) =>
      `"${s.createdAt}","${s.transactionNumber}",${s.items.length},${s.total},"${s.paymentMethod}"`,
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ventas-colina-real-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
