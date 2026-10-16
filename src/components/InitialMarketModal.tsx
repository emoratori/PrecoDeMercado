import React, { useState, useEffect } from 'react';
import { Market } from '../types';
import { storage } from '../services/storage';
import { calculateDistanceMeters, formatDistance } from '../services/distance';
import { Store, MapPin, Navigation, Plus, Check, ArrowRight, Compass } from 'lucide-react';

interface InitialMarketModalProps {
  onMarketConfirmed: (market: Market) => void;
  isOpen: boolean;
}

export const InitialMarketModal: React.FC<InitialMarketModalProps> = ({
  onMarketConfirmed,
  isOpen,
}) => {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarketId, setSelectedMarketId] = useState<number | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'locating' | 'ready' | 'denied' | 'idle'>('locating');
  const [distances, setDistances] = useState<Record<number, number>>({});
  const [showAddMarket, setShowAddMarket] = useState(false);
  const [newMarketName, setNewMarketName] = useState('');
  const [newMarketAddress, setNewMarketAddress] = useState('');

  // Load markets and GPS coordinates on open
  useEffect(() => {
    if (!isOpen) return;

    const loaded = storage.getMarkets();
    setMarkets(loaded);

    const lastId = storage.getLastSelectedMarketId();
    if (lastId && loaded.some((m) => m.id === lastId)) {
      setSelectedMarketId(lastId);
    } else if (loaded.length > 0) {
      setSelectedMarketId(loaded[0].id);
    }

    // Try to get GPS location
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserCoords({ lat, lng });
          setGpsStatus('ready');

          // Calculate distance to each market
          const distMap: Record<number, number> = {};
          let closestId: number | null = null;
          let closestDist = Infinity;

          loaded.forEach((m) => {
            if (typeof m.latitude === 'number' && typeof m.longitude === 'number') {
              const d = calculateDistanceMeters(lat, lng, m.latitude, m.longitude);
              distMap[m.id] = d;
              if (d < closestDist) {
                closestDist = d;
                closestId = m.id;
              }
            }
          });

          setDistances(distMap);

          // If closest market is reasonably close (< 3km), recommend it automatically
          if (closestId && closestDist < 3000) {
            setSelectedMarketId(closestId);
          }
        },
        () => {
          setGpsStatus('denied');
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      setGpsStatus('denied');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedMarket = markets.find((m) => m.id === selectedMarketId);

  const handleConfirm = () => {
    if (selectedMarket) {
      storage.setLastSelectedMarketId(selectedMarket.id);
      onMarketConfirmed(selectedMarket);
    }
  };

  const handleCreateMarket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMarketName.trim()) return;

    try {
      const created = storage.addMarket(
        newMarketName,
        newMarketAddress,
        userCoords?.lat,
        userCoords?.lng
      );
      setMarkets(storage.getMarkets());
      setSelectedMarketId(created.id);
      setShowAddMarket(false);
      setNewMarketName('');
      setNewMarketAddress('');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao cadastrar mercado.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-600/20 to-teal-600/10 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl ring-1 ring-emerald-500/30">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Em qual mercado você está?</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Confirme o local para vincular os preços aos registros corretos.
              </p>
            </div>
          </div>

          {/* GPS status badge */}
          <div className="mt-3 flex items-center gap-2 text-xs">
            {gpsStatus === 'locating' && (
              <span className="flex items-center gap-1.5 text-amber-300">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                Buscando sinal GPS para sugerir mercado...
              </span>
            )}
            {gpsStatus === 'ready' && (
              <span className="flex items-center gap-1.5 text-emerald-300">
                <Compass className="w-3.5 h-3.5" />
                GPS ativo (ordenado por proximidade)
              </span>
            )}
            {gpsStatus === 'denied' && (
              <span className="flex items-center gap-1.5 text-slate-400">
                <MapPin className="w-3.5 h-3.5" />
                GPS indisponível (seleção manual)
              </span>
            )}
          </div>
        </div>

        {/* Form para adicionar mercado se aberto */}
        {showAddMarket ? (
          <form onSubmit={handleCreateMarket} className="p-5 space-y-4 overflow-y-auto">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" />
              Novo Mercado
            </h3>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nome do Mercado *
              </label>
              <input
                type="text"
                autoFocus
                placeholder="Ex: Assaí Atacadista - Radial"
                value={newMarketName}
                onChange={(e) => setNewMarketName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Endereço / Referência (opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: Av. Alcântara Machado, 2000"
                value={newMarketAddress}
                onChange={(e) => setNewMarketAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {userCoords && (
              <p className="text-xs text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                Coordenadas GPS atuais serão vinculadas automaticamente
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddMarket(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-medium hover:bg-slate-700 text-sm"
              >
                Voltar
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-md"
              >
                Salvar Mercado
              </button>
            </div>
          </form>
        ) : (
          <div className="p-4 overflow-y-auto space-y-2 flex-1">
            {markets.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p>Nenhum mercado cadastrado ainda.</p>
                <button
                  onClick={() => setShowAddMarket(true)}
                  className="mt-3 px-4 py-2 bg-emerald-500 text-slate-950 rounded-xl font-semibold text-sm"
                >
                  Cadastrar primeiro mercado
                </button>
              </div>
            ) : (
              markets.map((market) => {
                const isSelected = market.id === selectedMarketId;
                const dist = distances[market.id];

                return (
                  <div
                    key={market.id}
                    onClick={() => setSelectedMarketId(market.id)}
                    className={`p-3.5 rounded-2xl cursor-pointer transition-all border flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500/60 ring-2 ring-emerald-500/30'
                        : 'bg-slate-800/60 hover:bg-slate-800 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                          isSelected
                            ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                            : 'border-slate-600'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <div>
                        <div className="font-bold text-base text-white flex items-center gap-2">
                          {market.name}
                        </div>
                        {market.address && (
                          <div className="text-xs text-slate-400 line-clamp-1">
                            {market.address}
                          </div>
                        )}
                      </div>
                    </div>

                    {typeof dist === 'number' && (
                      <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-slate-800 text-emerald-400 border border-slate-700/60 flex items-center gap-1">
                        <Navigation className="w-3 h-3 rotate-45" />
                        {formatDistance(dist)}
                      </span>
                    )}
                  </div>
                );
              })
            )}

            {!showAddMarket && (
              <button
                type="button"
                onClick={() => setShowAddMarket(true)}
                className="w-full mt-2 py-3 rounded-2xl border border-dashed border-slate-700 hover:border-emerald-500/50 bg-slate-800/30 hover:bg-slate-800/60 text-slate-300 text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                Cadastrar Outro Mercado
              </button>
            )}
          </div>
        )}

        {/* Footer com Botão Gigante de Confirmação */}
        {!showAddMarket && (
          <div className="p-4 bg-slate-950 border-t border-slate-800">
            <button
              type="button"
              disabled={!selectedMarket}
              onClick={handleConfirm}
              className={`w-full h-15 rounded-2xl font-extrabold text-base sm:text-lg flex items-center justify-center gap-3 shadow-xl transition-all cursor-pointer active:scale-[0.98] ${
                selectedMarket
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/30'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <span>CONFIRMAR E ENTRAR NO SCANNER</span>
              <ArrowRight className="w-5 h-5 stroke-[2.5]" />
            </button>
            {selectedMarket && (
              <p className="text-center text-xs text-slate-400 mt-2 truncate">
                Mercado ativo: <span className="text-white font-semibold">{selectedMarket.name}</span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
