import { Market, Product, PriceRecord, AppSettings, BackupData } from '../types';

const STORAGE_KEYS = {
  VERSION: 'preco_local_db_version',
  MARKETS: 'preco_local_markets',
  PRODUCTS: 'preco_local_products',
  PRICES: 'preco_local_prices',
  SETTINGS: 'preco_local_settings',
  LAST_SELECTED_MARKET: 'preco_local_last_market_id',
};

const DEFAULT_SETTINGS: AppSettings = {
  gpsRadiusMeters: 1000,
  distanceUnit: 'auto',
  soundEnabled: true,
  vibrationEnabled: true,
};

const SEED_MARKETS: Market[] = [
  {
    id: 1,
    name: 'Assaí Atacadista - Radial',
    address: 'Av. Alcântara Machado, 2000 - Mooca',
    latitude: -23.55052,
    longitude: -46.633308,
    notes: 'Estacionamento coberto',
    created_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 2,
    name: 'Atacadão - Vila Guilherme',
    address: 'Av. Morvan Dias de Figueiredo, 5001',
    latitude: -23.5152,
    longitude: -46.6115,
    notes: 'Bons preços em fardos',
    created_at: new Date(Date.now() - 25 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 25 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 3,
    name: 'Carrefour Bairro - Paulista',
    address: 'Al. Santos, 1800 - Cerqueira César',
    latitude: -23.5615,
    longitude: -46.6565,
    notes: 'Mercado rápido para compras diárias',
    created_at: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString(),
  },
];

const SEED_PRODUCTS: Product[] = [
  {
    id: 1,
    barcode: '7891000100103',
    name: 'Leite Integral UHT',
    brand: 'Piracanjuba',
    unit: '1L',
    notes: 'Tampa de rosca',
    created_at: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 2,
    barcode: '7891025114130',
    name: 'Arroz Branco Tipo 1',
    brand: 'Tio João',
    unit: '5kg',
    notes: '',
    created_at: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 3,
    barcode: '7896005800478',
    name: 'Feijão Carioca',
    brand: 'Camil',
    unit: '1kg',
    notes: '',
    created_at: new Date(Date.now() - 18 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 18 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 4,
    barcode: '7891022101010',
    name: 'Detergente Líquido Neutro',
    brand: 'Ypê',
    unit: '500ml',
    notes: '',
    created_at: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 5,
    barcode: '7894900010015',
    name: 'Refrigerante Coca-Cola',
    brand: 'Coca-Cola',
    unit: '2L',
    notes: 'Garrafa PET',
    created_at: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 6,
    barcode: '7891000315507',
    name: 'Café Torrado e Moído Tradicional',
    brand: 'Pilão',
    unit: '500g',
    notes: 'Vácuo',
    created_at: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
  },
];

const SEED_PRICES: PriceRecord[] = [
  {
    id: 1,
    product_id: 1,
    market_id: 1,
    price_cents: 489, // R$ 4,89
    recorded_at: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
    created_at: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 2,
    product_id: 1,
    market_id: 2,
    price_cents: 469, // R$ 4,69
    recorded_at: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(),
    created_at: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 3,
    product_id: 1,
    market_id: 3,
    price_cents: 539, // R$ 5,39
    recorded_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    created_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 4,
    product_id: 2,
    market_id: 1,
    price_cents: 2790, // R$ 27,90
    recorded_at: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
    created_at: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 5,
    product_id: 2,
    market_id: 2,
    price_cents: 2650, // R$ 26,50
    recorded_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    created_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 6,
    product_id: 4,
    market_id: 1,
    price_cents: 239, // R$ 2,39
    recorded_at: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
    created_at: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 7,
    product_id: 5,
    market_id: 1,
    price_cents: 899, // R$ 8,99
    recorded_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    created_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
  },
];

class StorageService {
  constructor() {
    this.initDatabase();
  }

  private initDatabase() {
    if (typeof window === 'undefined') return;

    const version = localStorage.getItem(STORAGE_KEYS.VERSION);
    if (!version) {
      // First initialization: seed initial database
      localStorage.setItem(STORAGE_KEYS.VERSION, '1');
      if (!localStorage.getItem(STORAGE_KEYS.MARKETS)) {
        localStorage.setItem(STORAGE_KEYS.MARKETS, JSON.stringify(SEED_MARKETS));
      }
      if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(SEED_PRODUCTS));
      }
      if (!localStorage.getItem(STORAGE_KEYS.PRICES)) {
        localStorage.setItem(STORAGE_KEYS.PRICES, JSON.stringify(SEED_PRICES));
      }
      if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
      }
      if (!localStorage.getItem(STORAGE_KEYS.LAST_SELECTED_MARKET)) {
        localStorage.setItem(STORAGE_KEYS.LAST_SELECTED_MARKET, '1');
      }
    }
  }

  // ---- MARKETS ----
  getMarkets(): Market[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MARKETS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  getMarketById(id: number): Market | undefined {
    return this.getMarkets().find((m) => m.id === id);
  }

  addMarket(name: string, address?: string, lat?: number, lng?: number, notes?: string): Market {
    const markets = this.getMarkets();
    const existing = markets.find((m) => m.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (existing) {
      throw new Error('Já existe um mercado cadastrado com este nome.');
    }

    const nextId = markets.length > 0 ? Math.max(...markets.map((m) => m.id)) + 1 : 1;
    const now = new Date().toISOString();
    const newMarket: Market = {
      id: nextId,
      name: name.trim(),
      address: address?.trim() || undefined,
      latitude: lat,
      longitude: lng,
      notes: notes?.trim() || undefined,
      created_at: now,
      updated_at: now,
    };

    markets.push(newMarket);
    localStorage.setItem(STORAGE_KEYS.MARKETS, JSON.stringify(markets));
    return newMarket;
  }

  updateMarket(id: number, updates: Partial<Omit<Market, 'id' | 'created_at'>>): Market {
    const markets = this.getMarkets();
    const index = markets.findIndex((m) => m.id === id);
    if (index === -1) throw new Error('Mercado não encontrado.');

    if (updates.name) {
      const duplicate = markets.find(
        (m) => m.id !== id && m.name.trim().toLowerCase() === updates.name!.trim().toLowerCase()
      );
      if (duplicate) throw new Error('Já existe outro mercado cadastrado com este nome.');
    }

    const updatedMarket: Market = {
      ...markets[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    markets[index] = updatedMarket;
    localStorage.setItem(STORAGE_KEYS.MARKETS, JSON.stringify(markets));
    return updatedMarket;
  }

  deleteMarket(id: number): { deletedMarket: Market; deletedPricesCount: number } {
    const markets = this.getMarkets();
    const market = markets.find((m) => m.id === id);
    if (!market) throw new Error('Mercado não encontrado.');

    const prices = this.getPrices();
    const linkedPrices = prices.filter((p) => p.market_id === id);

    // Remove market
    const filteredMarkets = markets.filter((m) => m.id !== id);
    localStorage.setItem(STORAGE_KEYS.MARKETS, JSON.stringify(filteredMarkets));

    // Remove linked prices (Cascade delete)
    const filteredPrices = prices.filter((p) => p.market_id !== id);
    localStorage.setItem(STORAGE_KEYS.PRICES, JSON.stringify(filteredPrices));

    // Reset last selected market if deleted
    const lastId = this.getLastSelectedMarketId();
    if (lastId === id) {
      if (filteredMarkets.length > 0) {
        this.setLastSelectedMarketId(filteredMarkets[0].id);
      } else {
        localStorage.removeItem(STORAGE_KEYS.LAST_SELECTED_MARKET);
      }
    }

    return { deletedMarket: market, deletedPricesCount: linkedPrices.length };
  }

  // ---- LAST SELECTED MARKET ----
  getLastSelectedMarketId(): number | null {
    const raw = localStorage.getItem(STORAGE_KEYS.LAST_SELECTED_MARKET);
    return raw ? parseInt(raw, 10) : null;
  }

  setLastSelectedMarketId(id: number): void {
    localStorage.setItem(STORAGE_KEYS.LAST_SELECTED_MARKET, id.toString());
  }

  // ---- PRODUCTS ----
  getProducts(): Product[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  getProductById(id: number): Product | undefined {
    return this.getProducts().find((p) => p.id === id);
  }

  getProductByBarcode(barcode: string): Product | undefined {
    const clean = barcode.trim();
    return this.getProducts().find((p) => p.barcode === clean);
  }

  addProduct(barcode: string, name: string, brand?: string, unit?: string, notes?: string): Product {
    const cleanBarcode = barcode.trim();
    if (!cleanBarcode) throw new Error('Código de barras é obrigatório.');
    if (!name.trim()) throw new Error('Nome do produto é obrigatório.');

    const products = this.getProducts();
    const existing = products.find((p) => p.barcode === cleanBarcode);
    if (existing) {
      throw new Error(`Produto já cadastrado com este código: ${existing.name}`);
    }

    const nextId = products.length > 0 ? Math.max(...products.map((p) => p.id)) + 1 : 1;
    const now = new Date().toISOString();
    const newProduct: Product = {
      id: nextId,
      barcode: cleanBarcode,
      name: name.trim(),
      brand: brand?.trim() || undefined,
      unit: unit?.trim() || undefined,
      notes: notes?.trim() || undefined,
      created_at: now,
      updated_at: now,
    };

    products.push(newProduct);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    return newProduct;
  }

  updateProduct(id: number, updates: Partial<Omit<Product, 'id' | 'created_at'>>): Product {
    const products = this.getProducts();
    const index = products.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Produto não encontrado.');

    if (updates.barcode) {
      const duplicate = products.find((p) => p.id !== id && p.barcode === updates.barcode!.trim());
      if (duplicate) throw new Error('Já existe outro produto cadastrado com este código de barras.');
    }

    const updatedProduct: Product = {
      ...products[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    products[index] = updatedProduct;
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    return updatedProduct;
  }

  deleteProduct(id: number): { deletedProduct: Product; deletedPricesCount: number } {
    const products = this.getProducts();
    const product = products.find((p) => p.id === id);
    if (!product) throw new Error('Produto não encontrado.');

    const prices = this.getPrices();
    const linkedPrices = prices.filter((p) => p.product_id === id);

    // Delete product
    const filteredProducts = products.filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(filteredProducts));

    // Cascade delete linked prices
    const filteredPrices = prices.filter((p) => p.product_id !== id);
    localStorage.setItem(STORAGE_KEYS.PRICES, JSON.stringify(filteredPrices));

    return { deletedProduct: product, deletedPricesCount: linkedPrices.length };
  }

  getAllKnownBrands(): string[] {
    const products = this.getProducts();
    const brandsSet = new Set<string>();
    products.forEach((p) => {
      if (p.brand && p.brand.trim()) {
        brandsSet.add(p.brand.trim());
      }
    });
    return Array.from(brandsSet).sort((a, b) => a.localeCompare(b));
  }

  // ---- PRICES ----
  getPrices(): PriceRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRICES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  getPricesForProduct(productId: number): PriceRecord[] {
    return this.getPrices()
      .filter((p) => p.product_id === productId)
      .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
  }

  getLowestPriceForProduct(productId: number): {
    priceCents: number;
    marketName: string;
    recordedAt: string;
  } | null {
    const prices = this.getPrices().filter((p) => p.product_id === productId);
    if (prices.length === 0) return null;

    prices.sort((a, b) => a.price_cents - b.price_cents);
    const lowest = prices[0];
    const market = this.getMarketById(lowest.market_id);

    return {
      priceCents: lowest.price_cents,
      marketName: market ? market.name : 'Mercado desconhecido',
      recordedAt: lowest.recorded_at,
    };
  }

  getPricesCountForMarket(marketId: number): number {
    return this.getPrices().filter((p) => p.market_id === marketId).length;
  }

  addPrice(productId: number, marketId: number, priceCents: number): PriceRecord {
    if (priceCents <= 0) {
      throw new Error('Informe um preço válido maior que zero.');
    }

    const prices = this.getPrices();
    const nextId = prices.length > 0 ? Math.max(...prices.map((p) => p.id)) + 1 : 1;
    const now = new Date().toISOString();

    const newRecord: PriceRecord = {
      id: nextId,
      product_id: productId,
      market_id: marketId,
      price_cents: priceCents,
      recorded_at: now,
      created_at: now,
    };

    prices.push(newRecord);
    localStorage.setItem(STORAGE_KEYS.PRICES, JSON.stringify(prices));
    return newRecord;
  }

  deletePrice(id: number): void {
    const prices = this.getPrices();
    const filtered = prices.filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.PRICES, JSON.stringify(filtered));
  }

  // ---- SETTINGS ----
  getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  updateSettings(settings: Partial<AppSettings>): AppSettings {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    return updated;
  }

  // ---- BACKUP & RESTORE ----
  exportBackup(): BackupData {
    return {
      version: 1,
      exported_at: new Date().toISOString(),
      markets: this.getMarkets(),
      products: this.getProducts(),
      prices: this.getPrices(),
    };
  }

  importBackup(backup: BackupData, mode: 'replace' | 'merge'): {
    marketsImported: number;
    productsImported: number;
    pricesImported: number;
  } {
    if (!backup || !Array.isArray(backup.markets) || !Array.isArray(backup.products) || !Array.isArray(backup.prices)) {
      throw new Error('Arquivo de backup inválido ou corrompido.');
    }

    if (mode === 'replace') {
      localStorage.setItem(STORAGE_KEYS.MARKETS, JSON.stringify(backup.markets));
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(backup.products));
      localStorage.setItem(STORAGE_KEYS.PRICES, JSON.stringify(backup.prices));
      if (backup.markets.length > 0) {
        this.setLastSelectedMarketId(backup.markets[0].id);
      }
      return {
        marketsImported: backup.markets.length,
        productsImported: backup.products.length,
        pricesImported: backup.prices.length,
      };
    } else {
      // Merge mode
      const currentMarkets = this.getMarkets();
      const currentProducts = this.getProducts();
      const currentPrices = this.getPrices();

      const marketIdMap = new Map<number, number>(); // oldId -> newId
      let newMarketsCount = 0;
      let nextMarketId = currentMarkets.length > 0 ? Math.max(...currentMarkets.map((m) => m.id)) + 1 : 1;

      for (const m of backup.markets) {
        const existing = currentMarkets.find(
          (cm) => cm.name.trim().toLowerCase() === m.name.trim().toLowerCase()
        );
        if (existing) {
          marketIdMap.set(m.id, existing.id);
        } else {
          const newId = nextMarketId++;
          marketIdMap.set(m.id, newId);
          currentMarkets.push({ ...m, id: newId });
          newMarketsCount++;
        }
      }

      const productIdMap = new Map<number, number>(); // oldId -> newId
      let newProductsCount = 0;
      let nextProductId = currentProducts.length > 0 ? Math.max(...currentProducts.map((p) => p.id)) + 1 : 1;

      for (const p of backup.products) {
        const existing = currentProducts.find((cp) => cp.barcode === p.barcode.trim());
        if (existing) {
          productIdMap.set(p.id, existing.id);
        } else {
          const newId = nextProductId++;
          productIdMap.set(p.id, newId);
          currentProducts.push({ ...p, id: newId });
          newProductsCount++;
        }
      }

      let newPricesCount = 0;
      let nextPriceId = currentPrices.length > 0 ? Math.max(...currentPrices.map((pr) => pr.id)) + 1 : 1;

      for (const pr of backup.prices) {
        const mappedProductId = productIdMap.get(pr.product_id);
        const mappedMarketId = marketIdMap.get(pr.market_id);

        if (mappedProductId && mappedMarketId) {
          // Check if identical price record already exists
          const exists = currentPrices.some(
            (cp) =>
              cp.product_id === mappedProductId &&
              cp.market_id === mappedMarketId &&
              cp.price_cents === pr.price_cents &&
              cp.recorded_at === pr.recorded_at
          );
          if (!exists) {
            currentPrices.push({
              ...pr,
              id: nextPriceId++,
              product_id: mappedProductId,
              market_id: mappedMarketId,
            });
            newPricesCount++;
          }
        }
      }

      localStorage.setItem(STORAGE_KEYS.MARKETS, JSON.stringify(currentMarkets));
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(currentProducts));
      localStorage.setItem(STORAGE_KEYS.PRICES, JSON.stringify(currentPrices));

      return {
        marketsImported: newMarketsCount,
        productsImported: newProductsCount,
        pricesImported: newPricesCount,
      };
    }
  }

  resetDatabase(): void {
    localStorage.removeItem(STORAGE_KEYS.MARKETS);
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.PRICES);
    localStorage.removeItem(STORAGE_KEYS.LAST_SELECTED_MARKET);
    localStorage.removeItem(STORAGE_KEYS.VERSION);
    this.initDatabase();
  }
}

export const storage = new StorageService();
