import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';

import { ApiService } from '../services/api.service';
import { Product } from '../models/product.model';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, CurrencyPipe,
    MatCardModule, MatButtonModule, MatIconModule, MatInputModule,
    MatFormFieldModule, MatTableModule, MatChipsModule, MatDialogModule,
    MatSnackBarModule, MatProgressSpinnerModule, MatTooltipModule, MatBadgeModule,
  ],
  template: `
    <div class="page-container">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px">
        <h2>
          <mat-icon style="vertical-align:middle; margin-right:8px">inventory_2</mat-icon>
          Inventario
        </h2>
        <button mat-raised-button color="primary" (click)="showForm = !showForm">
          <mat-icon>add</mat-icon> Nuevo Producto
        </button>
      </div>

      <!-- Alertas de bajo stock -->
      @if (lowStockProducts.length > 0) {
        <mat-card style="margin-bottom:16px; border-left: 4px solid #ff5722">
          <mat-card-header>
            <mat-icon mat-card-avatar style="color:#ff5722">warning</mat-icon>
            <mat-card-title>{{ lowStockProducts.length }} producto(s) con stock bajo</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @for (p of lowStockProducts; track p.id) {
              <mat-chip color="warn">{{ p.name }} — Stock: {{ p.stock }}</mat-chip>
            }
          </mat-card-content>
        </mat-card>
      }

      <!-- Formulario nuevo producto -->
      @if (showForm) {
        <mat-card style="margin-bottom:16px">
          <mat-card-header>
            <mat-card-title>{{ editingId ? 'Editar' : 'Nuevo' }} Producto</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="productForm" (ngSubmit)="saveProduct()"
              style="display:grid; grid-template-columns:1fr 1fr; gap:16px">
              <mat-form-field appearance="outline">
                <mat-label>Código de barras</mat-label>
                <input matInput formControlName="barcode">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Nombre del producto</mat-label>
                <input matInput formControlName="name">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Categoría</mat-label>
                <input matInput formControlName="category">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Precio de costo (COP)</mat-label>
                <input matInput type="number" formControlName="costPrice">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Precio de venta (COP)</mat-label>
                <input matInput type="number" formControlName="salePrice">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Stock inicial</mat-label>
                <input matInput type="number" formControlName="stock">
              </mat-form-field>
              <div style="grid-column:1/-1; display:flex; gap:8px">
                <button mat-raised-button color="primary" type="submit"
                  [disabled]="productForm.invalid || saving">
                  {{ editingId ? 'Actualizar' : 'Crear' }}
                </button>
                <button mat-stroked-button type="button" (click)="cancelForm()">Cancelar</button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>
      }

      <!-- Tabla de productos -->
      <mat-card>
        <mat-card-header>
          <mat-card-title>{{ products.length }} productos activos</mat-card-title>
          <span style="flex:1"></span>
          <mat-form-field appearance="outline" style="font-size:0.9rem">
            <input matInput [(ngModel)]="filterText" placeholder="Filtrar...">
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>
        </mat-card-header>
        <mat-card-content>
          @if (loading) {
            <div style="text-align:center;padding:32px">
              <mat-spinner diameter="40" style="margin:auto"></mat-spinner>
            </div>
          } @else {
            <table mat-table [dataSource]="filteredProducts" style="width:100%">
              <ng-container matColumnDef="barcode">
                <th mat-header-cell *matHeaderCellDef>Código</th>
                <td mat-cell *matCellDef="let p">{{ p.barcode }}</td>
              </ng-container>
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Nombre</th>
                <td mat-cell *matCellDef="let p">{{ p.name }}</td>
              </ng-container>
              <ng-container matColumnDef="category">
                <th mat-header-cell *matHeaderCellDef>Categoría</th>
                <td mat-cell *matCellDef="let p">{{ p.category }}</td>
              </ng-container>
              <ng-container matColumnDef="salePrice">
                <th mat-header-cell *matHeaderCellDef>Precio</th>
                <td mat-cell *matCellDef="let p">{{ p.salePrice | currency:'COP':'symbol':'1.0-0' }}</td>
              </ng-container>
              <ng-container matColumnDef="stock">
                <th mat-header-cell *matHeaderCellDef>Stock</th>
                <td mat-cell *matCellDef="let p">
                  <span [style.color]="p.stock <= p.minStock ? '#f44336' : 'inherit'">
                    {{ p.stock }}
                    @if (p.stock <= p.minStock) {
                      <mat-icon style="font-size:14px;vertical-align:middle;color:#f44336">warning</mat-icon>
                    }
                  </span>
                </td>
              </ng-container>
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Acciones</th>
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
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class InventoryComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  products: Product[] = [];
  lowStockProducts: Product[] = [];
  filterText = '';
  loading = true;
  saving = false;
  showForm = false;
  editingId: string | null = null;
  displayedColumns = ['barcode', 'name', 'category', 'salePrice', 'stock', 'actions'];

  productForm = this.fb.group({
    barcode: ['', Validators.required],
    name: ['', Validators.required],
    category: [''],
    costPrice: [0, [Validators.required, Validators.min(0)]],
    salePrice: [0, [Validators.required, Validators.min(1)]],
    stock: [0, Validators.min(0)],
  });

  get filteredProducts(): Product[] {
    const q = this.filterText.toLowerCase();
    return q
      ? this.products.filter((p) => p.name.toLowerCase().includes(q) || p.barcode.includes(q))
      : this.products;
  }

  ngOnInit() {
    this.loadProducts();
  }

  loadProducts() {
    this.loading = true;
    this.api.getProducts().subscribe({
      next: (products) => { this.products = products; this.loading = false; },
      error: () => { this.snack.open('Error al cargar productos', 'Cerrar', { duration: 3000 }); this.loading = false; },
    });
    this.api.getLowStock().subscribe({
      next: (products) => { this.lowStockProducts = products; },
    });
  }

  editProduct(product: Product) {
    this.editingId = product.id;
    this.productForm.patchValue(product);
    this.showForm = true;
  }

  cancelForm() {
    this.showForm = false;
    this.editingId = null;
    this.productForm.reset({ costPrice: 0, salePrice: 0, stock: 0 });
  }

  saveProduct() {
    if (this.productForm.invalid) { return; }
    this.saving = true;
    const dto = this.productForm.value as Parameters<typeof this.api.createProduct>[0];

    const req = this.editingId
      ? this.api.updateProduct(this.editingId, dto)
      : this.api.createProduct(dto);

    req.subscribe({
      next: () => {
        this.snack.open('Producto guardado', 'OK', { duration: 2500 });
        this.cancelForm();
        this.loadProducts();
        this.saving = false;
      },
      error: (err) => {
        this.snack.open(err?.error?.message || 'Error al guardar', 'Cerrar', { duration: 4000 });
        this.saving = false;
      },
    });
  }

  deleteProduct(id: string) {
    if (!confirm('¿Eliminar este producto?')) { return; }
    this.api.deleteProduct(id).subscribe({
      next: () => { this.snack.open('Producto eliminado', 'OK', { duration: 2500 }); this.loadProducts(); },
      error: () => this.snack.open('Error al eliminar', 'Cerrar', { duration: 3000 }),
    });
  }
}
