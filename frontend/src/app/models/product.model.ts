export interface Product {
  id: string;
  barcode: string | null;
  name: string;
  category: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductDto {
  barcode?: string;
  name: string;
  category?: string;
  costPrice: number;
  salePrice: number;
  stock?: number;
  minStock?: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface SaleItem {
  productId: string;
  quantity: number;
}

export interface CreateSaleDto {
  items: SaleItem[];
  quickItems?: Array<{ name: string; unitPrice: number; quantity: number; category?: string }>;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'nequi';
  discount?: number;
  notes?: string;
}

export interface QuickServiceItem {
  serviceKey: string; // 'impresion' | 'fotocopia' | 'scanner' | 'transcripcion' | 'tramite'
  name: string;
  unitPrice: number;
  quantity: number;
}

export interface ServiceCartItem {
  type: 'service';
  serviceKey: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

export interface Sale {
  id: string;
  transactionNumber: string;
  items: Array<{
    productId: string;
    barcode: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  createdAt: string;
}

export interface DailySummary {
  date: string;
  total: number;
  count: number;
}

export interface ScannerEvent {
  id: string;
  type: 'barcode' | 'temp' | 'boot';
  data?: string;
  value?: number;
  unit?: string;
  bridgeId?: string;
  receivedAt: string;
}
