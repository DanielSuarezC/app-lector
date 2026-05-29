export type ItemType = 'product' | 'service';
export type SoldBy = 'unit' | 'box';

export interface Category {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  key: string;
  active: boolean;
}

export interface ProductVariant {
  id?: string;
  systemCode?: string;
  optionName: string;
  optionValue: string;
  costPrice: number;
  salePrice: number;
  barcode?: string;
  stock?: number;
  minStock?: number;
}

export interface Product {
  id: string;
  systemCode: string;
  barcode: string | null;
  name: string;
  description?: string;
  category?: string;
  type: ItemType;
  costPrice: number;
  salePrice: number;
  availableForSale: boolean;
  soldBy: SoldBy;
  trackInventory: boolean;
  stock: number;
  minStock: number;
  active: boolean;
  variants?: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductDto {
  barcode?: string;
  name: string;
  description?: string;
  category?: string;
  type?: ItemType;
  costPrice?: number;
  salePrice?: number;
  availableForSale?: boolean;
  soldBy?: SoldBy;
  trackInventory?: boolean;
  stock?: number;
  minStock?: number;
  variants?: Omit<ProductVariant, 'id' | 'systemCode'>[];
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
  paymentMethod: string;
  discount?: number;
  notes?: string;
}

export interface QuickServiceItem {
  serviceKey: string;
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
    systemCode?: string;
    barcode: string;
    productName: string;
    category?: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  notes?: string;
  createdAt: string;
}

export interface DailySummary {
  date: string;
  total: number;
  count: number;
}

export interface SalesSummary {
  totalRevenue: number;
  totalTransactions: number;
  byPaymentMethod: Record<string, { count: number; total: number }>;
  byCategory: Record<string, { count: number; total: number }>;
  dailySeries: Array<{ date: string; total: number; count: number }>;
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
