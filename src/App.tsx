import React, { useState, useEffect } from 'react';
import { Market } from './types';
import { storage } from './services/storage';
import { InitialMarketModal } from './components/InitialMarketModal';
import { ScannerView } from './components/ScannerView';
import { MarketsView } from './components/MarketsView';
import { ProductsView } from './components/ProductsView';
import { ExportView } from './components/ExportView';
import { SettingsView } from './components/SettingsView';
import {
  Camera,
  Store,
  Package,
  FileSpreadsheet,
  Settings as SettingsIcon,
} from 'lucide-react';

type Tab = 'scanner' | 'products' | 'markets' | 'export' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('scanner');
  const [currentMarket, setCurrentMarket] = useState<Market | null>(null);
  const [showInitialModal, setShowInitialModal] = useState<boolean>(true);

  // Load last selected market on start
  useEffect(() => {
    const markets = storage.getMarkets();
    const lastId = storage.getLastSelectedMarketId();
    if (lastId) {
      const found = markets.find((m) => m.id === lastId);
      if (found) {
        setCurrentMarket(found);
      }
    } else if (markets.length > 0) {
      setCurrentMarket(markets[0]);
    }
  }, []);

  const handleMarketConfirmed = (market: Market) => {
    setCurrentMarket(market);
    setShowInitialModal(false);
    setActiveTab('scanner');
  };

  const handleSelectMarketForShopping = (market: Market) => {
    storage.setLastSelectedMarketId(market.id);
    setCurrentMarket(market);
    setActiveTab('scanner');
  };

  return (
    <div className="flex flex-col h-screen w-screen max-w-md mx-auto bg-slate-950 font-sans antialiased text-slate-100 overflow-hidden shadow-2xl relative select-none">
      {/* Tela Obrigatória Inicial de Seleção de Mercado */}
      <InitialMarketModal
        isOpen={showInitialModal || !currentMarket}
        onMarketConfirmed={handleMarketConfirmed}
      />

      {/* Conteúdo da Aba Ativa */}
      <main className="flex-1 overflow-hidden relative">
        {currentMarket && activeTab === 'scanner' && (
          <ScannerView
            currentMarket={currentMarket}
            onChangeMarket={() => setShowInitialModal(true)}
          />
        )}

        {activeTab === 'products' && <ProductsView />}

        {activeTab === 'markets' && (
          <MarketsView onSelectMarketForShopping={handleSelectMarketForShopping} />
        )}

        {activeTab === 'export' && <ExportView />}

        {activeTab === 'settings' && <SettingsView />}
      </main>

      {/* Barra de Navegação Inferior (Mobile First) */}
      <nav className="h-16 bg-slate-900 border-t border-slate-800 flex items-center justify-around px-2 shrink-0 z-30">
        <button
          type="button"
          onClick={() => setActiveTab('scanner')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'scanner'
              ? 'text-emerald-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Camera className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Scanner</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'products'
              ? 'text-emerald-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Package className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Produtos</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('markets')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'markets'
              ? 'text-emerald-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Store className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Mercados</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('export')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'export'
              ? 'text-emerald-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Exportar</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'settings'
              ? 'text-emerald-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <SettingsIcon className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Ajustes</span>
        </button>
      </nav>
    </div>
  );
}
