import React, { useState, useEffect } from 'react';
import { Market } from '../types';
import { storage } from '../services/storage';
import { calculateDistanceMeters, formatDistance } from '../services/distance';
import {
  Store,
  Plus,
  MapPin,
  Trash2,
  Edit2,
  Search,
  Navigation,
  Tag,
  AlertTriangle,
  LocateFixed,
  Compass,
} from 'lucide-react';

interface MarketsViewProps {
  onSelectMarketForShopping?: (market: Market) => void;
}

export const MarketsView: React.FC<MarketsViewProps> = ({ onSelectMarketForShopping }) => {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMarket, setEditingMarket] = useState<Market | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [isCapturingGps, setIsCapturingGps] = useState(false);

  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [distances, setDistances] = useState<Record<number, number>>({});

  // Delete confirmation
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    market: Market;
    pricesCount: number;
  } | null>(null);

  const loadData = () => {
    const list = storage.getMarkets();
    setMarkets(list);

    if (userCoords) {
      const dists: Record<number, number> = {};
      list.forEach((m) => {
        if (typeof m.latitude === 'number' && typeof m.longitude === 'number') {
          dists[m.id] = calculateDistanceMeters(
            userCoords.lat,
            userCoords.lng,
            m.latitude,
            m.longitude
          );
        }
      });
      setDistances(dists);
    }
  };

  useEffect(() => {
    loadData();

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          console.warn('Geolocation initial check error:', err);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, []);

  useEffect(() => {
    if (userCoords) {
      loadData();
    }
  }, [userCoords]);

  const handleOpenAdd = () => {
    setEditingMarket(null);
    setName('');
    setAddress('');
    setNotes('');
    if (userCoords) {
      setLatitude(userCoords.lat.toFixed(6));
      setLongitude(userCoords.lng.toFixed(6));
    } else {
      setLatitude('');
      setLongitude('');
    }
    setShowAddModal(true);
  };

  const handleOpenEdit = (m: Market) => {
    setEditingMarket(m);
    setName(m.name);
    setAddress(m.address || '');
    setNotes(m.notes || '');
    setLatitude(typeof m.latitude === 'number' ? m.latitude.toFixed(6) : '');
    setLongitude(typeof m.longitude === 'number' ? m.longitude.toFixed(6) : '');
    setShowAddModal(true);
  };

  const handleCaptureCurrentGps = () => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      alert('Geolocalização não é suportada por este dispositivo ou navegador.');
      return;
    }

    setIsCapturingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsCapturingGps(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLatitude(lat.toFixed(6));
        setLongitude(lng.toFixed(6));
        setUserCoords({ lat, lng });
      },
      (err) => {
        setIsCapturingGps(false);
        alert('Não foi possível obter a localização. Verifique se o GPS está ativado e a permissão concedida.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedLat = latitude.trim() ? parseFloat(latitude.trim().replace(',', '.')) : undefined;
    const parsedLng = longitude.trim() ? parseFloat(longitude.trim().replace(',', '.')) : undefined;

    const finalLat = typeof parsedLat === 'number' && !isNaN(parsedLat) ? parsedLat : undefined;
    const finalLng = typeof parsedLng === 'number' && !isNaN(parsedLng) ? parsedLng : undefined;

    try {
      if (editingMarket) {
        storage.updateMarket(editingMarket.id, {
          name: name.trim(),
          address: address.trim() || undefined,
          latitude: finalLat,
          longitude: finalLng,
          notes: notes.trim() || undefined,
        });
      } else {
        storage.addMarket(
          name.trim(),
          address.trim() || undefined,
          finalLat,
          finalLng,
          notes.trim() || undefined
        );
      }
      setShowAddModal(false);
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao salvar mercado.');
    }
  };

  const handlePromptDelete = (m: Market) => {
    const count = storage.getPricesCountForMarket(m.id);
    setDeleteConfirmation({ market: m, pricesCount: count });
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmation) return;
    storage.deleteMarket(deleteConfirmation.market.id);
    setDeleteConfirmation(null);
    loadData();
  };

  const filteredMarkets = markets.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.address && m.address.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Store className="w-5 h-5 text-emerald-400" />
            Mercados Cadastrados
          </h2>
          <p className="text-xs text-slate-400">
            {markets.length} {markets.length === 1 ? 'mercado disponível' : 'mercados disponíveis'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="h-9 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Mercado</span>
        </button>
      </div>

      {/* Busca */}
      <div className="p-3 bg-slate-900/60 border-b border-slate-800/80 shrink-0">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por nome ou endereço..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Lista de Mercados */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredMarkets.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Store className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold">Nenhum mercado encontrado</p>
            <p className="text-xs text-slate-400 mt-1">Toque em "Novo Mercado" para cadastrar.</p>
          </div>
        ) : (
          filteredMarkets.map((m) => {
            const pricesCount = storage.getPricesCountForMarket(m.id);
            const distMeters = distances[m.id];
            const hasCoords = typeof m.latitude === 'number' && typeof m.longitude === 'number';

            return (
              <div
                key={m.id}
                className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-all"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-white truncate">{m.name}</h3>
                    {distMeters !== undefined && (
                      <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-slate-700 flex items-center gap-1">
                        <Navigation className="w-2.5 h-2.5 text-emerald-400" />
                        {formatDistance(distMeters)}
                      </span>
                    )}
                  </div>

                  {m.address && (
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-1 truncate">
                      <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                      {m.address}
                    </p>
                  )}

                  <div className="mt-2 flex items-center gap-2 flex-wrap text-xs">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                      <Tag className="w-3 h-3" />
                      {pricesCount} {pricesCount === 1 ? 'preço coletado' : 'preços coletados'}
                    </span>

                    {hasCoords ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-400 border border-slate-700/60 font-mono text-[10px]">
                        <Compass className="w-3 h-3 text-emerald-400" />
                        {m.latitude?.toFixed(4)}, {m.longitude?.toFixed(4)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium text-[10px]">
                        Sem coordenadas GPS
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {onSelectMarketForShopping && (
                    <button
                      type="button"
                      onClick={() => onSelectMarketForShopping(m)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 font-semibold text-xs border border-emerald-500/30 transition-all cursor-pointer"
                    >
                      Iniciar Compras
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(m)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                    title="Editar Mercado"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePromptDelete(m)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
                    title="Excluir Mercado"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Add/Edit */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSave}
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Store className="w-5 h-5 text-emerald-400" />
              {editingMarket ? 'Editar Mercado' : 'Cadastrar Novo Mercado'}
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nome do Mercado *
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Ex: Assaí Mooca"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Endereço ou Bairro
              </label>
              <input
                type="text"
                placeholder="Ex: Av. Radial Leste, 1500"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Seção de Coordenadas GPS */}
            <div className="p-3.5 bg-slate-800/60 border border-slate-700/60 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-emerald-400" />
                  Coordenadas GPS
                </span>

                <button
                  type="button"
                  onClick={handleCaptureCurrentGps}
                  disabled={isCapturingGps}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                  title="Captura a latitude e longitude da sua posição atual"
                >
                  <LocateFixed className="w-3.5 h-3.5" />
                  <span>{isCapturingGps ? 'Obtendo GPS...' : 'Usar GPS Atual'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Latitude
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: -23.550520"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Longitude
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: -46.633308"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <p className="text-[10px] text-slate-400 leading-tight">
                Permite que o app calcule a distância em metros/km e ordene os mercados pelo mais próximo de você.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Observações (opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: Estacionamento gratuito, aceita vale"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-sm hover:bg-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-md cursor-pointer"
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Confirmação de Exclusão */}
      {deleteConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-rose-900/50 rounded-3xl p-5 shadow-2xl text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">
              Excluir {deleteConfirmation.market.name}?
            </h3>
            {deleteConfirmation.pricesCount > 0 ? (
              <p className="text-xs text-rose-300">
                Atenção: Este mercado possui <strong>{deleteConfirmation.pricesCount}</strong> preços
                vinculados que também serão excluídos permanentemente!
              </p>
            ) : (
              <p className="text-xs text-slate-400">
                Este mercado não possui preços vinculados e será removido com segurança.
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmation(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-sm hover:bg-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-md cursor-pointer"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
