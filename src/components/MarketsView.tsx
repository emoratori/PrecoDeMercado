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
  Check,
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
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
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
    setShowAddModal(true);
  };

  const handleOpenEdit = (m: Market) => {
    setEditingMarket(m);
    setName(m.name);
    setAddress(m.address || '');
    setNotes(m.notes || '');
    setShowAddModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      if (editingMarket) {
        storage.updateMarket(editingMarket.id, {
          name: name.trim(),
          address: address.trim() || undefined,
          notes: notes.trim() || undefined,
        });
      } else {
        storage.addMarket(
          name.trim(),
          address.trim() || undefined,
          userCoords?.lat,
          userCoords?.lng,
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
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Store className="w-5 h-5 text-emerald-400" />
            Mercados Cadastrados
          </h2>
          <p className="text-xs text-slate-400">{markets.length} mercados disponíveis</p>
        </div>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Novo Mercado</span>
        </button>
      </div>

      {/* Busca */}
      <div className="p-3 bg-slate-900/60 border-b border-slate-800">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome ou endereço..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Lista de Mercados */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredMarkets.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Store className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="font-semibold text-sm">Nenhum mercado encontrado.</p>
          </div>
        ) : (
          filteredMarkets.map((m) => {
            const pricesCount = storage.getPricesCountForMarket(m.id);
            const dist = distances[m.id];

            return (
              <div
                key={m.id}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-base truncate">{m.name}</h3>
                    {typeof dist === 'number' && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-emerald-400 border border-slate-700 flex items-center gap-1 shrink-0">
                        <Navigation className="w-3 h-3 rotate-45" />
                        {formatDistance(dist)}
                      </span>
                    )}
                  </div>
                  {m.address && (
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-1 truncate">
                      <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                      {m.address}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                      <Tag className="w-3 h-3" />
                      {pricesCount} {pricesCount === 1 ? 'preço coletado' : 'preços coletados'}
                    </span>
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
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4"
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
                placeholder="Ex: Assaí Atacadista"
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
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-sm hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-md"
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
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-sm hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-md"
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
