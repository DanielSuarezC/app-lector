import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatBadgeModule } from '@angular/material/badge';

import { ApiService } from '../services/api.service';
import { ScannerEvent } from '../models/product.model';

@Component({
  selector: 'app-monitor',
  standalone: true,
  imports: [
    CommonModule, DatePipe,
    MatCardModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatTableModule, MatProgressBarModule, MatBadgeModule,
  ],
  template: `
    <div class="page-container">
      <h2 style="margin-bottom:16px">
        <mat-icon style="vertical-align:middle;margin-right:8px">developer_board</mat-icon>
        Monitor del Nodo Arduino
      </h2>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px">
        <!-- Estado del nodo -->
        <mat-card>
          <mat-card-header>
            <mat-icon mat-card-avatar [style.color]="connected ? '#4caf50' : '#f44336'">
              {{ connected ? 'wifi' : 'wifi_off' }}
            </mat-icon>
            <mat-card-title>Estado del Bridge</mat-card-title>
            <mat-card-subtitle>SSE: {{ connected ? 'Conectado' : 'Desconectado' }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="card-grid" style="margin-top:16px">
              <div style="text-align:center">
                <div style="font-size:2.5rem; font-weight:500; color:#3f51b5">{{ lastTemp ?? '—' }}</div>
                <div style="color:#666">°C Temperatura chip</div>
              </div>
              <div style="text-align:center">
                <div style="font-size:2.5rem; font-weight:500; color:#ff5722">{{ barcodesReceived }}</div>
                <div style="color:#666">Códigos en sesión</div>
              </div>
            </div>
            @if (lastTemp !== null && lastTemp > 70) {
              <div style="background:#fff3e0; padding:12px; border-radius:4px; margin-top:16px; color:#e65100">
                <mat-icon style="vertical-align:middle">thermostat</mat-icon>
                Temperatura elevada — revisar ventilación del nodo
              </div>
            }
          </mat-card-content>
        </mat-card>

        <!-- Últimos eventos -->
        <mat-card>
          <mat-card-header>
            <mat-card-title>Eventos en tiempo real</mat-card-title>
            <span style="flex:1"></span>
            <button mat-icon-button (click)="recentEvents=[]" matTooltip="Limpiar">
              <mat-icon>clear_all</mat-icon>
            </button>
          </mat-card-header>
          <mat-card-content style="max-height:300px; overflow-y:auto">
            @for (event of recentEvents; track event.id) {
              <div style="display:flex; gap:8px; padding:6px 0; border-bottom:1px solid #eee; font-size:0.9rem">
                <mat-icon style="font-size:18px;color:#666">
                  {{ event.type === 'barcode' ? 'qr_code_scanner' : event.type === 'temp' ? 'thermostat' : 'power' }}
                </mat-icon>
                <span style="flex:1">
                  @if (event.type === 'barcode') { {{ event.data }} }
                  @if (event.type === 'temp') { Temp: {{ event.value }}°{{ event.unit }} }
                  @if (event.type === 'boot') { Arduino inicializado }
                </span>
                <small style="color:#999">{{ event.receivedAt | date:'HH:mm:ss' }}</small>
              </div>
            }
            @if (recentEvents.length === 0) {
              <p style="color:#999;text-align:center;padding:16px">Esperando eventos del scanner...</p>
            }
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Historial de temperatura -->
      <mat-card style="margin-top:24px">
        <mat-card-header>
          <mat-card-title>Historial de temperatura del ATmega328P</mat-card-title>
          <mat-card-subtitle>Últimas 100 lecturas</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          @if (temperatures.length === 0) {
            <p style="color:#999;text-align:center;padding:16px">Sin datos de temperatura aún.</p>
          } @else {
            <div style="display:flex; gap:4px; align-items:flex-end; height:80px; padding:8px 0">
              @for (t of tempChart; track $index) {
                <div [style.height.%]="t.pct"
                  [style.background]="t.val > 70 ? '#f44336' : t.val > 50 ? '#ff9800' : '#4caf50'"
                  style="flex:1; min-width:3px; border-radius:2px 2px 0 0"
                  [title]="t.val + '°C'">
                </div>
              }
            </div>
            <div style="display:flex;justify-content:space-between;font-size:0.8rem;color:#666">
              <span>Min: {{ minTemp }}°C</span>
              <span>Promedio: {{ avgTemp }}°C</span>
              <span>Max: {{ maxTemp }}°C</span>
            </div>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class MonitorComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);

  connected = false;
  lastTemp: number | null = null;
  barcodesReceived = 0;
  recentEvents: ScannerEvent[] = [];
  temperatures: ScannerEvent[] = [];

  private eventSource: EventSource | null = null;

  get tempValues(): number[] {
    return this.temperatures.map((t) => Number(t.value));
  }
  get minTemp(): number { return this.tempValues.length ? Math.min(...this.tempValues) : 0; }
  get maxTemp(): number { return this.tempValues.length ? Math.max(...this.tempValues) : 0; }
  get avgTemp(): number {
    if (!this.tempValues.length) { return 0; }
    return Math.round(this.tempValues.reduce((a, b) => a + b, 0) / this.tempValues.length * 10) / 10;
  }
  get tempChart() {
    const max = this.maxTemp || 1;
    return this.tempValues.slice(-60).map((v) => ({ val: v, pct: Math.round((v / max) * 100) }));
  }

  ngOnInit() {
    this.api.getRecentEvents(20).subscribe({ next: (events) => { this.recentEvents = events; } });
    this.api.getTemperatures(100).subscribe({ next: (temps) => { this.temperatures = temps; } });
    this.connectSSE();
  }

  connectSSE() {
    this.eventSource = this.api.getScannerStream();
    this.eventSource.onopen = () => { this.connected = true; };
    this.eventSource.onmessage = (msg) => {
      try {
        const event: ScannerEvent = JSON.parse(msg.data);
        this.recentEvents = [event, ...this.recentEvents].slice(0, 50);
        if (event.type === 'barcode') { this.barcodesReceived++; }
        if (event.type === 'temp') {
          this.lastTemp = Number(event.value);
          this.temperatures = [event, ...this.temperatures].slice(0, 100);
        }
      } catch { /* ignorar */ }
    };
    this.eventSource.onerror = () => {
      this.connected = false;
      this.eventSource?.close();
      setTimeout(() => this.connectSSE(), 5000);
    };
  }

  ngOnDestroy() {
    this.eventSource?.close();
  }
}
