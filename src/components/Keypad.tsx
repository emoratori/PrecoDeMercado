import React from 'react';
import { Delete, RotateCcw, Check } from 'lucide-react';

interface KeypadProps {
  valueCents: number;
  onChange: (cents: number) => void;
  onSave: () => void;
  onCancel?: () => void;
  disabled?: boolean;
}

export function formatCurrencyCents(cents: number): string {
  const value = cents / 100;
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export const Keypad: React.FC<KeypadProps> = ({
  valueCents,
  onChange,
  onSave,
  onCancel,
  disabled = false,
}) => {
  const handleDigit = (digit: number) => {
    if (disabled) return;
    // Máscara de caixa eletrônico/maquininha: empurra dígitos para a esquerda
    // Limite razoável para evitar overflow (ex: até R$ 9.999,99 = 999999 centavos)
    if (valueCents > 99999) return;
    const nextValue = valueCents * 10 + digit;
    onChange(nextValue);
  };

  const handleBackspace = () => {
    if (disabled) return;
    const nextValue = Math.floor(valueCents / 10);
    onChange(nextValue);
  };

  const handleClear = () => {
    if (disabled) return;
    onChange(0);
  };

  // Suporte a teclado físico também (para desktop/notebooks)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigit(parseInt(e.key, 10));
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        handleClear();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (valueCents > 0) {
          onSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [valueCents, disabled]);

  const canSave = valueCents > 0 && !disabled;

  return (
    <div className="w-full select-none bg-slate-900/95 backdrop-blur-md rounded-t-2xl p-4 shadow-2xl border-t border-slate-700/60">
      {/* Display do Preço em destaque */}
      <div className="mb-3 text-center">
        <span className="text-xs font-semibold tracking-wider uppercase text-emerald-400">
          Digite o Preço (Centavos Contínuos)
        </span>
        <div className="mt-1 flex items-baseline justify-center gap-1">
          <div
            className={`text-3xl sm:text-4xl font-extrabold tracking-tight px-4 py-2 rounded-xl transition-all ${
              valueCents > 0
                ? 'text-white bg-slate-800/80 ring-2 ring-emerald-500/50'
                : 'text-slate-400 bg-slate-800/40'
            }`}
          >
            {formatCurrencyCents(valueCents)}
          </div>
        </div>
      </div>

      {/* Grid de Dígitos 3x4 */}
      <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto mb-3">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
          <button
            key={digit}
            type="button"
            onClick={() => handleDigit(digit)}
            className="h-13 sm:h-14 bg-slate-800 hover:bg-slate-700 active:bg-emerald-600 active:scale-95 text-white text-2xl font-bold rounded-xl shadow transition-all duration-75 flex items-center justify-center cursor-pointer border border-slate-700/50"
          >
            {digit}
          </button>
        ))}

        {/* Botão Limpar (C) */}
        <button
          type="button"
          onClick={handleClear}
          className="h-13 sm:h-14 bg-slate-800/80 hover:bg-rose-900/40 active:bg-rose-800 text-rose-300 text-base font-semibold rounded-xl transition-all flex flex-col items-center justify-center cursor-pointer border border-slate-700/50"
          title="Limpar tudo"
        >
          <RotateCcw className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-wide uppercase">Limpar</span>
        </button>

        {/* Botão 0 */}
        <button
          type="button"
          onClick={() => handleDigit(0)}
          className="h-13 sm:h-14 bg-slate-800 hover:bg-slate-700 active:bg-emerald-600 active:scale-95 text-white text-2xl font-bold rounded-xl shadow transition-all duration-75 flex items-center justify-center cursor-pointer border border-slate-700/50"
        >
          0
        </button>

        {/* Botão Backspace */}
        <button
          type="button"
          onClick={handleBackspace}
          className="h-13 sm:h-14 bg-slate-800/80 hover:bg-amber-900/40 active:bg-amber-800 text-amber-300 text-base font-semibold rounded-xl transition-all flex flex-col items-center justify-center cursor-pointer border border-slate-700/50"
          title="Apagar último dígito"
        >
          <Delete className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-wide uppercase">Apagar</span>
        </button>
      </div>

      {/* Botão Gigante de Salvar acessível pelo polegar */}
      <div className="max-w-sm mx-auto flex items-center gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="h-14 px-4 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 font-semibold rounded-xl transition-all text-sm border border-slate-700 cursor-pointer"
          >
            Cancelar
          </button>
        )}

        <button
          type="button"
          disabled={!canSave}
          onClick={onSave}
          className={`flex-1 h-14 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] cursor-pointer ${
            canSave
              ? 'bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 shadow-emerald-500/30'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
          }`}
        >
          <Check className="w-6 h-6 stroke-[3]" />
          <span>SALVAR PREÇO {valueCents > 0 ? `(${formatCurrencyCents(valueCents)})` : ''}</span>
        </button>
      </div>
    </div>
  );
};
