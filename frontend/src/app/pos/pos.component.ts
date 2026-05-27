import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';

import { ApiService } from '../services/api.service';
import { ScannerService } from '../services/scanner.service';
import { CartItem, Product } from '../models/product.model';

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [
    CommonModule, FormsModule, CurrencyPipe,
    MatCardModule, MatButtonModule, MatIconModule, MatInputModule,
    MatFormFieldModule, MatSelectModule, MatDividerModule, MatSnackBarModule,
    MatProgressSpinnerModule, MatTableModule, MatTooltipModule,
  ],
  template: `
    <div class="page-container">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px">
        <h2>
          <mat-icon style="vertical-align:middle;margin-right:8px">point_of_sale</mat-icon>
          Punto de Venta
        </h2>
        <div style="display:flex; align-items:center; gap:6px; font-size:0.85rem"
             [matTooltip]="scanner.bridgeOnline ? 'Lector enviando datos' : (scanner.connected$.value ? 'Bridge conectado, sin escaneos recientes' : 'Bridge desconectado')">
          <span [style.color]="scanner.bridgeOnline ? '#4caf50' : (scanner.connected$.value ? '#ff9800' : '#f44336')"
                style="font-size:22px; line-height:1">●</span>
          <span style="color:#555">
            {{ scanner.bridgeOnline ? 'Lector activo' : (scanner.connected$.value ? 'En espera' : 'Sin conexión') }}
          </span>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 380px; gap:24px">
        <!-- Panel izquierdo: búsqueda y carrito -->
        <div>
          <mat-card>
            <mat-card-header>
              <mat-card-title>Escanear / Buscar producto</mat-card-title>
              <mat-card-subtitle>
                Presiona el botón del lector o escribe el código y pulsa Enter
              </mat-card-subtitle>
            </mat-card-header>
            <mat-card-content style="padding-top:16px">
              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Código de barras o nombre</mat-label>
                <input matInput
                  [(ngModel)]="searchQuery"
                  (keyup.enter)="addByBarcode()"
                  placeholder="Escanea o escribe el código..."
                  [disabled]="loading"
                  #barcodeInput>
                <mat-icon matSuffix>qr_code_scanner</mat-icon>
              </mat-form-field>
              <button mat-raised-button color="primary" (click)="addByBarcode()" [disabled]="loading || !searchQuery">
                <mat-icon>add_shopping_cart</mat-icon> Agregar
              </button>
              @if (lastScannedCode) {
                <div style="margin-top:8px; font-size:0.8rem; color:#666">
                  <mat-icon style="font-size:14px; vertical-align:middle">qr_code</mat-icon>
                  Último escaneo: <strong>{{ lastScannedCode }}</strong>
                </div>
              }
            </mat-card-content>
          </mat-card>

          <!-- Carrito -->
          <mat-card style="margin-top:16px">
            <mat-card-header>
              <mat-card-title>Carrito ({{ cart.length }} items)</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              @if (cart.length === 0) {
                <p style="color:#999; text-align:center; padding:24px 0">
                  El carrito está vacío. Escanea un producto para comenzar.
                </p>
              }
              @for (item of cart; track item.product.id) {
                <div class="cart-item">
                  <div>
                    <strong>{{ item.product.name }}</strong><br>
                    <small style="color:#666">{{ item.product.barcode }}</small>
                  </div>
                  <div style="display:flex;align-items:center;gap:8px">
                    <button mat-icon-button (click)="changeQty(item, -1)"><mat-icon>remove</mat-icon></button>
                    <strong>{{ item.quantity }}</strong>
                    <button mat-icon-button (click)="changeQty(item, 1)"><mat-icon>add</mat-icon></button>
                    <span style="min-width:100px; text-align:right">
                      {{ item.product.salePrice * item.quantity | currency:'COP':'symbol':'1.0-0' }}
                    </span>
                    <button mat-icon-button color="warn" (click)="removeItem(item)">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                </div>
              }
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Panel derecho: resumen y pago -->
        <div>
          <mat-card>
            <mat-card-header>
              <mat-card-title>Resumen de Venta</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div style="display:flex;justify-content:space-between;padding:8px 0">
                <span>Subtotal</span>
                <strong>{{ subtotal | currency:'COP':'symbol':'1.0-0' }}</strong>
              </div>
              <mat-form-field appearance="outline" style="width:100%;margin-top:8px">
                <mat-label>Descuento (COP)</mat-label>
                <input matInput type="number" [(ngModel)]="discount" min="0">
              </mat-form-field>
              <mat-divider></mat-divider>
              <div style="display:flex;justify-content:space-between;padding:12px 0;font-size:1.2rem">
                <strong>TOTAL</strong>
                <strong style="color:#3f51b5">{{ total | currency:'COP':'symbol':'1.0-0' }}</strong>
              </div>

              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Método de pago</mat-label>
                <mat-select [(ngModel)]="paymentMethod">
                  <mat-option value="cash">Efectivo</mat-option>
                  <mat-option value="card">Tarjeta</mat-option>
                  <mat-option value="nequi">Nequi</mat-option>
                  <mat-option value="transfer">Transferencia</mat-option>
                </mat-select>
              </mat-form-field>

              <button mat-raised-button color="accent"
                style="width:100%; margin-top:8px; height:52px; font-size:1rem"
                [disabled]="cart.length === 0 || processingPayment"
                (click)="confirmSale()">
                @if (processingPayment) {
                  <mat-spinner diameter="24" style="margin:auto"></mat-spinner>
                } @else {
                  <ng-container>
                    <mat-icon>payments</mat-icon> Confirmar Venta
                  </ng-container>
                }
              </button>

              <button mat-stroked-button color="warn"
                style="width:100%;margin-top:8px"
                [disabled]="cart.length === 0"
                (click)="clearCart()">
                <mat-icon>clear_all</mat-icon> Cancelar
              </button>
            </mat-card-content>
          </mat-card>

          @if (lastTransaction) {
            <mat-card style="margin-top:16px; border-left:4px solid #4caf50">
              <mat-card-header>
                <mat-icon mat-card-avatar style="color:#4caf50">check_circle</mat-icon>
                <mat-card-title>Venta Registrada</mat-card-title>
                <mat-card-subtitle>{{ lastTransaction.transactionNumber }}</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <p>Total: <strong>{{ lastTransaction.total | currency:'COP':'symbol':'1.0-0' }}</strong></p>
                <p>Método: {{ lastTransaction.paymentMethod }}</p>
              </mat-card-content>
            </mat-card>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cart-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
  `],
})
export class PosComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly snack = inject(MatSnackBar);
  readonly scanner = inject(ScannerService);

  private scanSub?: Subscription;

  cart: CartItem[] = [];
  searchQuery = '';
  discount = 0;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'nequi' = 'cash';
  loading = false;
  processingPayment = false;
  lastScannedCode: string | null = null;
  lastTransaction: { transactionNumber: string; total: number; paymentMethod: string } | null = null;

  get subtotal(): number {
    return this.cart.reduce((sum, item) => sum + item.product.salePrice * item.quantity, 0);
  }

  get total(): number {
    return Math.max(0, this.subtotal - this.discount);
  }

  ngOnInit() {
    this.scanSub = this.scanner.barcode$.subscribe((code) => {
      this.lastScannedCode = code;
      this.searchQuery = code;
      this.addByBarcode();
    });
  }

  ngOnDestroy() {
    this.scanSub?.unsubscribe();
  }

  addByBarcode() {
    const query = this.searchQuery.trim();
    if (!query) { return; }

    const existing = this.cart.find((i) => i.product.barcode === query);
    if (existing) {
      existing.quantity++;
      this.searchQuery = '';
      return;
    }

    this.loading = true;
    this.api.getProductByBarcode(query).subscribe({
      next: (product: Product) => {
        this.cart.push({ product, quantity: 1 });
        this.searchQuery = '';
        this.loading = false;
      },
      error: () => {
        this.snack.open(`Producto no encontrado: ${query}`, 'Cerrar', { duration: 3000 });
        this.loading = false;
      },
    });
  }

  changeQty(item: CartItem, delta: number) {
    item.quantity = Math.max(1, item.quantity + delta);
  }

  removeItem(item: CartItem) {
    this.cart = this.cart.filter((i) => i !== item);
  }

  clearCart() {
    this.cart = [];
    this.discount = 0;
    this.lastTransaction = null;
  }

  confirmSale() {
    if (this.cart.length === 0) { return; }
    this.processingPayment = true;
    this.api.createSale({
      items: this.cart.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
      paymentMethod: this.paymentMethod,
      discount: this.discount,
    }).subscribe({
      next: (sale) => {
        this.lastTransaction = {
          transactionNumber: sale.transactionNumber,
          total: sale.total,
          paymentMethod: sale.paymentMethod,
        };
        this.clearCart();
        this.processingPayment = false;
        this.snack.open('¡Venta registrada exitosamente!', 'OK', { duration: 4000 });
      },
      error: (err) => {
        const msg = err?.error?.message || 'Error al registrar la venta';
        this.snack.open(msg, 'Cerrar', { duration: 5000 });
        this.processingPayment = false;
      },
    });
  }
}
