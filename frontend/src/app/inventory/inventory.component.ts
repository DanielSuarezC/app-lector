import {
  Component, OnInit, OnDestroy, inject, signal, computed,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule, CurrencyPipe } from '@angular/common';
import {
  FormsModule, ReactiveFormsModule, FormBuilder, Validators, FormArray,
  AbstractControl, FormGroup,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';

import { ApiService } from '../services/api.service';
import { ScannerService } from '../services/scanner.service';
import { Product, Category, ItemType, SoldBy } from '../models/product.model';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, CurrencyPipe,
    MatCardModule, MatButtonModule, MatIconModule, MatInputModule,
    MatFormFieldModule, MatTableModule, MatChipsModule, MatSnackBarModule,
    MatProgressSpinnerModule, MatTooltipModule, MatSelectModule, MatRadioModule,
    MatSlideToggleModule, MatAutocompleteModule,
    MatDividerModule, MatTabsModule, MatExpansionModule,
  ],
  template: `
    <div class="page-container">
      <!-- Header -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px">
        <h2>
          <mat-icon style="vertical-align:middle; margin-right:8px">inventory_2</mat-icon>
          Inventario
        </h2>
        <div style="display:flex; align-items:center; gap:12px">
          <div style="display:flex; align-items:center; gap:6px; font-size:0.85rem">
            <span [style.color]="scanner.bridgeOnline ? '#4caf50' : (scanner.connected$.value ? '#ff9800' : '#f44336')"
                  style="font-size:22px; line-height:1">●</span>
            <span style="color:#555">
              {{ scanner.bridgeOnline ? 'Lector activo' : (scanner.connected$.value ? 'En espera' : 'Sin conexión') }}
            </span>
          </div>
          <button mat-raised-button color="primary" (click)="openNewForm('product')">
            <mat-icon>add</mat-icon> Nuevo Producto
          </button>
          <button mat-raised-button color="accent" (click)="openNewForm('service')">
            <mat-icon>design_services</mat-icon> Nuevo Servicio
          </button>
        </div>
      </div>

      <!-- Alertas de bajo stock -->
      @if (lowStockProducts().length > 0) {
        <mat-card style="margin-bottom:16px; border-left: 4px solid #ff5722">
          <mat-card-header>
            <mat-icon mat-card-avatar style="color:#ff5722">warning</mat-icon>
            <mat-card-title>{{ lowStockProducts().length }} producto(s) con stock bajo</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @for (p of lowStockProducts(); track p.id) {
              <mat-chip color="warn">{{ p.name }} — Stock: {{ p.stock }}</mat-chip>
            }
          </mat-card-content>
        </mat-card>
      }

      <!-- Formulario nuevo/editar -->
      @if (showForm) {
        <mat-card style="margin-bottom:16px">
          <mat-card-header>
            <mat-card-title>
              {{ editingId ? 'Editar' : 'Nuevo' }}
              {{ productForm.get('type')?.value === 'service' ? 'Servicio' : 'Producto' }}
            </mat-card-title>
            @if (editingId) {
              <mat-card-subtitle style="color:#888; font-family:monospace">
                Código: {{ currentSystemCode }}
              </mat-card-subtitle>
            }
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="productForm" (ngSubmit)="saveProduct()">

              <!-- Tipo producto/servicio -->
              <div style="margin-bottom:16px">
                <label style="font-size:0.85rem;color:#666;margin-bottom:8px;display:block">Tipo</label>
                <mat-radio-group formControlName="type" style="display:flex;gap:24px">
                  <mat-radio-button value="product">
                    <mat-icon style="vertical-align:middle;font-size:18px">inventory_2</mat-icon>
                    Producto
                  </mat-radio-button>
                  <mat-radio-button value="service">
                    <mat-icon style="vertical-align:middle;font-size:18px">design_services</mat-icon>
                    Servicio
                  </mat-radio-button>
                </mat-radio-group>
              </div>

              <mat-divider style="margin-bottom:16px"></mat-divider>

              <!-- Campos básicos -->
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px">
                <mat-form-field appearance="outline">
                  <mat-label>Nombre *</mat-label>
                  <input matInput formControlName="name">
                  @if (productForm.get('name')?.hasError('required') && productForm.get('name')?.touched) {
                    <mat-error>Nombre requerido</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Código de barras (referencia, opcional)</mat-label>
                  <input matInput formControlName="barcode">
                  @if (lastScannedCode && !editingId) {
                    <mat-hint style="color:#3f51b5">Último escaneo: {{ lastScannedCode }}</mat-hint>
                  }
                  <mat-icon matSuffix>qr_code</mat-icon>
                </mat-form-field>

                <mat-form-field appearance="outline" style="grid-column:1/-1">
                  <mat-label>Descripción</mat-label>
                  <textarea matInput formControlName="description" rows="2"></textarea>
                </mat-form-field>

                <!-- Categoría con autocomplete -->
                <mat-form-field appearance="outline">
                  <mat-label>Categoría</mat-label>
                  <input matInput formControlName="category"
                    [matAutocomplete]="catAuto"
                    (input)="onCategoryInput($event)">
                  <mat-autocomplete #catAuto="matAutocomplete">
                    @for (cat of filteredCategories(); track cat.id) {
                      <mat-option [value]="cat.name">{{ cat.name }}</mat-option>
                    }
                  </mat-autocomplete>
                  <mat-icon matSuffix>category</mat-icon>
                </mat-form-field>

                <!-- Vendido por (solo productos) -->
                @if (productForm.get('type')?.value === 'product') {
                  <div>
                    <label style="font-size:0.85rem;color:#666;margin-bottom:8px;display:block">Vendido por</label>
                    <mat-radio-group formControlName="soldBy" style="display:flex;gap:16px">
                      <mat-radio-button value="unit">Unidad</mat-radio-button>
                      <mat-radio-button value="box">Caja</mat-radio-button>
                    </mat-radio-group>
                  </div>
                }
              </div>

              <!-- Precios (solo cuando no hay variantes) -->
              @if (optionGroups.length === 0) {
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; margin-bottom:8px">
                  <mat-form-field appearance="outline">
                    <mat-label>Costo (COP)</mat-label>
                    <input matInput type="number" formControlName="costPrice" min="0">
                    <mat-hint>Puede ser 0</mat-hint>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Precio de venta (COP)</mat-label>
                    <input matInput type="number" formControlName="salePrice" min="0">
                    <mat-hint>0 = se ingresa al vender</mat-hint>
                    @if (priceError()) {
                      <mat-error>El costo no puede superar el precio de venta</mat-error>
                    }
                  </mat-form-field>
                  <div style="display:flex;align-items:center;padding:8px 0">
                    <div style="background:#e8f5e9;border-radius:8px;padding:8px 12px;width:100%">
                      <div style="font-size:0.75rem;color:#666">Margen bruto</div>
                      <div style="font-size:1.2rem;font-weight:700;color:#388e3c">
                        {{ grossMargin() | number:'1.1-1' }}%
                      </div>
                    </div>
                  </div>
                </div>
              } @else {
                <div style="background:#f3e5f5;border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:0.85rem;color:#6a1b9a">
                  <mat-icon style="font-size:16px;vertical-align:middle;margin-right:4px">info</mat-icon>
                  Precio y costo del producto son reemplazados por los precios de cada variante
                </div>
              }

              <!-- Seguimiento de inventario (solo productos sin variantes) -->
              @if (productForm.get('type')?.value === 'product' && optionGroups.length === 0) {
                <div style="margin-bottom:16px">
                  <mat-slide-toggle formControlName="trackInventory" color="primary">
                    Seguir inventario
                  </mat-slide-toggle>
                </div>
              }

              <!-- Stock (solo si trackInventory, tipo producto, sin variantes) -->
              @if (productForm.get('type')?.value === 'product' && productForm.get('trackInventory')?.value && optionGroups.length === 0) {
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px">
                  <mat-form-field appearance="outline">
                    <mat-label>Stock inicial</mat-label>
                    <input matInput type="number" formControlName="stock" min="0">
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Stock mínimo (alerta)</mat-label>
                    <input matInput type="number" formControlName="minStock" min="0">
                  </mat-form-field>
                </div>
              }

              <mat-divider style="margin-bottom:16px"></mat-divider>

              <!-- SECCIÓN DE OPCIONES/VARIANTES -->
              <div style="margin-bottom:16px">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px">
                  <div>
                    <h4 style="margin:0;display:flex;align-items:center;gap:6px">
                      <mat-icon style="font-size:18px">tune</mat-icon>
                      Opciones / Variantes
                    </h4>
                    @if (optionGroups.length > 0) {
                      <small style="color:#7b1fa2">
                        {{ totalVariantValues() }} variante(s) en total
                      </small>
                    } @else {
                      <small style="color:#999">Sin variantes — aplica precio global del producto</small>
                    }
                  </div>
                  <button mat-stroked-button type="button" color="primary" (click)="addOptionGroup()">
                    <mat-icon>add</mat-icon> Nueva opción
                  </button>
                </div>

                @for (groupCtrl of optionGroups.controls; track groupCtrl; let gi = $index) {
                  <mat-card [formGroup]="asGroup(groupCtrl)"
                    style="margin-bottom:16px; border-left:3px solid #7b1fa2; background:#fafafa">
                    <mat-card-content style="padding:12px">

                      <!-- Nombre de la opción -->
                      <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px">
                        <mat-form-field appearance="outline" style="flex:1">
                          <mat-label>Nombre de la opción *</mat-label>
                          <input matInput formControlName="name"
                            placeholder="Ej: Color, Talla, Material, Marca">
                          @if (asGroup(groupCtrl).get('name')?.hasError('required') && asGroup(groupCtrl).get('name')?.touched) {
                            <mat-error>Nombre requerido</mat-error>
                          }
                        </mat-form-field>
                        <button mat-icon-button color="warn" type="button"
                          (click)="removeOptionGroup(gi)"
                          matTooltip="Eliminar esta opción y todos sus valores">
                          <mat-icon>delete</mat-icon>
                        </button>
                      </div>

                      <!-- Valores de la opción -->
                      @for (valCtrl of getValuesArray(groupCtrl).controls; track valCtrl; let vi = $index) {
                        <div style="background:#fff; border:1px solid #e0e0e0; border-radius:8px; padding:12px; margin-bottom:8px">
                          <div [formGroup]="asGroup(valCtrl)"
                            style="display:grid; grid-template-columns:1.2fr 1fr 1fr 1.2fr auto; gap:8px; align-items:flex-start">
                            <mat-form-field appearance="outline" style="font-size:0.9rem">
                              <mat-label>Valor *</mat-label>
                              <input matInput formControlName="value"
                                [placeholder]="'Ej: ' + (asGroup(groupCtrl).get('name')?.value || 'Rojo')">
                              @if (asGroup(valCtrl).get('value')?.hasError('required') && asGroup(valCtrl).get('value')?.touched) {
                                <mat-error>Requerido</mat-error>
                              }
                            </mat-form-field>
                            <mat-form-field appearance="outline" style="font-size:0.9rem">
                              <mat-label>Costo</mat-label>
                              <input matInput type="number" formControlName="costPrice" min="0">
                            </mat-form-field>
                            <mat-form-field appearance="outline" style="font-size:0.9rem">
                              <mat-label>Precio venta</mat-label>
                              <input matInput type="number" formControlName="salePrice" min="0">
                            </mat-form-field>
                            <mat-form-field appearance="outline" style="font-size:0.9rem">
                              <mat-label>Código de barras</mat-label>
                              <input matInput formControlName="barcode">
                              <mat-icon matSuffix style="font-size:16px">qr_code</mat-icon>
                            </mat-form-field>
                            <button mat-icon-button color="warn" type="button"
                              (click)="removeVariantValue(gi, vi)"
                              matTooltip="Eliminar este valor"
                              style="margin-top:4px">
                              <mat-icon>delete</mat-icon>
                            </button>
                          </div>

                          <!-- Stock e info del valor -->
                          <div [formGroup]="asGroup(valCtrl)"
                            style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-top:4px; align-items:center">
                            <mat-form-field appearance="outline" style="font-size:0.85rem">
                              <mat-label>Stock</mat-label>
                              <input matInput type="number" formControlName="stock" min="0">
                            </mat-form-field>
                            <mat-form-field appearance="outline" style="font-size:0.85rem">
                              <mat-label>Stock mínimo</mat-label>
                              <input matInput type="number" formControlName="minStock" min="0">
                            </mat-form-field>
                            <div style="padding:4px 8px">
                              <div style="font-size:0.75rem; color:#388e3c; font-weight:600">
                                Margen: {{ variantValueMargin(gi, vi) | number:'1.1-1' }}%
                              </div>
                              @if (asGroup(valCtrl).get('systemCode')?.value) {
                                <div style="font-size:0.72rem; color:#888; margin-top:2px">
                                  Código:
                                  <code style="background:#f5f5f5; padding:1px 5px; border-radius:3px">
                                    {{ asGroup(valCtrl).get('systemCode')?.value }}
                                  </code>
                                </div>
                              }
                            </div>
                          </div>
                        </div>
                      }

                      <!-- Botón agregar valor -->
                      <button mat-stroked-button type="button" style="width:100%; margin-top:4px"
                        (click)="addVariantValue(gi)">
                        <mat-icon>add</mat-icon>
                        Agregar valor
                        @if (asGroup(groupCtrl).get('name')?.value) {
                          a "{{ asGroup(groupCtrl).get('name')?.value }}"
                        }
                      </button>
                    </mat-card-content>
                  </mat-card>
                }
              </div>

              <!-- Botones acción -->
              <div style="display:flex; gap:8px; flex-wrap:wrap">
                <button mat-raised-button color="primary" type="submit"
                  [disabled]="productForm.invalid || saving || (optionGroups.length === 0 && priceError())">
                  @if (saving) {
                    <mat-spinner diameter="20" style="margin:auto"></mat-spinner>
                  } @else {
                    {{ editingId ? 'Actualizar' : 'Crear' }}
                  }
                </button>
                <button mat-stroked-button type="button" (click)="cancelForm()">Cancelar</button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>
      }

      <!-- Tabla de productos/servicios -->
      <mat-card>
        <mat-card-header>
          <mat-card-title>{{ products().length }} ítems activos</mat-card-title>
          <span style="flex:1"></span>
          <mat-form-field appearance="outline" style="font-size:0.9rem; max-width:260px">
            <input matInput [(ngModel)]="filterText" placeholder="Buscar por nombre o código...">
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>
        </mat-card-header>
        <mat-card-content>
          @if (loading()) {
            <div style="text-align:center;padding:32px">
              <mat-spinner diameter="40" style="margin:auto"></mat-spinner>
            </div>
          } @else {
            <table mat-table [dataSource]="filteredProducts()" style="width:100%">
              <ng-container matColumnDef="systemCode">
                <th mat-header-cell *matHeaderCellDef>Código</th>
                <td mat-cell *matCellDef="let p">
                  <code style="font-size:0.8rem;background:#f5f5f5;padding:2px 6px;border-radius:4px">
                    {{ p.systemCode }}
                  </code>
                </td>
              </ng-container>
              <ng-container matColumnDef="type">
                <th mat-header-cell *matHeaderCellDef>Tipo</th>
                <td mat-cell *matCellDef="let p">
                  <span [style.color]="p.type === 'service' ? '#7b1fa2' : '#1565c0'"
                        style="font-size:0.8rem;font-weight:500">
                    <mat-icon style="font-size:14px;vertical-align:middle">
                      {{ p.type === 'service' ? 'design_services' : 'inventory_2' }}
                    </mat-icon>
                    {{ p.type === 'service' ? 'Servicio' : 'Producto' }}
                  </span>
                </td>
              </ng-container>
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Nombre</th>
                <td mat-cell *matCellDef="let p">
                  <div>{{ p.name }}</div>
                  @if (p.category) {
                    <div style="font-size:0.75rem;color:#888">{{ p.category }}</div>
                  }
                </td>
              </ng-container>
              <ng-container matColumnDef="salePrice">
                <th mat-header-cell *matHeaderCellDef>Precio</th>
                <td mat-cell *matCellDef="let p">
                  @if (p.variants && p.variants.length > 0) {
                    <span style="color:#7b1fa2;font-size:0.8rem;font-weight:500">
                      <mat-icon style="font-size:14px;vertical-align:middle">tune</mat-icon>
                      {{ p.variants.length }} variante(s)
                    </span>
                  } @else if (!p.salePrice || +p.salePrice === 0) {
                    <span style="color:#ff9800;font-size:0.8rem">Sin precio fijo</span>
                  } @else {
                    {{ p.salePrice | currency:'COP':'symbol':'1.0-0' }}
                  }
                </td>
              </ng-container>
              <ng-container matColumnDef="margin">
                <th mat-header-cell *matHeaderCellDef>Margen</th>
                <td mat-cell *matCellDef="let p">
                  @if (p.variants && p.variants.length > 0) {
                    <span style="color:#888;font-size:0.8rem">—</span>
                  } @else if (!p.salePrice || +p.salePrice === 0) {
                    <span style="color:#888;font-size:0.8rem">—</span>
                  } @else {
                    <span [style.color]="calcMargin(p) >= 20 ? '#388e3c' : '#f57c00'">
                      {{ calcMargin(p) | number:'1.1-1' }}%
                    </span>
                  }
                </td>
              </ng-container>
              <ng-container matColumnDef="stock">
                <th mat-header-cell *matHeaderCellDef>Stock</th>
                <td mat-cell *matCellDef="let p">
                  @if (p.variants && p.variants.length > 0) {
                    <span style="color:#888;font-size:0.8rem">Por variante</span>
                  } @else if (!p.trackInventory || p.type === 'service') {
                    <span style="color:#888;font-size:0.8rem">N/A</span>
                  } @else {
                    <span [style.color]="p.stock <= p.minStock ? '#f44336' : 'inherit'">
                      {{ p.stock }}
                      @if (p.stock <= p.minStock) {
                        <mat-icon style="font-size:14px;vertical-align:middle;color:#f44336">warning</mat-icon>
                      }
                    </span>
                  }
                </td>
              </ng-container>
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let p">
                  <button mat-icon-button (click)="editProduct(p)" matTooltip="Editar">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button color="warn" (click)="deleteProduct(p.id)" matTooltip="Eliminar">
                    <mat-icon>delete</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
            @if (filteredProducts().length === 0) {
              <p style="text-align:center;color:#888;padding:24px">No se encontraron ítems</p>
            }
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class InventoryComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);
  readonly scanner = inject(ScannerService);

  private scanSub?: Subscription;
  private categorySearch$ = new Subject<string>();
  private categorySub?: Subscription;

  products = signal<Product[]>([]);
  lowStockProducts = signal<Product[]>([]);
  allCategories = signal<Category[]>([]);
  filteredCategories = signal<Category[]>([]);
  loading = signal(true);

  filterText = '';
  saving = false;
  showForm = false;
  editingId: string | null = null;
  currentSystemCode = '';
  lastScannedCode: string | null = null;
  displayedColumns = ['systemCode', 'type', 'name', 'salePrice', 'margin', 'stock', 'actions'];

  productForm = this.fb.group({
    type: ['product'],
    barcode: [''],
    name: ['', Validators.required],
    description: [''],
    category: [''],
    costPrice: [0, [Validators.min(0)]],
    salePrice: [0, [Validators.min(0)]],
    soldBy: ['unit'],
    trackInventory: [true],
    stock: [0, [Validators.min(0)]],
    minStock: [5, [Validators.min(0)]],
    optionGroups: this.fb.array([]),
  });

  private readonly _formVals = toSignal(this.productForm.valueChanges, {
    initialValue: this.productForm.value,
  });

  grossMargin = computed(() => {
    const v = this._formVals();
    return this.calcMarginValues(Number(v?.costPrice ?? 0), Number(v?.salePrice ?? 0));
  });

  priceError = computed(() => {
    const v = this._formVals();
    const cost = Number(v?.costPrice ?? 0);
    const sale = Number(v?.salePrice ?? 0);
    return sale > 0 && cost > sale;
  });

  filteredProducts = computed(() => {
    const q = this.filterText.toLowerCase();
    return q
      ? this.products().filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.systemCode ?? '').toLowerCase().includes(q) ||
            (p.barcode ?? '').includes(q),
        )
      : this.products();
  });

  get optionGroups(): FormArray {
    return this.productForm.get('optionGroups') as FormArray;
  }

  asGroup(ctrl: AbstractControl): FormGroup {
    return ctrl as FormGroup;
  }

  getValuesArray(groupCtrl: AbstractControl): FormArray {
    return (groupCtrl as FormGroup).get('values') as FormArray;
  }

  totalVariantValues(): number {
    return this.optionGroups.controls.reduce(
      (sum, g) => sum + this.getValuesArray(g).length, 0
    );
  }

  private makeValueControl(initial?: {
    id?: string; systemCode?: string; value?: string;
    costPrice?: number; salePrice?: number; barcode?: string;
    stock?: number; minStock?: number;
  }): FormGroup {
    return this.fb.group({
      id: [initial?.id ?? ''],
      systemCode: [initial?.systemCode ?? ''],
      value: [initial?.value ?? '', Validators.required],
      costPrice: [initial?.costPrice ?? 0, Validators.min(0)],
      salePrice: [initial?.salePrice ?? 0, Validators.min(0)],
      barcode: [initial?.barcode ?? ''],
      stock: [initial?.stock ?? 0, Validators.min(0)],
      minStock: [initial?.minStock ?? 0, Validators.min(0)],
    });
  }

  ngOnInit() {
    this.loadProducts();
    this.loadCategories();
    this.scanSub = this.scanner.barcode$.subscribe((code) => {
      this.lastScannedCode = code;
      if (this.showForm && !this.editingId) {
        this.productForm.patchValue({ barcode: code });
      }
    });
    this.categorySub = this.categorySearch$
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((q) => {
        if (!q) {
          this.filteredCategories.set(this.allCategories());
        } else {
          const lower = q.toLowerCase();
          this.filteredCategories.set(
            this.allCategories().filter((c) => c.name.toLowerCase().includes(lower)),
          );
        }
      });
  }

  ngOnDestroy() {
    this.scanSub?.unsubscribe();
    this.categorySub?.unsubscribe();
  }

  onCategoryInput(event: Event) {
    this.categorySearch$.next((event.target as HTMLInputElement).value);
  }

  loadProducts() {
    this.loading.set(true);
    this.api.getProducts().subscribe({
      next: (products) => {
        this.products.set(products);
        this.loading.set(false);
        this.lowStockProducts.set(
          products.filter((p) => p.trackInventory && p.type === 'product' && p.stock <= p.minStock),
        );
      },
      error: () => this.loading.set(false),
    });
  }

  loadCategories() {
    this.api.getCategories().subscribe({
      next: (cats) => {
        this.allCategories.set(cats);
        this.filteredCategories.set(cats);
      },
    });
  }

  openNewForm(type: 'product' | 'service') {
    this.editingId = null;
    this.currentSystemCode = '';
    this.showForm = true;
    this.optionGroups.clear();
    this.productForm.reset({
      type,
      barcode: '',
      name: '',
      description: '',
      category: '',
      costPrice: 0,
      salePrice: 0,
      soldBy: 'unit',
      trackInventory: type === 'product',
      stock: 0,
      minStock: 5,
    });
    this.filteredCategories.set(this.allCategories());
  }

  editProduct(p: Product) {
    this.editingId = p.id;
    this.currentSystemCode = p.systemCode ?? '';
    this.showForm = true;
    this.optionGroups.clear();
    this.productForm.reset({
      type: p.type,
      barcode: p.barcode ?? '',
      name: p.name,
      description: p.description ?? '',
      category: p.category ?? '',
      costPrice: p.costPrice,
      salePrice: p.salePrice,
      soldBy: p.soldBy,
      trackInventory: p.trackInventory,
      stock: p.stock,
      minStock: p.minStock,
    });

    if (p.variants && p.variants.length > 0) {
      const groups = new Map<string, typeof p.variants>();
      for (const v of p.variants) {
        if (!groups.has(v.optionName)) groups.set(v.optionName, []);
        groups.get(v.optionName)!.push(v);
      }
      for (const [name, vals] of groups) {
        const valuesArray = this.fb.array(
          vals.map((v) => this.makeValueControl({
            id: v.id,
            systemCode: v.systemCode,
            value: v.optionValue,
            costPrice: Number(v.costPrice),
            salePrice: Number(v.salePrice),
            barcode: v.barcode,
            stock: v.stock ?? 0,
            minStock: v.minStock ?? 0,
          }))
        );
        this.optionGroups.push(this.fb.group({
          name: [name, Validators.required],
          values: valuesArray,
        }));
      }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelForm() {
    this.showForm = false;
    this.editingId = null;
    this.optionGroups.clear();
  }

  addOptionGroup() {
    this.optionGroups.push(this.fb.group({
      name: ['', Validators.required],
      values: this.fb.array([this.makeValueControl()]),
    }));
  }

  removeOptionGroup(gi: number) {
    this.optionGroups.removeAt(gi);
  }

  addVariantValue(gi: number) {
    this.getValuesArray(this.optionGroups.at(gi)).push(this.makeValueControl());
  }

  removeVariantValue(gi: number, vi: number) {
    this.getValuesArray(this.optionGroups.at(gi)).removeAt(vi);
  }

  variantValueMargin(gi: number, vi: number): number {
    const valCtrl = this.getValuesArray(this.optionGroups.at(gi)).at(vi);
    const cost = Number(valCtrl.get('costPrice')?.value ?? 0);
    const sale = Number(valCtrl.get('salePrice')?.value ?? 0);
    return this.calcMarginValues(cost, sale);
  }

  saveProduct() {
    if (this.productForm.invalid) return;
    if (this.optionGroups.length === 0 && this.priceError()) return;
    this.saving = true;

    const val = this.productForm.value;
    const hasVariants = this.optionGroups.length > 0;

    const flatVariants = this.optionGroups.controls
      .filter((g) => {
        const vals = this.getValuesArray(g);
        return (g as FormGroup).get('name')?.value?.trim() && vals.length > 0;
      })
      .flatMap((g) => {
        const groupName = (g as FormGroup).get('name')?.value;
        return this.getValuesArray(g).controls.map((valCtrl) => {
          const v = valCtrl.value;
          return {
            optionName: groupName,
            optionValue: v.value,
            costPrice: v.costPrice ?? 0,
            salePrice: v.salePrice ?? 0,
            barcode: v.barcode || undefined,
            stock: v.stock ?? 0,
            minStock: v.minStock ?? 0,
          };
        });
      });

    const dto: any = {
      type: val.type,
      barcode: val.barcode || undefined,
      name: val.name,
      description: val.description || undefined,
      category: val.category || undefined,
      costPrice: hasVariants ? 0 : (val.costPrice ?? 0),
      salePrice: hasVariants ? 0 : (val.salePrice ?? 0),
      soldBy: val.soldBy,
      trackInventory: hasVariants ? false : (val.type === 'service' ? false : val.trackInventory),
      stock: hasVariants ? 0 : (val.type === 'service' ? 0 : (val.trackInventory ? val.stock : 0)),
      minStock: hasVariants ? 0 : (val.type === 'service' ? 0 : (val.trackInventory ? val.minStock : 0)),
      variants: flatVariants,
    };

    const obs = this.editingId
      ? this.api.updateProduct(this.editingId, dto)
      : this.api.createProduct(dto);

    obs.subscribe({
      next: () => {
        this.saving = false;
        this.showForm = false;
        this.editingId = null;
        this.optionGroups.clear();
        this.loadProducts();
        this.snack.open('Guardado correctamente', '', { duration: 2500 });
      },
      error: (e) => {
        this.saving = false;
        const msg = e.error?.message || 'Error al guardar';
        this.snack.open(Array.isArray(msg) ? msg.join(', ') : msg, '', { duration: 4000 });
      },
    });
  }

  deleteProduct(id: string) {
    if (!confirm('¿Eliminar este ítem del inventario?')) return;
    this.api.deleteProduct(id).subscribe({
      next: () => { this.loadProducts(); this.snack.open('Eliminado', '', { duration: 2000 }); },
      error: () => this.snack.open('Error al eliminar', '', { duration: 3000 }),
    });
  }

  calcMargin(p: Product): number {
    const sale = Number(p.salePrice);
    if (!sale || sale <= 0) return 0;
    return this.calcMarginValues(Number(p.costPrice), sale);
  }

  private calcMarginValues(cost: number, sale: number): number {
    if (!sale || sale <= 0) return 0;
    return ((sale - cost) / sale) * 100;
  }
}
