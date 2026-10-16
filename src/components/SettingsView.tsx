import React, { useState } from 'react';
import { storage } from '../services/storage';
import { AppSettings } from '../types';
import {
  Settings,
  Compass,
  Volume2,
  VolumeX,
  Smartphone,
  Trash2,
  AlertTriangle,
  Info,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(storage.getSettings());
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleUpdate = (updates: Partial<AppSettings>) => {
    const updated = storage.updateSettings(updates);
    setSettings(updated);
  };

  const handleResetDatabase = () => {
    storage.resetDatabase();
    setShowResetConfirm(false);
    setResetSuccess(true);
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white overflow-y-auto p-4 space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-emerald-400" />
          Configurações
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Preferências locais do aplicativo e comportamento do scanner.
        </p>
      </div>

      {/* Raio Padrão do GPS */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
        <div className="flex items-center gap-2.5">
          <Compass className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="font-bold text-sm text-white">Raio de Sugestão de Mercado</h3>
            <p className="text-[11px] text-slate-400">
              Distância máxima para sugerir um mercado próximo na abertura.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 pt-1">
          {[
            { label: '500 m', value: 500 },
            { label: '1 km', value: 1000 },
            { label: '2 km', value: 2000 },
            { label: '5 km', value: 5000 },
            { label: 'Sem limite', value: 0 },
          ].map((item) => {
            const isSelected = settings.gpsRadiusMeters === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => handleUpdate({ gpsRadiusMeters: item.value })}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feedback do Leitor (Som e Vibração Háptica) */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-emerald-400" />
          Feedback de Leitura do Código de Barras
        </h3>

        <div className="space-y-2.5">
          {/* Vibração Háptica */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-800">
            <div>
              <div className="text-sm font-semibold text-white">Vibração Háptica Curta</div>
              <div className="text-[11px] text-slate-400">
                Pulso físico imediato ao detectar o código de barras
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleUpdate({ vibrationEnabled: !settings.vibrationEnabled })}
              className={`w-12 h-7 rounded-full transition-colors relative cursor-pointer ${
                settings.vibrationEnabled ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-transform ${
                  settings.vibrationEnabled ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Som de Bip Óptico */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-800">
            <div>
              <div className="text-sm font-semibold text-white">Som de Leitura (Bip)</div>
              <div className="text-[11px] text-slate-400">
                Tom clássico e suave de caixa registradora
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleUpdate({ soundEnabled: !settings.soundEnabled })}
              className={`w-12 h-7 rounded-full transition-colors relative cursor-pointer ${
                settings.soundEnabled ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-transform ${
                  settings.soundEnabled ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Informações da Arquitetura e Hospedagem R$ 0,00 */}
      <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl space-y-2">
        <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
          <Sparkles className="w-4 h-4" />
          Hospedagem & Arquitetura Gratuita (PWA)
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Como este app é 100% estático (não usa servidores nem bancos na nuvem), você pode publicá-lo
          no <strong>GitHub Pages</strong>, <strong>Cloudflare Pages</strong> ou <strong>Vercel Hobby</strong> com custo <strong>R$ 0,00 para sempre</strong>.
        </p>
        <p className="text-xs text-slate-400 leading-relaxed">
          No navegador Chrome do Android, basta tocar no menu de 3 pontinhos e selecionar{' '}
          <strong className="text-white">"Adicionar à tela inicial"</strong> para utilizá-lo como um app nativo, inclusive em modo avião.
        </p>
      </div>

      {/* Zona de Perigo: Limpar todos os dados */}
      <div className="p-4 bg-rose-950/20 border border-rose-900/40 rounded-2xl space-y-3">
        <h3 className="font-bold text-sm text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          Limpar Todos os Dados
        </h3>
        <p className="text-xs text-slate-400">
          Restaura o banco de dados para os valores de fábrica iniciais. Essa ação não pode ser desfeita.
        </p>

        {resetSuccess && (
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Dados reinicializados com sucesso. Recarregando aplicativo...</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowResetConfirm(true)}
          className="h-11 px-4 rounded-xl bg-rose-900/40 hover:bg-rose-900/70 border border-rose-800 text-rose-300 hover:text-white font-semibold text-xs flex items-center gap-2 cursor-pointer transition-all"
        >
          <Trash2 className="w-4 h-4" />
          <span>Restaurar Base de Dados</span>
        </button>
      </div>

      {/* Modal Confirmação Dupla */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-rose-900/60 rounded-3xl p-5 shadow-2xl text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Tem certeza absoluta?</h3>
            <p className="text-xs text-rose-300">
              Todos os mercados, produtos e preços que você registrou serão substituídos pelos dados iniciais de demonstração.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-sm hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleResetDatabase}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-md"
              >
                Sim, Limpar Tudo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Versão do App */}
      <div className="text-center pt-2 pb-6 text-[11px] text-slate-500 font-medium">
        Preço de Mercado - Moratori v1.0
      </div>
    </div>
  );
};
