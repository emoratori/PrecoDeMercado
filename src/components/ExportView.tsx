import React, { useState } from 'react';
import { storage } from '../services/storage';
import { exportToExcel } from '../services/excelExport';
import { BackupData } from '../types';
import {
  FileSpreadsheet,
  Download,
  Upload,
  Share2,
  CheckCircle2,
  AlertCircle,
  FileJson,
  ShieldAlert,
} from 'lucide-react';

export const ExportView: React.FC = () => {
  const [exportingExcel, setExportingExcel] = useState(false);
  const [excelSuccessMsg, setExcelSuccessMsg] = useState<string | null>(null);

  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [pendingBackupData, setPendingBackupData] = useState<BackupData | null>(null);

  // 1. Export Excel (.xlsx)
  const handleExportExcel = async () => {
    try {
      setExportingExcel(true);
      setExcelSuccessMsg(null);

      const markets = storage.getMarkets();
      const products = storage.getProducts();
      const prices = storage.getPrices();

      if (markets.length === 0 && products.length === 0 && prices.length === 0) {
        alert('Não há dados cadastrados para exportar.');
        return;
      }

      const { fileName, sharedNatively } = await exportToExcel(markets, products, prices);
      setExcelSuccessMsg(
        sharedNatively
          ? `Planilha enviada para o compartilhador nativo (${fileName})`
          : `Planilha baixada com sucesso: ${fileName}`
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao gerar planilha.');
    } finally {
      setExportingExcel(false);
    }
  };

  // 2. Export Backup JSON
  const handleExportJSON = () => {
    try {
      const backup = storage.exportBackup();
      const today = new Date().toISOString().split('T')[0];
      const fileName = `backup_precos_mercados_${today}.json`;
      const jsonStr = JSON.stringify(backup, null, 2);

      const blob = new Blob([jsonStr], { type: 'application/json' });

      // Check native share
      if (typeof navigator !== 'undefined' && 'canShare' in navigator && 'share' in navigator) {
        const file = new File([blob], fileName, { type: 'application/json' });
        if (navigator.canShare({ files: [file] })) {
          navigator
            .share({
              files: [file],
              title: 'Backup JSON de Preços',
              text: 'Arquivo de backup completo do app Preço Local',
            })
            .catch(() => {
              // Share dismissed
            });
          return;
        }
      }

      // Download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 200);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao exportar backup.');
    }
  };

  // 3. Handle File Input for Import JSON
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        setImportError(null);
        setImportNotice(null);
        const text = event.target?.result as string;
        const parsed = JSON.parse(text) as BackupData;

        if (!parsed.markets || !parsed.products || !parsed.prices) {
          throw new Error('O arquivo selecionado não contém a estrutura válida de backup.');
        }

        setPendingBackupData(parsed);
        setShowReplaceModal(true);
      } catch (err: unknown) {
        setImportError(err instanceof Error ? err.message : 'Erro ao ler arquivo JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const handleConfirmImport = (mode: 'replace' | 'merge') => {
    if (!pendingBackupData) return;

    try {
      const result = storage.importBackup(pendingBackupData, mode);
      setImportNotice(
        `Importação concluída com sucesso! Mercados: ${result.marketsImported}, Produtos: ${result.productsImported}, Preços: ${result.pricesImported}.`
      );
      setShowReplaceModal(false);
      setPendingBackupData(null);
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : 'Erro ao importar dados.');
    }
  };

  const stats = {
    markets: storage.getMarkets().length,
    products: storage.getProducts().length,
    prices: storage.getPrices().length,
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white overflow-y-auto p-4 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
          Exportação & Backup
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Seus dados pertencem a você. Exporte para planilha Excel ou salve cópias de segurança JSON.
        </p>
      </div>

      {/* Resumo do Banco Local */}
      <div className="grid grid-cols-3 gap-2 p-3 bg-slate-900 border border-slate-800 rounded-2xl text-center">
        <div>
          <div className="text-lg font-black text-emerald-400">{stats.markets}</div>
          <div className="text-[10px] text-slate-400 font-semibold uppercase">Mercados</div>
        </div>
        <div>
          <div className="text-lg font-black text-emerald-400">{stats.products}</div>
          <div className="text-[10px] text-slate-400 font-semibold uppercase">Produtos</div>
        </div>
        <div>
          <div className="text-lg font-black text-emerald-400">{stats.prices}</div>
          <div className="text-[10px] text-slate-400 font-semibold uppercase">Preços</div>
        </div>
      </div>

      {/* SEÇÃO 1: Exportar Planilha Excel */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">Planilha Excel (.xlsx)</h3>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              Gera arquivo nativo com 3 abas organizadas: <strong>Mercados</strong>,{' '}
              <strong>Produtos</strong> e <strong>Preços</strong> (valores numéricos e datas
              formatadas).
            </p>
          </div>
        </div>

        {excelSuccessMsg && (
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-600/50 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{excelSuccessMsg}</span>
          </div>
        )}

        <button
          type="button"
          disabled={exportingExcel}
          onClick={handleExportExcel}
          className="w-full h-13 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
        >
          <Share2 className="w-5 h-5 stroke-[2.5]" />
          <span>{exportingExcel ? 'Gerando planilha...' : 'Compartilhar Planilha Excel'}</span>
        </button>
      </div>

      {/* SEÇÃO 2: Backup e Restauração JSON */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-teal-500/20 text-teal-400 rounded-xl">
            <FileJson className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">Cópia de Segurança (Backup JSON)</h3>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              Exporte todos os cadastros e histórico para um arquivo JSON ou restaure em caso de troca
              de aparelho.
            </p>
          </div>
        </div>

        {importNotice && (
          <div className="p-3 rounded-xl bg-teal-950/80 border border-teal-600/50 text-xs text-teal-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{importNotice}</span>
          </div>
        )}

        {importError && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-600/50 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{importError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handleExportJSON}
            className="h-12 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-white font-semibold text-xs border border-slate-700 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Exportar Backup JSON</span>
          </button>

          <label className="h-12 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-white font-semibold text-xs border border-slate-700 flex items-center justify-center gap-2 cursor-pointer transition-all">
            <Upload className="w-4 h-4 text-teal-400" />
            <span>Restaurar de Arquivo JSON</span>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Modal de Escolha da Importação (Substituir vs Mesclar) */}
      {showReplaceModal && pendingBackupData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center mx-auto">
              <Upload className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-white">Como deseja importar o backup?</h3>
              <p className="text-xs text-slate-400 mt-1">
                O arquivo contém <strong>{pendingBackupData.markets?.length || 0}</strong> mercados,{' '}
                <strong>{pendingBackupData.products?.length || 0}</strong> produtos e{' '}
                <strong>{pendingBackupData.prices?.length || 0}</strong> preços.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => handleConfirmImport('merge')}
                className="w-full p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left transition-all cursor-pointer"
              >
                <div className="font-bold text-sm text-emerald-400">1. Mesclar com os dados atuais (Recomendado)</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Mantém o que você já tem no celular e adiciona os itens novos sem duplicar códigos de barras ou nomes de mercados.
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleConfirmImport('replace')}
                className="w-full p-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/40 border border-rose-800/60 text-left transition-all cursor-pointer"
              >
                <div className="font-bold text-sm text-rose-300 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  2. Substituir TODOS os dados existentes
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Apaga a base atual e carrega exatamente o que está neste arquivo de backup.
                </div>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowReplaceModal(false);
                setPendingBackupData(null);
              }}
              className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
