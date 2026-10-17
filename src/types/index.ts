export interface Market {
  id: number;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;
  barcode: string;
  name: string;
  brand?: string;
  unit?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PriceRecord {
  id: number;
  product_id: number;
  market_id: number;
  price_cents: number;
  recorded_at: string;
  created_at: string;
}

export interface PriceWithDetails extends PriceRecord {
  product_name: string;
  product_barcode: string;
  product_brand?: string;
  product_unit?: string;
  market_name: string;
}

export type ScannerStatus = 'WAITING_SCAN' | 'PRODUCT_FOUND' | 'NEW_PRODUCT' | 'PRICE_SAVED';

export interface AppSettings {
  gpsRadiusMeters: number; // 500, 1000, 2000, 5000, or 0 (unlimited)
  distanceUnit: 'auto' | 'm' | 'km';
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  defaultPriceSort?: 'lowest' | 'recent';
}

export interface BackupData {
  version: number;
  exported_at: string;
  markets: Market[];
  products: Product[];
  prices: PriceRecord[];
}
