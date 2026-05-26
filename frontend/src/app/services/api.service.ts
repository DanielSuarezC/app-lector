import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  Product, CreateProductDto, Sale, CreateSaleDto, DailySummary, ScannerEvent,
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

  createProduct(dto: CreateProductDto): Observable<Product> {
    return this.http.post<Product>(`${this.base}/products`, dto);
  }

  updateProduct(id: string, dto: Partial<CreateProductDto>): Observable<Product> {
    return this.http.put<Product>(`${this.base}/products/${id}`, dto);
  }

  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/products/${id}`);
  }

  // Sales
  createSale(dto: CreateSaleDto): Observable<Sale> {
    return this.http.post<Sale>(`${this.base}/sales`, dto);
  }

  getSales(from?: string, to?: string): Observable<Sale[]> {
    let params = new HttpParams();
    if (from) { params = params.set('from', from); }
    if (to) { params = params.set('to', to); }
    return this.http.get<Sale[]>(`${this.base}/sales`, { params });
  }

  getDailySummary(): Observable<DailySummary> {
    return this.http.get<DailySummary>(`${this.base}/sales/daily-summary`);
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
