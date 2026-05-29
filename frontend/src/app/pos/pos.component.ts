import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
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
import { CartItem, Product, ServiceCartItem, PaymentMethod } from '../models/product.model';

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

      <!-- Teclado numérico para precio manual -->
      @if (showNumpad && numpadProduct) {
        <div style="position:fixed; inset:0; background:rgba(0,0,0,0.55); z-index:1000; display:flex; align-items:center; justify-content:center">
          <mat-card style="width:340px">
            <mat-card-header>
              <mat-icon mat-card-avatar style="color:#3f51b5">price_change</mat-icon>
              <mat-card-title>Ingresar precio</mat-card-title>
              <mat-card-subtitle>{{ numpadProduct.name }}</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <!-- Display del valor ingresado -->
              <div style="background:#f5f5f5; border-radius:8px; padding:16px 20px; margin-bottom:16px; text-align:right">
                <div style="font-size:2.2rem; font-weight:700; font-family:monospace; min-height:3rem; color:#1a237e">
                  {{ numpadValue || '0' }}
                </div>
                <div style="font-size:0.8rem; color:#888">COP</div>
                @if (numpadError) {
                  <div style="color:#f44336; font-size:0.85rem; margin-top:4px">{{ numpadError }}</div>
                }
              </div>

              <!-- Teclas del teclado -->
              <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:12px">
                @for (key of numpadKeys; track key) {
                  <button mat-stroked-button
                    style="height:56px; font-size:1.2rem; font-weight:600; border-radius:8px"
                    (click)="numpadPress(key)">
                    @if (key === 'back') {
                      <mat-icon>backspace</mat-icon>
                    } @else {
                      {{ key }}
                    }
                  </button>
                }
              </div>
            </mat-card-content>
            <mat-card-actions style="padding:0 16px 16px; display:flex; gap:8px">
              <button mat-raised-button color="primary" style="flex:1; height:48px; font-size:1rem"
                (click)="confirmNumpad()">
                <mat-icon>check</mat-icon> Confirmar
              </button>
              <button mat-stroked-button style="height:48px" (click)="cancelNumpad()">
                Cancelar
              </button>
            </mat-card-actions>
          </mat-card>
        </div>
      }

      <div style="display:grid; grid-template-columns:1fr 380px; gap:24px">
        <!-- Panel izquierdo: búsqueda y carrito -->
        <div>
          <mat-card>
            <mat-card-header>
              <mat-card-title>Escanear / Buscar producto</mat-card-title>
              <mat-card-subtitle>
                Escanea, escribe el código y presiona Enter, o busca por nombre
              </mat-card-subtitle>
            </mat-card-header>
            <mat-card-content style="padding-top:16px">

              <!-- Selector de modo -->
              <div style="display:flex; gap:8px; margin-bottom:12px; flex-wrap:wrap">
                <button mat-stroked-button
                  [color]="searchMode === 'barcode' ? 'primary' : ''"
                  (click)="setMode('barcode')">
                  <mat-icon>qr_code_scanner</mat-icon> Código de barras
                </button>
                <button mat-stroked-button
                  [color]="searchMode === 'name' ? 'primary' : ''"
                  (click)="setMode('name')">
                  <mat-icon>search</mat-icon> Buscar por nombre
                </button>
                <button mat-stroked-button
                  [color]="searchMode === 'service' ? 'accent' : ''"
                  (click)="setMode('service')">
                  <mat-icon>bolt</mat-icon> Servicios rápidos
                </button>
              </div>

              <!-- Modo código de barras -->
              @if (searchMode === 'barcode') {
                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>Código de barras</mat-label>
                  <input matInput
                    [(ngModel)]="searchQuery"
                    (keyup.enter)="addByBarcode()"
                    placeholder="Escanea o escribe el código..."
                    [disabled]="loading">
                  <mat-icon matSuffix>qr_code_scanner</mat-icon>
                </mat-form-field>
                <button mat-raised-button color="primary"
                  (click)="addByBarcode()" [disabled]="loading || !searchQuery">
                  <mat-icon>add_shopping_cart</mat-icon> Agregar
                </button>
                @if (lastScannedCode) {
                  <div style="margin-top:8px; font-size:0.8rem; color:#666">
                    <mat-icon style="font-size:14px; vertical-align:middle">qr_code</mat-icon>
                    Último escaneo: <strong>{{ lastScannedCode }}</strong>
                  </div>
                }
              }

              <!-- Modo búsqueda por nombre -->
              @if (searchMode === 'name') {
                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>Nombre del producto</mat-label>
                  <input matInput
                    [(ngModel)]="nameQuery"
                    (ngModelChange)="onNameChange()"
                    (keyup.enter)="addFirstResult()"
                    placeholder="Escribe al menos 2 letras..."
                    [disabled]="loading">
                  <mat-icon matSuffix>search</mat-icon>
                </mat-form-field>

                @if (nameSearching) {
                  <div style="text-align:center; padding:8px">
                    <mat-spinner diameter="24" style="margin:auto"></mat-spinner>
                  </div>
                }

                @if (nameResults.length > 0) {
                  <div class="name-results">
                    @for (product of nameResults; track product.id) {
                      <div class="name-result-item" (click)="addProductToCart(product)">
                        <div>
                          <strong>{{ product.name }}</strong>
                          @if (product.category) {
                            <span style="color:#888; font-size:0.8rem"> — {{ product.category }}</span>
                          }
                          <br>
                          <small style="color:#888">
                            @if (product.barcode) {
                              {{ product.barcode }}
                            } @else {
                              <span style="color:#ff9800">Sin código</span>
                            }
                          </small>
                        </div>
                        <div style="text-align:right">
                          @if (!product.salePrice || +product.salePrice === 0) {
                            <strong style="color:#ff9800; font-size:0.85rem">Sin precio fijo</strong>
                          } @else {
                            <strong style="color:#3f51b5">
                              {{ product.salePrice | currency:'COP':'symbol':'1.0-0' }}
                            </strong>
                          }
                          <br>
                          <small [style.color]="product.stock <= product.minStock ? '#f44336' : '#4caf50'">
                            Stock: {{ product.stock }}
                          </small>
                        </div>
                      </div>
                    }
                  </div>
                }

                @if (nameQuery.length >= 2 && !nameSearching && nameResults.length === 0) {
                  <div style="padding:12px; color:#999; text-align:center">
                    <mat-icon>search_off</mat-icon>
                    Sin resultados para "{{ nameQuery }}"
                  </div>
                }
              }

              <!-- Modo servicios rápidos -->
              @if (searchMode === 'service') {
                <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:16px">
                  @for (svc of QUICK_SERVICES; track svc.key) {
                    <button mat-raised-button
                      [style.background-color]="selectedService?.key === svc.key ? svc.color : ''"
                      [style.color]="selectedService?.key === svc.key ? '#fff' : svc.color"
                      [style.border]="'2px solid ' + svc.color"
                      style="height:72px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px"
                      (click)="openServiceForm(svc)">
                      <mat-icon [style.color]="selectedService?.key === svc.key ? '#fff' : svc.color">{{ svc.icon }}</mat-icon>
                      <span style="font-size:0.75rem; font-weight:600">{{ svc.label }}</span>
                    </button>
                  }
                </div>

                @if (showServiceForm && selectedService) {
                  <div style="border:1px solid #e0e0e0; border-radius:8px; padding:16px; background:#fafafa">
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px">
                      <mat-icon [style.color]="selectedService.color">{{ selectedService.icon }}</mat-icon>
                      <strong style="font-size:1rem">{{ selectedService.label }}</strong>
                    </div>
                    <mat-form-field appearance="outline" style="width:100%">
                      <mat-label>Descripción</mat-label>
                      <input matInput [(ngModel)]="serviceName" placeholder="Ej: Impresión carta color">
                    </mat-form-field>
                    <div style="display:flex; gap:12px; align-items:flex-start">
                      <mat-form-field appearance="outline" style="flex:1">
                        <mat-label>Precio unitario (COP)</mat-label>
                        <input matInput type="number" [(ngModel)]="servicePrice" min="1">
                      </mat-form-field>
                      <div style="display:flex; align-items:center; gap:8px; padding-top:12px">
                        <button mat-icon-button (click)="serviceQty = serviceQty > 1 ? serviceQty - 1 : 1">
                          <mat-icon>remove</mat-icon>
                        </button>
                        <strong style="min-width:24px; text-align:center">{{ serviceQty }}</strong>
                        <button mat-icon-button (click)="serviceQty = serviceQty + 1">
                          <mat-icon>add</mat-icon>
                        </button>
                      </div>
                    </div>
                    <button mat-raised-button color="accent" style="width:100%"
                      [disabled]="!serviceName.trim() || servicePrice <= 0"
                      (click)="addService()">
                      <mat-icon>add_shopping_cart</mat-icon>
                      Agregar al carrito — {{ servicePrice * serviceQty | currency:'COP':'symbol':'1.0-0' }}
                    </button>
                  </div>
                }
              }
            </mat-card-content>
          </mat-card>

          <!-- Carrito -->
          <mat-card style="margin-top:16px">
            <mat-card-header>
              <mat-card-title>Carrito ({{ cartTotalItems }} items)</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              @if (cart.length === 0 && serviceCart.length === 0) {
                <p style="color:#999; text-align:center; padding:24px 0">
                  El carrito está vacío. Escanea, busca un producto o agrega un servicio rápido.
                </p>
              }
              @for (item of cart; track item.product.id + item.product.salePrice) {
                <div class="cart-item">
                  <div>
                    <strong>{{ item.product.name }}</strong><br>
                    <small style="color:#666">{{ item.product.barcode ?? 'Sin código' }}</small>
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
              @for (svc of serviceCart; track svc.serviceKey + svc.name) {
                <div class="cart-item">
                  <div>
                    <div style="display:flex; align-items:center; gap:6px">
                      <span [style.background]="getServiceColor(svc.serviceKey)"
                            style="color:#fff; border-radius:4px; padding:2px 7px; font-size:0.7rem; font-weight:700">
                        {{ getServiceLabel(svc.serviceKey) }}
                      </span>
                      <strong>{{ svc.name }}</strong>
                    </div>
                    <small style="color:#888">Servicio rápido</small>
                  </div>
                  <div style="display:flex;align-items:center;gap:8px">
                    <button mat-icon-button (click)="changeServiceQty(svc, -1)"><mat-icon>remove</mat-icon></button>
                    <strong>{{ svc.quantity }}</strong>
                    <button mat-icon-button (click)="changeServiceQty(svc, 1)"><mat-icon>add</mat-icon></button>
                    <span style="min-width:100px; text-align:right">
                      {{ svc.unitPrice * svc.quantity | currency:'COP':'symbol':'1.0-0' }}
                    </span>
                    <button mat-icon-button color="warn" (click)="removeServiceItem(svc)">
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
                <mat-label>Medio de pago</mat-label>
                <mat-select [(ngModel)]="paymentMethod">
                  @for (pm of paymentMethods(); track pm.id) {
                    <mat-option [value]="pm.key">{{ pm.name }}</mat-option>
                  }
                  @if (paymentMethods().length === 0) {
                    <mat-option value="cash">Efectivo</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <button mat-raised-button color="accent"
                style="width:100%; margin-top:8px; height:52px; font-size:1rem"
                [disabled]="cartTotalItems === 0 || processingPayment"
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
                [disabled]="cartTotalItems === 0"
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
    .name-results {
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      max-height: 320px;
      overflow-y: auto;
    }
    .name-result-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 14px;
      cursor: pointer;
      border-bottom: 1px solid #f0f0f0;
      transition: background 0.15s;
    }
    .name-result-item:last-child { border-bottom: none; }
    .name-result-item:hover { background: #f5f5f5; }
  `],
})
export class PosComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly snack = inject(MatSnackBar);
  readonly scanner = inject(ScannerService);

  private scanSub?: Subscription;
  private nameSearchTimer: ReturnType<typeof setTimeout> | null = null;

  readonly QUICK_SERVICES = [
    { key: 'impresion',     label: 'Impresión',       icon: 'print',       color: '#1976d2', defaultPrice: 200  },
    { key: 'fotocopia',     label: 'Fotocopia',        icon: 'content_copy', color: '#388e3c', defaultPrice: 100  },
    { key: 'scanner',       label: 'Escáner',          icon: 'scanner',     color: '#7b1fa2', defaultPrice: 300  },
    { key: 'transcripcion', label: 'Transcripción',    icon: 'keyboard',    color: '#f57c00', defaultPrice: 2000 },
    { key: 'tramite',       label: 'Trámite Digital',  icon: 'assignment',  color: '#c62828', defaultPrice: 5000 },
  ];

  readonly numpadKeys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', 'back'];

  paymentMethods = signal<PaymentMethod[]>([]);

  cart: CartItem[] = [];
  serviceCart: ServiceCartItem[] = [];
  searchQuery = '';
  nameQuery = '';
  nameResults: Product[] = [];
  nameSearching = false;
  searchMode: 'barcode' | 'name' | 'service' = 'barcode';
  discount = 0;
  paymentMethod = 'cash';
  loading = false;
  processingPayment = false;
  lastScannedCode: string | null = null;
  lastTransaction: { transactionNumber: string; total: number; paymentMethod: string } | null = null;

  showServiceForm = false;
  selectedService: typeof this.QUICK_SERVICES[0] | null = null;
  serviceName = '';
  serviceQty = 1;
  servicePrice = 0;

  showNumpad = false;
  numpadProduct: Product | null = null;
  numpadValue = '';
  numpadError = '';

  get subtotal(): number {
    const productsTotal = this.cart.reduce((sum, item) => sum + item.product.salePrice * item.quantity, 0);
    const servicesTotal = this.serviceCart.reduce((sum, s) => sum + s.unitPrice * s.quantity, 0);
    return productsTotal + servicesTotal;
  }

  get total(): number {
    return Math.max(0, this.subtotal - this.discount);
  }

  get cartTotalItems(): number {
    return this.cart.length + this.serviceCart.length;
  }

  ngOnInit() {
    this.api.getPaymentMethods().subscribe({
      next: (pms) => {
        this.paymentMethods.set(pms);
        if (pms.length > 0 && !pms.find((p) => p.key === this.paymentMethod)) {
          this.paymentMethod = pms[0].key;
        }
      },
    });
    this.scanSub = this.scanner.barcode$.subscribe((code) => {
      this.lastScannedCode = code;
      this.searchMode = 'barcode';
      this.searchQuery = code;
      this.addByBarcode();
    });
  }

  ngOnDestroy() {
    this.scanSub?.unsubscribe();
    if (this.nameSearchTimer) { clearTimeout(this.nameSearchTimer); }
  }

  setMode(mode: 'barcode' | 'name' | 'service') {
    this.searchMode = mode;
    this.nameResults = [];
    this.nameQuery = '';
    this.searchQuery = '';
    this.showServiceForm = false;
    this.selectedService = null;
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
        this.searchQuery = '';
        this.loading = false;
        if (!product.salePrice || Number(product.salePrice) === 0) {
          this.openNumpad({ ...product });
          return;
        }
        this.cart.push({ product, quantity: 1 });
      },
      error: () => {
        this.snack.open(`Producto no encontrado: ${query}`, 'Cerrar', { duration: 3000 });
        this.loading = false;
      },
    });
  }

  onNameChange() {
    if (this.nameSearchTimer) { clearTimeout(this.nameSearchTimer); }
    const q = this.nameQuery.trim();
    if (q.length < 2) {
      this.nameResults = [];
      return;
    }
    this.nameSearching = true;
    this.nameSearchTimer = setTimeout(() => {
      this.api.searchProducts(q).subscribe({
        next: (results) => { this.nameResults = results; this.nameSearching = false; },
        error: () => { this.nameResults = []; this.nameSearching = false; },
      });
    }, 300);
  }

  addFirstResult() {
    if (this.nameResults.length > 0) {
      this.addProductToCart(this.nameResults[0]);
    }
  }

  addProductToCart(product: Product) {
    if (!product.salePrice || Number(product.salePrice) === 0) {
      this.openNumpad({ ...product });
      this.nameQuery = '';
      this.nameResults = [];
      return;
    }
    const existing = this.cart.find((i) => i.product.id === product.id);
    if (existing) {
      existing.quantity++;
    } else {
      this.cart.push({ product, quantity: 1 });
    }
    this.nameQuery = '';
    this.nameResults = [];
    this.snack.open(`"${product.name}" agregado al carrito`, '', { duration: 1500 });
  }

  openNumpad(product: Product) {
    this.numpadProduct = product;
    this.numpadValue = '';
    this.numpadError = '';
    this.showNumpad = true;
  }

  numpadPress(key: string) {
    if (key === 'back') {
      this.numpadValue = this.numpadValue.slice(0, -1);
    } else if (key === '.') {
      if (!this.numpadValue.includes('.')) this.numpadValue += '.';
    } else {
      if (this.numpadValue.length < 10) this.numpadValue += key;
    }
    this.numpadError = '';
  }

  confirmNumpad() {
    const price = parseFloat(this.numpadValue);
    if (!price || price <= 0) {
      this.numpadError = 'Ingresa un precio válido mayor a 0';
      return;
    }
    if (!this.numpadProduct) return;
    const productWithPrice: Product = { ...this.numpadProduct, salePrice: price };
    const existing = this.cart.find((i) => i.product.id === productWithPrice.id);
    if (existing) {
      existing.quantity++;
    } else {
      this.cart.push({ product: productWithPrice, quantity: 1 });
    }
    this.snack.open(`"${productWithPrice.name}" — $${price.toLocaleString()} — agregado`, '', { duration: 1500 });
    this.showNumpad = false;
    this.numpadProduct = null;
    this.numpadValue = '';
  }

  cancelNumpad() {
    this.showNumpad = false;
    this.numpadProduct = null;
    this.numpadValue = '';
    this.numpadError = '';
  }

  changeQty(item: CartItem, delta: number) {
    item.quantity = Math.max(1, item.quantity + delta);
  }

  removeItem(item: CartItem) {
    this.cart = this.cart.filter((i) => i !== item);
  }

  openServiceForm(svc: typeof this.QUICK_SERVICES[0]) {
    if (this.selectedService?.key === svc.key && this.showServiceForm) {
      this.showServiceForm = false;
      this.selectedService = null;
      return;
    }
    this.selectedService = svc;
    this.serviceName = svc.label;
    this.servicePrice = svc.defaultPrice;
    this.serviceQty = 1;
    this.showServiceForm = true;
  }

  addService() {
    if (!this.selectedService || !this.serviceName.trim() || this.servicePrice <= 0) { return; }
    const existing = this.serviceCart.find(
      (s) => s.serviceKey === this.selectedService!.key && s.name === this.serviceName.trim(),
    );
    if (existing) {
      existing.quantity += this.serviceQty;
    } else {
      this.serviceCart.push({
        type: 'service',
        serviceKey: this.selectedService.key,
        name: this.serviceName.trim(),
        unitPrice: this.servicePrice,
        quantity: this.serviceQty,
      });
    }
    this.snack.open(`"${this.serviceName.trim()}" agregado al carrito`, '', { duration: 1500 });
    this.showServiceForm = false;
    this.selectedService = null;
  }

  removeServiceItem(item: ServiceCartItem) {
    this.serviceCart = this.serviceCart.filter((s) => s !== item);
  }

  changeServiceQty(item: ServiceCartItem, delta: number) {
    item.quantity = Math.max(1, item.quantity + delta);
  }

  getServiceColor(key: string): string {
    return this.QUICK_SERVICES.find((s) => s.key === key)?.color ?? '#666';
  }

  getServiceLabel(key: string): string {
    return this.QUICK_SERVICES.find((s) => s.key === key)?.label ?? key;
  }

  clearCart() {
    this.cart = [];
    this.serviceCart = [];
    this.discount = 0;
    this.lastTransaction = null;
  }

  confirmSale() {
    if (this.cartTotalItems === 0) { return; }
    this.processingPayment = true;
    this.api.createSale({
      items: this.cart.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
      quickItems: this.serviceCart.map((s) => ({
        name: s.name,
        unitPrice: s.unitPrice,
        quantity: s.quantity,
        category: s.serviceKey,
      })),
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
