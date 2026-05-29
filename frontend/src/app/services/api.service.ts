import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  Product, CreateProductDto, Sale, CreateSaleDto, DailySummary,
  ScannerEvent, Category, PaymentMethod, SalesSummary,
} from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  // Products
  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.base}/products`);
  }

  getLowStock(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.base}/products/low-stock`);
  }

  getProductByBarcode(barcode: string): Observable<Product> {
    return this.http.get<Product>(`${this.base}/products/barcode/${barcode}`);
  }

  getProductBySystemCode(code: string): Observable<Product> {
    return this.http.get<Product>(`${this.base}/products/code/${code}`);
  }

  searchProducts(query: string): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.base}/products/search`, {
      params: { q: query },
    });
  }

  generateBarcode(id: string): Observable<Product> {
    return this.http.post<Product>(`${this.base}/products/${id}/generate-barcode`, {});
  }

  createProduct(dto: CreateProductDto): Observable<Product> {
    return this.http.post<Product>(`${this.base}/products`, dto);
  }

  updateProduct(id: string, dto: Partial<CreateProductDto>): Observable<Product> {
    return this.http.put<Product>(`${this.base}/products/${id}`, dto);
  }

  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/products/${id}`);
  }

  // Categories
  getCategories(q?: string): Observable<Category[]> {
    let params = new HttpParams();
    if (q) params = params.set('q', q);
    return this.http.get<Category[]>(`${this.base}/categories`, { params });
  }

  createCategory(dto: { name: string; description?: string }): Observable<Category> {
    return this.http.post<Category>(`${this.base}/categories`, dto);
  }

  updateCategory(id: string, dto: { name?: string; description?: string }): Observable<Category> {
    return this.http.put<Category>(`${this.base}/categories/${id}`, dto);
  }

  deleteCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/categories/${id}`);
  }

  // Payment Methods
  getPaymentMethods(): Observable<PaymentMethod[]> {
    return this.http.get<PaymentMethod[]>(`${this.base}/payment-methods`);
  }

  createPaymentMethod(dto: { name: string; key: string }): Observable<PaymentMethod> {
    return this.http.post<PaymentMethod>(`${this.base}/payment-methods`, dto);
  }

  updatePaymentMethod(id: string, dto: { name?: string; key?: string }): Observable<PaymentMethod> {
    return this.http.put<PaymentMethod>(`${this.base}/payment-methods/${id}`, dto);
  }

  deletePaymentMethod(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/payment-methods/${id}`);
  }

  // Sales
  createSale(dto: CreateSaleDto): Observable<Sale> {
    return this.http.post<Sale>(`${this.base}/sales`, dto);
  }

  getSales(from?: string, to?: string): Observable<Sale[]> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<Sale[]>(`${this.base}/sales`, { params });
  }

  getDailySummary(): Observable<DailySummary> {
    return this.http.get<DailySummary>(`${this.base}/sales/daily-summary`);
  }

  getSalesSummary(from?: string, to?: string): Observable<SalesSummary> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<SalesSummary>(`${this.base}/sales/summary`, { params });
  }

  // Scanner
  getRecentEvents(limit = 50): Observable<ScannerEvent[]> {
    return this.http.get<ScannerEvent[]>(`${this.base}/scanner/events?limit=${limit}`);
  }

  getTemperatures(limit = 100): Observable<ScannerEvent[]> {
    return this.http.get<ScannerEvent[]>(`${this.base}/scanner/temperatures?limit=${limit}`);
  }

  getScannerStream(): EventSource {
    return new EventSource(`${this.base}/scanner/stream`);
  }
}
