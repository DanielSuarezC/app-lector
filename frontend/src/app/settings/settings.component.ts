import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';

import { ApiService } from '../services/api.service';
import { Category, PaymentMethod } from '../models/product.model';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatInputModule,
    MatFormFieldModule, MatTableModule, MatTabsModule, MatSnackBarModule,
    MatProgressSpinnerModule, MatTooltipModule, MatDividerModule,
  ],
  template: `
    <div class="page-container">
      <h2 style="margin-bottom:16px">
        <mat-icon style="vertical-align:middle;margin-right:8px">settings</mat-icon>
        Configuración del Sistema
      </h2>

      <mat-tab-group>
        <!-- TAB CATEGORÍAS -->
        <mat-tab label="Categorías">
          <div style="padding:16px">
            <mat-card style="margin-bottom:16px">
              <mat-card-header>
                <mat-card-title>{{ editingCatId ? 'Editar Categoría' : 'Nueva Categoría' }}</mat-card-title>
              </mat-card-header>
              <mat-card-content style="padding-top:12px">
                <form [formGroup]="catForm" (ngSubmit)="saveCategory()"
                  style="display:flex; gap:12px; align-items:flex-start; flex-wrap:wrap">
                  <mat-form-field appearance="outline" style="flex:1; min-width:200px">
                    <mat-label>Nombre</mat-label>
                    <input matInput formControlName="name" placeholder="Ej: Lapiceros">
                    @if (catForm.get('name')?.hasError('required') && catForm.get('name')?.touched) {
                      <mat-error>El nombre es requerido</mat-error>
                    }
                  </mat-form-field>
                  <mat-form-field appearance="outline" style="flex:2; min-width:250px">
                    <mat-label>Descripción (opcional)</mat-label>
                    <input matInput formControlName="description">
                  </mat-form-field>
                  <div style="display:flex; gap:8px; padding-top:4px">
                    <button mat-raised-button color="primary" type="submit"
                      [disabled]="catForm.invalid || savingCat">
                      @if (savingCat) { <mat-spinner diameter="20" style="margin:auto"></mat-spinner> }
                      @else { {{ editingCatId ? 'Actualizar' : 'Agregar' }} }
                    </button>
                    @if (editingCatId) {
                      <button mat-stroked-button type="button" (click)="cancelCatEdit()">Cancelar</button>
                    }
                  </div>
                </form>
              </mat-card-content>
            </mat-card>

            <mat-card>
              <mat-card-header>
                <mat-card-title>{{ categories().length }} categorías</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                @if (loadingCats()) {
                  <div style="text-align:center;padding:24px">
                    <mat-spinner diameter="36" style="margin:auto"></mat-spinner>
                  </div>
                } @else if (categories().length === 0) {
                  <p style="color:#888;text-align:center;padding:24px">No hay categorías. Agrega la primera.</p>
                } @else {
                  <table mat-table [dataSource]="categories()" style="width:100%">
                    <ng-container matColumnDef="name">
                      <th mat-header-cell *matHeaderCellDef>Nombre</th>
                      <td mat-cell *matCellDef="let c">{{ c.name }}</td>
                    </ng-container>
                    <ng-container matColumnDef="description">
                      <th mat-header-cell *matHeaderCellDef>Descripción</th>
                      <td mat-cell *matCellDef="let c" style="color:#666">{{ c.description || '—' }}</td>
                    </ng-container>
                    <ng-container matColumnDef="actions">
                      <th mat-header-cell *matHeaderCellDef></th>
                      <td mat-cell *matCellDef="let c">
                        <button mat-icon-button (click)="editCategory(c)" matTooltip="Editar">
                          <mat-icon>edit</mat-icon>
                        </button>
                        <button mat-icon-button color="warn" (click)="deleteCategory(c.id)" matTooltip="Eliminar">
                          <mat-icon>delete</mat-icon>
                        </button>
                      </td>
                    </ng-container>
                    <tr mat-header-row *matHeaderRowDef="catColumns"></tr>
                    <tr mat-row *matRowDef="let r; columns: catColumns;"></tr>
                  </table>
                }
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <!-- TAB MEDIOS DE PAGO -->
        <mat-tab label="Medios de Pago">
          <div style="padding:16px">
            <mat-card style="margin-bottom:16px">
              <mat-card-header>
                <mat-card-title>{{ editingPmId ? 'Editar Medio de Pago' : 'Nuevo Medio de Pago' }}</mat-card-title>
              </mat-card-header>
              <mat-card-content style="padding-top:12px">
                <form [formGroup]="pmForm" (ngSubmit)="savePaymentMethod()"
                  style="display:flex; gap:12px; align-items:flex-start; flex-wrap:wrap">
                  <mat-form-field appearance="outline" style="flex:1; min-width:180px">
                    <mat-label>Nombre</mat-label>
                    <input matInput formControlName="name" placeholder="Ej: Daviplata">
                  </mat-form-field>
                  <mat-form-field appearance="outline" style="flex:1; min-width:180px">
                    <mat-label>Clave interna</mat-label>
                    <input matInput formControlName="key" placeholder="Ej: daviplata">
                    <mat-hint>Minúsculas, sin espacios</mat-hint>
                  </mat-form-field>
                  <div style="display:flex; gap:8px; padding-top:4px">
                    <button mat-raised-button color="primary" type="submit"
                      [disabled]="pmForm.invalid || savingPm">
                      @if (savingPm) { <mat-spinner diameter="20" style="margin:auto"></mat-spinner> }
                      @else { {{ editingPmId ? 'Actualizar' : 'Agregar' }} }
                    </button>
                    @if (editingPmId) {
                      <button mat-stroked-button type="button" (click)="cancelPmEdit()">Cancelar</button>
                    }
                  </div>
                </form>
              </mat-card-content>
            </mat-card>

            <mat-card>
              <mat-card-header>
                <mat-card-title>{{ paymentMethods().length }} medios de pago</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                @if (loadingPm()) {
                  <div style="text-align:center;padding:24px">
                    <mat-spinner diameter="36" style="margin:auto"></mat-spinner>
                  </div>
                } @else if (paymentMethods().length === 0) {
                  <p style="color:#888;text-align:center;padding:24px">No hay medios de pago configurados.</p>
                } @else {
                  <table mat-table [dataSource]="paymentMethods()" style="width:100%">
                    <ng-container matColumnDef="name">
                      <th mat-header-cell *matHeaderCellDef>Nombre</th>
                      <td mat-cell *matCellDef="let p">{{ p.name }}</td>
                    </ng-container>
                    <ng-container matColumnDef="key">
                      <th mat-header-cell *matHeaderCellDef>Clave</th>
                      <td mat-cell *matCellDef="let p">
                        <code style="background:#f5f5f5;padding:2px 6px;border-radius:4px">{{ p.key }}</code>
                      </td>
                    </ng-container>
                    <ng-container matColumnDef="actions">
                      <th mat-header-cell *matHeaderCellDef></th>
                      <td mat-cell *matCellDef="let p">
                        <button mat-icon-button (click)="editPaymentMethod(p)" matTooltip="Editar">
                          <mat-icon>edit</mat-icon>
                        </button>
                        <button mat-icon-button color="warn" (click)="deletePaymentMethod(p.id)" matTooltip="Eliminar">
                          <mat-icon>delete</mat-icon>
                        </button>
                      </td>
                    </ng-container>
                    <tr mat-header-row *matHeaderRowDef="pmColumns"></tr>
                    <tr mat-row *matRowDef="let r; columns: pmColumns;"></tr>
                  </table>
                }
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
})
export class SettingsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  categories = signal<Category[]>([]);
  paymentMethods = signal<PaymentMethod[]>([]);
  loadingCats = signal(true);
  loadingPm = signal(true);
  savingCat = false;
  savingPm = false;
  editingCatId: string | null = null;
  editingPmId: string | null = null;

  catColumns = ['name', 'description', 'actions'];
  pmColumns = ['name', 'key', 'actions'];

  catForm = this.fb.group({
    name: ['', Validators.required],
    description: [''],
  });

  pmForm = this.fb.group({
    name: ['', Validators.required],
    key: ['', [Validators.required, Validators.pattern(/^[a-z0-9_-]+$/)]],
  });

  ngOnInit() {
    this.loadCategories();
    this.loadPaymentMethods();
  }

  loadCategories() {
    this.loadingCats.set(true);
    this.api.getCategories().subscribe({
      next: (cats) => { this.categories.set(cats); this.loadingCats.set(false); },
      error: () => this.loadingCats.set(false),
    });
  }

  loadPaymentMethods() {
    this.loadingPm.set(true);
    this.api.getPaymentMethods().subscribe({
      next: (pms) => { this.paymentMethods.set(pms); this.loadingPm.set(false); },
      error: () => this.loadingPm.set(false),
    });
  }

  saveCategory() {
    if (this.catForm.invalid) return;
    this.savingCat = true;
    const dto = { name: this.catForm.value.name!, description: this.catForm.value.description || undefined };
    const obs = this.editingCatId
      ? this.api.updateCategory(this.editingCatId, dto)
      : this.api.createCategory(dto);
    obs.subscribe({
      next: () => {
        this.savingCat = false;
        this.catForm.reset();
        this.editingCatId = null;
        this.loadCategories();
        this.snack.open('Categoría guardada', '', { duration: 2000 });
      },
      error: (e) => {
        this.savingCat = false;
        this.snack.open(e.error?.message || 'Error al guardar', '', { duration: 3000 });
      },
    });
  }

  editCategory(cat: Category) {
    this.editingCatId = cat.id;
    this.catForm.setValue({ name: cat.name, description: cat.description || '' });
  }

  cancelCatEdit() {
    this.editingCatId = null;
    this.catForm.reset();
  }

  deleteCategory(id: string) {
    if (!confirm('¿Eliminar esta categoría?')) return;
    this.api.deleteCategory(id).subscribe({
      next: () => { this.loadCategories(); this.snack.open('Categoría eliminada', '', { duration: 2000 }); },
      error: () => this.snack.open('Error al eliminar', '', { duration: 3000 }),
    });
  }

  savePaymentMethod() {
    if (this.pmForm.invalid) return;
    this.savingPm = true;
    const dto = { name: this.pmForm.value.name!, key: this.pmForm.value.key! };
    const obs = this.editingPmId
      ? this.api.updatePaymentMethod(this.editingPmId, dto)
      : this.api.createPaymentMethod(dto);
    obs.subscribe({
      next: () => {
        this.savingPm = false;
        this.pmForm.reset();
        this.editingPmId = null;
        this.loadPaymentMethods();
        this.snack.open('Medio de pago guardado', '', { duration: 2000 });
      },
      error: (e) => {
        this.savingPm = false;
        this.snack.open(e.error?.message || 'Error al guardar', '', { duration: 3000 });
      },
    });
  }

  editPaymentMethod(pm: PaymentMethod) {
    this.editingPmId = pm.id;
    this.pmForm.setValue({ name: pm.name, key: pm.key });
  }

  cancelPmEdit() {
    this.editingPmId = null;
    this.pmForm.reset();
  }

  deletePaymentMethod(id: string) {
    if (!confirm('¿Eliminar este medio de pago?')) return;
    this.api.deletePaymentMethod(id).subscribe({
      next: () => { this.loadPaymentMethods(); this.snack.open('Eliminado', '', { duration: 2000 }); },
      error: () => this.snack.open('Error al eliminar', '', { duration: 3000 }),
    });
  }
}
