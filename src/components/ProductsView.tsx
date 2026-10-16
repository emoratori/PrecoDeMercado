import React, { useState, useEffect } from 'react';
import { Product, PriceRecord, Market } from '../types';
import { storage } from '../services/storage';
import { formatCurrencyCents } from './Keypad';
import {
  Package,
  Search,
  Barcode as BarcodeIcon,
  TrendingDown,
  Calendar,
  Store,
  Trash2,
  Edit2,
  ChevronRight,
  ArrowUpDown,
  X,
  AlertTriangle,
} from 'lucide-react';

export const ProductsView: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productPrices, setProductPrices] = useState<PriceRecord[]>([]);
  const [sortBy, setSortBy] = useState<'lowest_price' | 'recent'>('lowest_price');

  // Edit Product Modal
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState('');
  const [editBrand, setEditBrand] = useState('');
  const [editUnit, setEditUnit] = useState('');

  // Delete product confirmation
  const [deleteProductConfirm, setDeleteProductConfirm] = useState<{
    product: Product;
    pricesCount: number;
  } | null>(null);

  const loadData = () => {
    setProducts(storage.getProducts());
    setMarkets(storage.getMarkets());
  };

  useEffect(() => {
    loadData();
  }, []);

  const openProductDetail = (p: Product) => {
    setSelectedProduct(p);
    const prices = storage.getPricesForProduct(p.id);
    setProductPrices(prices);
  };

  const handleDeletePrice = (priceId: number) => {
    if (!selectedProduct) return;
    if (confirm('Deseja excluir este registro de preço incorreto?')) {
      storage.deletePrice(priceId);
      const updated = storage.getPricesForProduct(selectedProduct.id);
      setProductPrices(updated);
    }
  };

  const handleOpenEdit = (p: Product, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingProduct(p);
    setEditName(p.name);
    setEditBrand(p.brand || '');
    setEditUnit(p.unit || 'un');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editName.trim()) return;

    try {
      const updated = storage.updateProduct(editingProduct.id, {
        name: editName.trim(),
        brand: editBrand.trim() || undefined,
        unit: editUnit.trim() || undefined,
      });
      setEditingProduct(null);
      if (selectedProduct?.id === updated.id) {
        setSelectedProduct(updated);
      }
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao atualizar produto.');
    }
  };

  const handlePromptDeleteProduct = (p: Product, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const prices = storage.getPricesForProduct(p.id);
    setDeleteProductConfirm({ product: p, pricesCount: prices.length });
  };

  const handleConfirmDeleteProduct = () => {
    if (!deleteProductConfirm) return;
    storage.deleteProduct(deleteProductConfirm.product.id);
    setDeleteProductConfirm(null);
    if (selectedProduct?.id === deleteProductConfirm.product.id) {
      setSelectedProduct(null);
    }
    loadData();
  };

  const marketsMap = new Map(markets.map((m) => [m.id, m]));

  const sortedPrices = [...productPrices].sort((a, b) => {
    if (sortBy === 'lowest_price') {
      return a.price_cents - b.price_cents;
    } else {
      return new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime();
    }
  });

  const lowestPrice =
    productPrices.length > 0
      ? [...productPrices].sort((a, b) => a.price_cents - b.price_cents)[0]
      : null;

  const filteredProducts = products.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.brand && p.brand.toLowerCase().includes(q)) ||
      p.barcode.includes(q)
    );
  });

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-400" />
            Catálogo de Produtos
          </h2>
          <p className="text-xs text-slate-400">{products.length} itens cadastrados</p>
        </div>
      </div>

      {/* Busca */}
      <div className="p-3 bg-slate-900/60 border-b border-slate-800">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por produto, marca ou código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Lista de Produtos */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="font-semibold text-sm">Nenhum produto cadastrado com este filtro.</p>
          </div>
        ) : (
          filteredProducts.map((p) => {
            const lowest = storage.getLowestPriceForProduct(p.id);
            const totalRecords = storage.getPricesForProduct(p.id).length;

            return (
              <div
                key={p.id}
                onClick={() => openProductDetail(p)}
                className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 cursor-pointer transition-all flex items-center justify-between gap-3 shadow"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                      {p.unit || 'un'}
                    </span>
                    {p.brand && (
                      <span className="text-xs font-semibold text-slate-300 truncate">{p.brand}</span>
                    )}
                  </div>
                  <h3 className="font-bold text-white text-sm sm:text-base truncate mt-0.5">
                    {p.name}
                  </h3>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                    <BarcodeIcon className="w-3 h-3" />
                    {p.barcode}
                  </div>
                </div>

                <div className="text-right shrink-0 flex items-center gap-3">
                  <div>
                    {lowest ? (
                      <>
                        <div className="text-[10px] font-semibold text-emerald-400 flex items-center justify-end gap-1">
                          <TrendingDown className="w-3 h-3" />
                          Menor
                        </div>
                        <div className="text-sm font-extrabold text-white">
                          {formatCurrencyCents(lowest.priceCents)}
                        </div>
                      </>
                    ) : (
                      <span className="text-[10px] text-slate-500">Sem preço</span>
                    )}
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {totalRecords} {totalRecords === 1 ? 'coleta' : 'coletas'}
                    </span>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Detalhes do Produto e Histórico Completo */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Header Modal */}
            <div className="p-4 bg-slate-850 border-b border-slate-800 flex items-start justify-between">
              <div className="min-w-0 pr-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300">
                    {selectedProduct.unit || 'un'}
                  </span>
                  {selectedProduct.brand && (
                    <span className="text-xs font-semibold text-slate-300">
                      {selectedProduct.brand}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-white mt-1 leading-snug">
                  {selectedProduct.name}
                </h3>
                <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                  <BarcodeIcon className="w-3.5 h-3.5" />
                  {selectedProduct.barcode}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(selectedProduct)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="Editar produto"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handlePromptDeleteProduct(selectedProduct)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400"
                  title="Excluir produto"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Destaque do Menor Preço Histórico */}
            {lowestPrice && (
              <div className="p-3.5 mx-4 mt-3 rounded-2xl bg-gradient-to-r from-emerald-950/80 to-teal-950/60 border border-emerald-500/40 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <TrendingDown className="w-4 h-4" />
                    Menor Preço Já Registrado
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5">
                    No {marketsMap.get(lowestPrice.market_id)?.name || 'Mercado'} em{' '}
                    {new Date(lowestPrice.recorded_at).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <div className="text-2xl font-black text-white">
                  {formatCurrencyCents(lowestPrice.price_cents)}
                </div>
              </div>
            )}

            {/* Controles de Ordenação do Histórico */}
            <div className="px-4 py-2 flex items-center justify-between border-b border-slate-800 mt-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Histórico ({productPrices.length})
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSortBy('lowest_price')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    sortBy === 'lowest_price'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'text-slate-400 hover:text-white bg-slate-800'
                  }`}
                >
                  Menor Preço
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy('recent')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    sortBy === 'recent'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'text-slate-400 hover:text-white bg-slate-800'
                  }`}
                >
                  Mais Recente
                </button>
              </div>
            </div>

            {/* Lista do Histórico de Preços */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {productPrices.length === 0 ? (
                <p className="text-center py-6 text-xs text-slate-400">
                  Nenhum preço registrado ainda para este produto.
                </p>
              ) : (
                sortedPrices.map((pr) => {
                  const mkt = marketsMap.get(pr.market_id);
                  const isLowest = lowestPrice?.id === pr.id;

                  return (
                    <div
                      key={pr.id}
                      className={`p-3 rounded-xl border flex items-center justify-between ${
                        isLowest
                          ? 'bg-emerald-950/30 border-emerald-500/40'
                          : 'bg-slate-800/40 border-slate-800'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-white flex items-center gap-1.5 truncate">
                          <Store className="w-3.5 h-3.5 text-slate-400" />
                          {mkt?.name || 'Mercado'}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {new Date(pr.recorded_at).toLocaleDateString('pt-BR')} às{' '}
                          {new Date(pr.recorded_at).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-base font-extrabold text-white">
                          {formatCurrencyCents(pr.price_cents)}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeletePrice(pr.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400"
                          title="Excluir este preço incorreto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Produto */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSaveEdit}
            className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-3.5"
          >
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-emerald-400" />
              Editar Produto
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nome do Produto *
              </label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Marca</label>
              <input
                type="text"
                value={editBrand}
                onChange={(e) => setEditBrand(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Unidade</label>
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setEditUnit('ml')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    editUnit === 'ml' || editUnit.endsWith(' ml')
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/30'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  ml (Mililitros)
                </button>
                <button
                  type="button"
                  onClick={() => setEditUnit('g')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    editUnit === 'g' || editUnit.endsWith(' g')
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/30'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  g (Gramas)
                </button>
              </div>
              <input
                type="text"
                placeholder="Ex: 500 g, 1000 ml"
                value={editUnit}
                onChange={(e) => setEditUnit(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
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

      {/* Modal Confirmação Exclusão de Produto */}
      {deleteProductConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-rose-900/50 rounded-3xl p-5 shadow-2xl text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">
              Excluir {deleteProductConfirm.product.name}?
            </h3>
            {deleteProductConfirm.pricesCount > 0 ? (
              <p className="text-xs text-rose-300">
                Atenção: Este produto possui <strong>{deleteProductConfirm.pricesCount}</strong> preços
                registrados no histórico que também serão apagados!
              </p>
            ) : (
              <p className="text-xs text-slate-400">
                Este produto será removido permanentemente do catálogo.
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteProductConfirm(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-sm hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteProduct}
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
