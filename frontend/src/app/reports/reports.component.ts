import {
  Component, OnInit, OnDestroy, inject, signal, computed, ElementRef, ViewChild, AfterViewInit,
} from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MatNativeDateModule, DateAdapter, NativeDateAdapter,
  MAT_DATE_FORMATS, MatDateFormats,
} from '@angular/material/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Chart, registerables } from 'chart.js';
import { utils as xlsxUtils, writeFile as xlsxWrite } from 'xlsx';

import { ApiService } from '../services/api.service';
import { Sale, DailySummary, SalesSummary } from '../models/product.model';

Chart.register(...registerables);

class ColombiaDateAdapter extends NativeDateAdapter {
  override parse(value: any): Date | null {
    if (typeof value === 'string') {
      const parts = value.trim().split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          const d = new Date(year, month, day);
          if (!isNaN(d.getTime())) return d;
        }
      }
    }
    return super.parse(value);
  }

  override format(date: Date, _displayFormat: object): string {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${d}/${m}/${date.getFullYear()}`;
  }
}

const COL_DATE_FORMATS: MatDateFormats = {
  parse: { dateInput: { day: 'numeric', month: 'numeric', year: 'numeric' } },
  display: {
    dateInput: { day: 'numeric', month: 'numeric', year: 'numeric' },
    monthYearLabel: { year: 'numeric', month: 'short' },
    dateA11yLabel: { year: 'numeric', month: 'long', day: 'numeric' },
    monthYearA11yLabel: { year: 'numeric', month: 'long' },
  },
};

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, CurrencyPipe, DatePipe, DecimalPipe,
    MatCardModule, MatButtonModule, MatIconModule, MatInputModule,
    MatFormFieldModule, MatTableModule, MatSnackBarModule, MatProgressSpinnerModule,
    MatPaginatorModule, MatDatepickerModule, MatNativeDateModule,
    MatExpansionModule, MatDividerModule, MatChipsModule, MatTooltipModule,
  ],
  providers: [
    { provide: DateAdapter, useClass: ColombiaDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: COL_DATE_FORMATS },
  ],
  template: `
    <div class="page-container">
      <h2 style="margin-bottom:16px">
        <mat-icon style="vertical-align:middle;margin-right:8px">bar_chart</mat-icon>
        Reportes de Ventas
      </h2>

      <!-- Resumen del día -->
      @if (dailySummary()) {
        <div class="card-grid" style="margin-bottom:24px">
          <mat-card class="stat-card">
            <mat-card-content style="padding-top:16px">
              <mat-card-title>{{ dailySummary()!.total | currency:'COP':'symbol':'1.0-0' }}</mat-card-title>
              <mat-card-subtitle>Ventas hoy ({{ formatIsoDate(dailySummary()!.date) }})</mat-card-subtitle>
            </mat-card-content>
          </mat-card>
          <mat-card class="stat-card">
            <mat-card-content style="padding-top:16px">
              <mat-card-title>{{ dailySummary()!.count }}</mat-card-title>
              <mat-card-subtitle>Transacciones hoy</mat-card-subtitle>
            </mat-card-content>
          </mat-card>
          <mat-card class="stat-card">
            <mat-card-content style="padding-top:16px">
              <mat-card-title>
                {{ dailySummary()!.count > 0
                   ? (dailySummary()!.total / dailySummary()!.count | currency:'COP':'symbol':'1.0-0')
                   : '—' }}
              </mat-card-title>
              <mat-card-subtitle>Ticket promedio hoy</mat-card-subtitle>
            </mat-card-content>
          </mat-card>
        </div>
      }

      <!-- Filtros con Date Range Picker -->
      <mat-card style="margin-bottom:16px">
        <mat-card-header><mat-card-title>Filtros</mat-card-title></mat-card-header>
        <mat-card-content>
          <div style="display:flex; gap:16px; align-items:flex-end; flex-wrap:wrap; padding-top:8px">
            <mat-form-field appearance="outline" style="min-width:300px">
              <mat-label>Período (dd/mm/aaaa)</mat-label>
              <mat-date-range-input [rangePicker]="rangePicker" [formGroup]="rangeForm">
                <input matStartDate formControlName="start" placeholder="Inicio">
                <input matEndDate formControlName="end" placeholder="Fin">
              </mat-date-range-input>
              <mat-datepicker-toggle matIconSuffix [for]="rangePicker"></mat-datepicker-toggle>
              <mat-date-range-picker #rangePicker></mat-date-range-picker>
            </mat-form-field>
            <button mat-raised-button color="primary" (click)="loadAll()" [disabled]="loading()">
              <mat-icon>search</mat-icon> Buscar
            </button>
            <button mat-stroked-button (click)="setToday()">Hoy</button>
            <button mat-stroked-button (click)="setLastWeek()">Última semana</button>
            <button mat-stroked-button (click)="setThisMonth()">Este mes</button>
            <span style="flex:1"></span>
            <button mat-stroked-button (click)="exportXlsx()" [disabled]="sales().length === 0">
              <mat-icon>table_view</mat-icon> XLSX
            </button>
            <button mat-raised-button color="accent" (click)="exportPdf()" [disabled]="sales().length === 0">
              <mat-icon>picture_as_pdf</mat-icon> PDF
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Resumen período -->
      @if (summary()) {
        <p style="color:#666; font-size:0.9rem; margin:0 0 12px 4px">
          Período consultado: <strong>{{ periodLabel }}</strong>
        </p>
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; margin-bottom:16px">
          <mat-card>
            <mat-card-content style="padding-top:16px">
              <mat-card-title>{{ summary()!.totalRevenue | currency:'COP':'symbol':'1.0-0' }}</mat-card-title>
              <mat-card-subtitle>Ingresos totales del período</mat-card-subtitle>
            </mat-card-content>
          </mat-card>
          <mat-card>
            <mat-card-content style="padding-top:16px">
              <mat-card-title>{{ summary()!.totalTransactions }}</mat-card-title>
              <mat-card-subtitle>Transacciones en el período</mat-card-subtitle>
            </mat-card-content>
          </mat-card>
          <mat-card>
            <mat-card-content style="padding-top:16px">
              <mat-card-title>
                {{ summary()!.totalTransactions > 0
                   ? (summary()!.totalRevenue / summary()!.totalTransactions | currency:'COP':'symbol':'1.0-0')
                   : '—' }}
              </mat-card-title>
              <mat-card-subtitle>Ticket promedio período</mat-card-subtitle>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Gráficos -->
        <div style="display:grid; grid-template-columns:2fr 1fr; gap:16px; margin-bottom:16px">
          <mat-card>
            <mat-card-header><mat-card-title>Ventas diarias</mat-card-title></mat-card-header>
            <mat-card-content>
              <canvas #dailyChart style="max-height:260px"></canvas>
            </mat-card-content>
          </mat-card>
          <mat-card>
            <mat-card-header><mat-card-title>Por medio de pago</mat-card-title></mat-card-header>
            <mat-card-content>
              <canvas #paymentChart style="max-height:260px"></canvas>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Resumen por categoría -->
        <mat-card style="margin-bottom:16px">
          <mat-card-header><mat-card-title>Ventas por categoría</mat-card-title></mat-card-header>
          <mat-card-content>
            <canvas #categoryChart style="max-height:220px"></canvas>
          </mat-card-content>
        </mat-card>
      }

      <!-- Historial paginado -->
      <mat-card>
        <mat-card-header>
          <mat-card-title>
            Historial de Transacciones
            @if (sales().length > 0) {
              <span style="font-size:0.85rem;color:#888;margin-left:8px">
                ({{ sales().length }} registros)
              </span>
            }
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          @if (loading()) {
            <div style="text-align:center;padding:32px">
              <mat-spinner diameter="40" style="margin:auto"></mat-spinner>
            </div>
          } @else if (sales().length === 0) {
            <p style="text-align:center;color:#888;padding:32px">
              Sin registros para el período seleccionado
            </p>
          } @else {
            <table mat-table [dataSource]="pagedSales()" style="width:100%">
              <ng-container matColumnDef="date">
                <th mat-header-cell *matHeaderCellDef>Fecha</th>
                <td mat-cell *matCellDef="let s">{{ s.createdAt | date:'dd/MM/yy HH:mm' }}</td>
              </ng-container>
              <ng-container matColumnDef="transaction">
                <th mat-header-cell *matHeaderCellDef>N° Transacción</th>
                <td mat-cell *matCellDef="let s">
                  <code style="font-size:0.8rem">{{ s.transactionNumber }}</code>
                </td>
              </ng-container>
              <ng-container matColumnDef="items">
                <th mat-header-cell *matHeaderCellDef>Ítems</th>
                <td mat-cell *matCellDef="let s">{{ s.items.length }}</td>
              </ng-container>
              <ng-container matColumnDef="total">
                <th mat-header-cell *matHeaderCellDef>Total</th>
                <td mat-cell *matCellDef="let s">
                  <strong>{{ s.total | currency:'COP':'symbol':'1.0-0' }}</strong>
                </td>
              </ng-container>
              <ng-container matColumnDef="payment">
                <th mat-header-cell *matHeaderCellDef>Pago</th>
                <td mat-cell *matCellDef="let s">
                  <mat-chip style="font-size:0.75rem">{{ s.paymentMethod }}</mat-chip>
                </td>
              </ng-container>
              <ng-container matColumnDef="detail">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let s">
                  <button mat-icon-button (click)="toggleDetail(s.id)" matTooltip="Ver detalle">
                    <mat-icon>{{ expandedSaleId === s.id ? 'expand_less' : 'expand_more' }}</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"
                  [style.background]="expandedSaleId === row.id ? '#f5f5f5' : ''"></tr>
            </table>

            <!-- Detalle de transacción expandido -->
            @if (expandedSaleId) {
              @for (s of pagedSales(); track s.id) {
                @if (s.id === expandedSaleId) {
                  <div style="background:#fafafa;border:1px solid #e0e0e0;border-radius:4px;padding:12px;margin-top:4px">
                    <strong style="font-size:0.9rem">Detalle: {{ s.transactionNumber }}</strong>
                    <table style="width:100%;margin-top:8px;font-size:0.85rem;border-collapse:collapse">
                      <thead>
                        <tr style="background:#eee">
                          <th style="padding:4px 8px;text-align:left">Producto</th>
                          <th style="padding:4px 8px;text-align:right">Cant.</th>
                          <th style="padding:4px 8px;text-align:right">P. Unit.</th>
                          <th style="padding:4px 8px;text-align:right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (item of s.items; track $index) {
                          <tr style="border-bottom:1px solid #eee">
                            <td style="padding:4px 8px">
                              {{ item.productName }}
                              @if (item.category) {
                                <span style="color:#888;font-size:0.75rem"> ({{ item.category }})</span>
                              }
                            </td>
                            <td style="padding:4px 8px;text-align:right">{{ item.quantity }}</td>
                            <td style="padding:4px 8px;text-align:right">{{ item.unitPrice | currency:'COP':'symbol':'1.0-0' }}</td>
                            <td style="padding:4px 8px;text-align:right;font-weight:600">{{ item.subtotal | currency:'COP':'symbol':'1.0-0' }}</td>
                          </tr>
                        }
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colspan="3" style="padding:6px 8px;text-align:right;font-weight:700">
                            @if (s.discount > 0) { Descuento: -{{ s.discount | currency:'COP':'symbol':'1.0-0' }} | }
                            Total:
                          </td>
                          <td style="padding:6px 8px;text-align:right;font-weight:700;color:#3f51b5">
                            {{ s.total | currency:'COP':'symbol':'1.0-0' }}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                }
              }
            }

            <mat-paginator
              [length]="sales().length"
              [pageSize]="pageSize"
              [pageSizeOptions]="[10, 25, 50]"
              (page)="onPage($event)"
              showFirstLastButtons>
            </mat-paginator>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class ReportsComponent implements OnInit, AfterViewInit {
  @ViewChild('dailyChart') dailyChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('paymentChart') paymentChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryChart') categoryChartRef!: ElementRef<HTMLCanvasElement>;

  private readonly api = inject(ApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  private dailyChartInstance: Chart | null = null;
  private paymentChartInstance: Chart | null = null;
  private categoryChartInstance: Chart | null = null;

  sales = signal<Sale[]>([]);
  dailySummary = signal<DailySummary | null>(null);
  summary = signal<SalesSummary | null>(null);
  loading = signal(false);

  rangeForm = this.fb.group({
    start: [null as Date | null],
    end: [null as Date | null],
  });

  pageIndex = 0;
  pageSize = 10;
  expandedSaleId: string | null = null;
  displayedColumns = ['date', 'transaction', 'items', 'total', 'payment', 'detail'];

  pagedSales = computed(() => {
    const start = this.pageIndex * this.pageSize;
    return this.sales().slice(start, start + this.pageSize);
  });

  get periodLabel(): string {
    const { start, end } = this.rangeForm.value;
    const fmt = (d: Date | null | undefined): string =>
      d ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` : '—';
    if (!start && !end) return '—';
    if (start && end && start.toDateString() === end.toDateString()) return fmt(start);
    return `${fmt(start)} — ${fmt(end)}`;
  }

  ngOnInit() {
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 6);
    this.rangeForm.setValue({ start: weekAgo, end: today });
    this.loadDailySummary();
    this.loadAll();
  }

  ngAfterViewInit() {}

  setToday() {
    const today = new Date();
    this.rangeForm.setValue({ start: today, end: today });
    this.loadAll();
  }

  setLastWeek() {
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 6);
    this.rangeForm.setValue({ start: weekAgo, end: today });
    this.loadAll();
  }

  setThisMonth() {
    const now = new Date();
    this.rangeForm.setValue({
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
    });
    this.loadAll();
  }

  loadDailySummary() {
    this.api.getDailySummary().subscribe({
      next: (s) => this.dailySummary.set(s),
    });
  }

  loadAll() {
    this.loading.set(true);
    this.pageIndex = 0;
    this.expandedSaleId = null;

    const { start, end } = this.rangeForm.value;
    const from = start ? this.toIsoDate(start) : undefined;
    const to = end ? this.toIsoDate(end) : (start ? this.toIsoDate(start) : undefined);

    this.api.getSales(from, to).subscribe({
      next: (sales) => {
        this.sales.set(sales);
        this.loading.set(false);
        this.api.getSalesSummary(from, to).subscribe({
          next: (s) => {
            this.summary.set(s);
            setTimeout(() => this.renderCharts(s), 100);
          },
        });
      },
      error: () => this.loading.set(false),
    });
  }

  onPage(e: PageEvent) {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.expandedSaleId = null;
  }

  toggleDetail(id: string) {
    this.expandedSaleId = this.expandedSaleId === id ? null : id;
  }

  private toIsoDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  formatIsoDate(isoDate: string): string {
    const [y, m, d] = isoDate.split('-');
    return `${d}/${m}/${y}`;
  }

  private formatDate(d: Date): string {
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }

  private renderCharts(s: SalesSummary) {
    this.renderDailyChart(s);
    this.renderPaymentChart(s);
    this.renderCategoryChart(s);
  }

  private renderDailyChart(s: SalesSummary) {
    if (!this.dailyChartRef) return;
    this.dailyChartInstance?.destroy();
    const labels = s.dailySeries.map((d) => {
      const [y, m, day] = d.date.split('-');
      return `${day}/${m}/${y}`;
    });
    const data = s.dailySeries.map((d) => d.total);
    this.dailyChartInstance = new Chart(this.dailyChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Ventas (COP)',
          data,
          backgroundColor: 'rgba(63, 81, 181, 0.7)',
          borderColor: '#3f51b5',
          borderWidth: 1,
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { callback: (v) => `$${Number(v).toLocaleString('es-CO')}` } } },
      },
    });
  }

  private renderPaymentChart(s: SalesSummary) {
    if (!this.paymentChartRef) return;
    this.paymentChartInstance?.destroy();
    const entries = Object.entries(s.byPaymentMethod);
    const labels = entries.map(([k]) => k);
    const data = entries.map(([, v]) => v.total);
    const colors = ['#3f51b5', '#4caf50', '#ff9800', '#9c27b0', '#f44336', '#00bcd4'];
    this.paymentChartInstance = new Chart(this.paymentChartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data, backgroundColor: colors.slice(0, labels.length) }],
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } },
    });
  }

  private renderCategoryChart(s: SalesSummary) {
    if (!this.categoryChartRef) return;
    this.categoryChartInstance?.destroy();
    const sorted = Object.entries(s.byCategory).sort((a, b) => b[1].total - a[1].total).slice(0, 10);
    const labels = sorted.map(([k]) => k);
    const data = sorted.map(([, v]) => v.total);
    this.categoryChartInstance = new Chart(this.categoryChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Total vendido (COP)',
          data,
          backgroundColor: 'rgba(76, 175, 80, 0.7)',
          borderColor: '#4caf50',
          borderWidth: 1,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true } },
      },
    });
  }

  exportXlsx() {
    const rows = this.sales().map((s) => ({
      'N° Transacción': s.transactionNumber,
      Fecha: new Date(s.createdAt).toLocaleString('es-CO'),
      'N° Ítems': s.items.length,
      Subtotal: Number(s.subtotal),
      Descuento: Number(s.discount),
      Total: Number(s.total),
      'Medio de Pago': s.paymentMethod,
      Notas: s.notes ?? '',
    }));
    const ws = xlsxUtils.json_to_sheet(rows);
    const wb = xlsxUtils.book_new();
    xlsxUtils.book_append_sheet(wb, ws, 'Ventas');
    xlsxWrite(wb, `ventas_${this.toIsoDate(new Date())}.xlsx`);
  }

  private loadImageAsBase64(src: string): Promise<string | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d')!.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  async exportPdf() {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const now = new Date();

    const logoDataUrl = await this.loadImageAsBase64('assets/logo.png');

    // Header
    const headerH = 32;
    doc.setFillColor(63, 81, 181);
    doc.rect(0, 0, pageW, headerH, 'F');

    if (logoDataUrl) {
      // White rounded box for the logo
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(pageW - 34, 3, 28, 26, 2, 2, 'F');
      doc.addImage(logoDataUrl, 'PNG', pageW - 33, 4, 26, 24);
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Impresiones Colina Real', 14, 13);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Reporte de Ventas', 14, 22);
    doc.text(`Generado: ${now.toLocaleString('es-CO')}`, logoDataUrl ? pageW - 38 : pageW - 14, 22, { align: 'right' });

    // Período
    const { start, end } = this.rangeForm.value;
    const fromLabel = start ? this.formatDate(start) : 'Inicio';
    const toLabel = end ? this.formatDate(end) : 'Hoy';
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Período: ${fromLabel} — ${toLabel}`, 14, 40);

    // Resumen
    const s = this.summary();
    if (s) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const formatCOP = (v: number) => `$${v.toLocaleString('es-CO')}`;
      doc.text(`Total ingresos: ${formatCOP(s.totalRevenue)}`, 14, 48);
      doc.text(`Transacciones: ${s.totalTransactions}`, 80, 48);
      doc.text(
        `Ticket promedio: ${s.totalTransactions > 0 ? formatCOP(s.totalRevenue / s.totalTransactions) : '—'}`,
        140, 48,
      );

      // Resumen por método de pago
      const pmRows = Object.entries(s.byPaymentMethod).map(([key, v]) => [
        key, String(v.count), formatCOP(v.total),
      ]);
      if (pmRows.length > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Por medio de pago', 14, 58);
        autoTable(doc, {
          startY: 61,
          head: [['Medio', 'Transacciones', 'Total']],
          body: pmRows,
          theme: 'striped',
          headStyles: { fillColor: [63, 81, 181] },
          margin: { left: 14 },
          tableWidth: 90,
        });
      }

      // Resumen por categoría
      const catRows = Object.entries(s.byCategory)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 10)
        .map(([cat, v]) => [cat, String(v.count), formatCOP(v.total)]);
      if (catRows.length > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Por categoría (top 10)', 115, 58);
        autoTable(doc, {
          startY: 61,
          head: [['Categoría', 'Unidades', 'Total']],
          body: catRows,
          theme: 'striped',
          headStyles: { fillColor: [76, 175, 80] },
          margin: { left: 115 },
        });
      }
    }

    // Tabla de transacciones
    const finalY = (doc as any).lastAutoTable?.finalY ?? 100;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalle de Transacciones', 14, finalY + 10);
    autoTable(doc, {
      startY: finalY + 13,
      head: [['Fecha', 'N° Transacción', 'Ítems', 'Total', 'Medio de Pago']],
      body: this.sales().map((sale) => [
        new Date(sale.createdAt).toLocaleString('es-CO'),
        sale.transactionNumber,
        String(sale.items.length),
        `$${Number(sale.total).toLocaleString('es-CO')}`,
        sale.paymentMethod,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [63, 81, 181] },
      styles: { fontSize: 8 },
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Impresiones Colina Real — Sistema POS IoT — Pág. ${i}/${pageCount}`, pageW / 2, 290, { align: 'center' });
    }

    doc.save(`reporte_ventas_${this.toIsoDate(now)}.pdf`);
  }
}
