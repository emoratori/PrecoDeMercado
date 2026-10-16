import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
import { Market, Product, ScannerStatus } from '../types';
import { storage } from '../services/storage';
import { playScanFeedback, playSuccessSound } from '../services/audioHaptics';
import { Keypad, formatCurrencyCents } from './Keypad';
import {
  Camera,
  Flashlight,
  FlashlightOff,
  Keyboard,
  Barcode as BarcodeIcon,
  Store,
  ChevronRight,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  PackagePlus,
  RefreshCw,
} from 'lucide-react';

interface ScannerViewProps {
  currentMarket: Market;
  onChangeMarket: () => void;
}

export const ScannerView: React.FC<ScannerViewProps> = ({
  currentMarket,
  onChangeMarket,
}) => {
  const [scannerStatus, setScannerStatus] = useState<ScannerStatus>('WAITING_SCAN');
  const [scannedBarcode, setScannedBarcode] = useState<string>('');
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [lowestPriceInfo, setLowestPriceInfo] = useState<{
    priceCents: number;
    marketName: string;
    recordedAt: string;
  } | null>(null);

  // Keypad state
  const [priceCents, setPriceCents] = useState<number>(0);
  const [savedPriceNotice, setSavedPriceNotice] = useState<string | null>(null);

  // New product form state: radio button [ml] e [g] + campo numérico para valor
  const [newProductName, setNewProductName] = useState('');
  const [newProductBrand, setNewProductBrand] = useState('');
  const [newProductUnitType, setNewProductUnitType] = useState<'ml' | 'g'>('g');
  const [newProductQuantity, setNewProductQuantity] = useState<string>('');
  const [knownBrands, setKnownBrands] = useState<string[]>([]);
  const [brandSuggestions, setBrandSuggestions] = useState<string[]>([]);
  const [showBrandSuggestions, setShowBrandSuggestions] = useState(false);

  // Camera & hardware controls
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [manualCodeModal, setManualCodeModal] = useState(false);
  const [manualCodeInput, setManualCodeInput] = useState('');

  // Native Video & Stream Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const isScanningActiveRef = useRef<boolean>(true);
  const animationFrameIdRef = useRef<number | null>(null);
  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  // Load known brands
  useEffect(() => {
    setKnownBrands(storage.getAllKnownBrands());
  }, []);

  // Sync ref with scannerStatus to avoid stale closures
  useEffect(() => {
    isScanningActiveRef.current = scannerStatus === 'WAITING_SCAN';
  }, [scannerStatus]);

  // Handle barcode scanned (from camera or manual entry)
  const handleBarcodeDetected = useCallback((barcode: string) => {
    const clean = barcode.trim();
    if (!clean) return;

    // Immediately stop further scan triggers to prevent loop/flicker
    isScanningActiveRef.current = false;

    // Pause video
    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch {
        // Ignore pause error
      }
    }

    // Instant tactile and audio feedback
    const settings = storage.getSettings();
    playScanFeedback(settings.soundEnabled, settings.vibrationEnabled);

    setScannedBarcode(clean);

    // Look up product
    const existing = storage.getProductByBarcode(clean);
    if (existing) {
      setCurrentProduct(existing);
      const lowest = storage.getLowestPriceForProduct(existing.id);
      setLowestPriceInfo(lowest);
      setPriceCents(0);
      setScannerStatus('PRODUCT_FOUND');
    } else {
      // New product inline flow
      setCurrentProduct(null);
      setLowestPriceInfo(null);
      setNewProductName('');
      setNewProductBrand('');
      setNewProductUnitType('g');
      setNewProductQuantity('');
      setScannerStatus('NEW_PRODUCT');
    }
  }, []);

  // Initialize Camera Stream directly using getUserMedia
  const initCamera = useCallback(async () => {
    try {
      setCameraError(null);
      isScanningActiveRef.current = true;

      // Stop any existing stream
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }

      // Request camera
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play().catch(() => {});
      }

      // Check torch capability
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        try {
          const capabilities = videoTrack.getCapabilities?.() as { torch?: boolean };
          if (capabilities && capabilities.torch) {
            setTorchSupported(true);
          }
        } catch {
          // Ignore capabilities check failure
        }
      }

      // Start Barcode Detection Loop
      startDetectionLoop();
    } catch (err: unknown) {
      console.warn('Camera access error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
        setCameraError('Permissão da câmera não concedida. Permita o acesso nas configurações do navegador ou digite o código.');
      } else {
        setCameraError('Não foi possível iniciar a câmera deste aparelho. Use a digitação manual ou os testes rápidos.');
      }
    }
  }, []);

  // Continuous Detection Loop (uses Native BarcodeDetector if available, ZXing as fallback)
  const startDetectionLoop = useCallback(() => {
    let lastScanTime = 0;
    const scanIntervalMs = 120; // 8 scans per second is ideal for accuracy and zero lag

    // Check if browser has native BarcodeDetector API (Android Chrome has it built-in!)
    const hasNativeBarcodeDetector =
      typeof window !== 'undefined' && 'BarcodeDetector' in window;

    let nativeDetector: any = null;
    if (hasNativeBarcodeDetector) {
      try {
        const BarcodeDetectorClass = (window as any).BarcodeDetector;
        nativeDetector = new BarcodeDetectorClass({
          formats: [
            'ean_13',
            'ean_8',
            'upc_a',
            'upc_e',
            'code_128',
            'code_39',
            'qr_code',
          ],
        });
      } catch {
        nativeDetector = null;
      }
    }

    // Fallback ZXing reader
    if (!nativeDetector && !zxingReaderRef.current) {
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_128,
        BarcodeFormat.QR_CODE,
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);
      zxingReaderRef.current = new BrowserMultiFormatReader(hints);
    }

    const loop = async (timestamp: number) => {
      if (isScanningActiveRef.current && videoRef.current && videoRef.current.readyState >= 2) {
        if (timestamp - lastScanTime >= scanIntervalMs) {
          lastScanTime = timestamp;

          try {
            if (nativeDetector) {
              const barcodes = await nativeDetector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0 && isScanningActiveRef.current) {
                const detectedCode = barcodes[0].rawValue;
                if (detectedCode) {
                  handleBarcodeDetected(detectedCode);
                  return; // Stop loop once detected
                }
              }
            } else if (zxingReaderRef.current && isScanningActiveRef.current) {
              // Fallback decode from video element
              const result = zxingReaderRef.current.decode(videoRef.current);
              if (result && isScanningActiveRef.current) {
                handleBarcodeDetected(result.getText());
                return;
              }
            }
          } catch {
            // Normal scan miss between frames
          }
        }
      }

      animationFrameIdRef.current = requestAnimationFrame(loop);
    };

    animationFrameIdRef.current = requestAnimationFrame(loop);
  }, [handleBarcodeDetected]);

  // Start camera on mount
  useEffect(() => {
    initCamera();

    return () => {
      // Cleanup on unmount
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
    };
  }, [initCamera]);

  // Toggle Flashlight
  const toggleTorch = async () => {
    if (!mediaStreamRef.current || !torchSupported) return;
    try {
      const track = mediaStreamRef.current.getVideoTracks()[0];
      const nextTorch = !isTorchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setIsTorchOn(nextTorch);
    } catch (err) {
      console.warn('Torch toggle error:', err);
    }
  };

  // Save Price Handler
  const handleSavePrice = () => {
    if (!currentProduct || priceCents <= 0) return;

    try {
      storage.addPrice(currentProduct.id, currentMarket.id, priceCents);
      playSuccessSound();
      setSavedPriceNotice(`Preço salvo com sucesso: ${formatCurrencyCents(priceCents)}`);
      setScannerStatus('PRICE_SAVED');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao salvar preço.');
    }
  };

  // Create New Product and proceed immediately to Keypad
  const handleCreateNewProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim() || !scannedBarcode) return;

    const cleanQty = newProductQuantity.trim().replace(',', '.');
    const numQty = parseFloat(cleanQty);
    let finalUnit: string = newProductUnitType;
    if (!isNaN(numQty) && numQty > 0) {
      const formattedQty = cleanQty.replace('.', ',');
      finalUnit = `${formattedQty} ${newProductUnitType}`;
    }

    try {
      const created = storage.addProduct(
        scannedBarcode,
        newProductName.trim(),
        newProductBrand.trim() || undefined,
        finalUnit || undefined
      );

      // Refresh known brands list
      setKnownBrands(storage.getAllKnownBrands());
      setCurrentProduct(created);
      setLowestPriceInfo(null);
      setPriceCents(0);
      setScannerStatus('PRODUCT_FOUND');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao cadastrar produto.');
    }
  };

  // Reset and restart scanner for next product
  const handleNextProduct = () => {
    setScannedBarcode('');
    setCurrentProduct(null);
    setLowestPriceInfo(null);
    setPriceCents(0);
    setSavedPriceNotice(null);
    setScannerStatus('WAITING_SCAN');

    // Resume video and scanner loop cleanly
    isScanningActiveRef.current = true;
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  // Brand autocomplete logic
  const handleBrandChange = (value: string) => {
    setNewProductBrand(value);
    if (!value.trim()) {
      setBrandSuggestions([]);
      setShowBrandSuggestions(false);
      return;
    }
    const query = value.toLowerCase();
    const matches = knownBrands.filter((b) => b.toLowerCase().includes(query));
    setBrandSuggestions(matches);
    setShowBrandSuggestions(matches.length > 0);
  };

  const handleSelectBrand = (brand: string) => {
    setNewProductBrand(brand);
    setShowBrandSuggestions(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white select-none overflow-hidden relative">
      {/* 1. Header Fixo: Mercado Ativo e Troca Rápida */}
      <header className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Store className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Mercado Ativo
            </div>
            <div className="text-sm font-bold text-white truncate max-w-[190px] sm:max-w-xs">
              {currentMarket.name}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onChangeMarket}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs font-semibold text-emerald-400 border border-slate-700 flex items-center gap-1 cursor-pointer transition-all"
        >
          <span>Trocar</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </header>

      {/* 2. Área Central: Câmera Nativa sem dependências intrusivas */}
      <div className="relative flex-1 bg-black flex flex-col justify-center items-center overflow-hidden">
        {/* Elemento de Vídeo Real HTML5 */}
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          className="w-full h-full object-cover"
        />

        {/* Overlay com mira óptica exclusivo do estado WAITING_SCAN */}
        {scannerStatus === 'WAITING_SCAN' && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6 z-10">
            {/* Retângulo de mira centralizado */}
            <div className="relative w-72 h-44 border-2 border-emerald-400/80 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center">
              {/* Linha vermelha central de leitor a laser */}
              <div className="w-full h-0.5 bg-rose-500/80 shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-pulse" />

              {/* Cantoneiras estéticas de foco */}
              <div className="absolute top-1 left-1 w-4 h-4 border-t-2 border-l-2 border-white rounded-tl-sm" />
              <div className="absolute top-1 right-1 w-4 h-4 border-t-2 border-r-2 border-white rounded-tr-sm" />
              <div className="absolute bottom-1 left-1 w-4 h-4 border-b-2 border-l-2 border-white rounded-bl-sm" />
              <div className="absolute bottom-1 right-1 w-4 h-4 border-b-2 border-r-2 border-white rounded-br-sm" />
            </div>

            <p className="mt-4 text-xs font-medium text-white/90 bg-slate-900/80 px-3.5 py-1.5 rounded-full backdrop-blur-sm border border-slate-700/50">
              Aponte para o código de barras do produto
            </p>
          </div>
        )}

        {/* Câmera pausada overlay (se produto detectado ou salvo) */}
        {scannerStatus !== 'WAITING_SCAN' && (
          <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 z-10">
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Câmera em pausa (Economizando bateria)
              </span>
            </div>
          </div>
        )}

        {/* Botões de Ação Rápida Flutuantes sobre a Câmera */}
        {scannerStatus === 'WAITING_SCAN' && (
          <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
            {torchSupported && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`p-2.5 rounded-xl border backdrop-blur-md transition-all cursor-pointer ${
                  isTorchOn
                    ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-lg shadow-amber-400/40'
                    : 'bg-slate-900/80 text-white border-slate-700 hover:bg-slate-800'
                }`}
                title="Lanterna"
              >
                {isTorchOn ? <Flashlight className="w-5 h-5" /> : <FlashlightOff className="w-5 h-5" />}
              </button>
            )}

            <button
              type="button"
              onClick={() => setManualCodeModal(true)}
              className="px-3 py-2 rounded-xl bg-slate-900/85 hover:bg-slate-800 active:scale-95 text-white border border-slate-700 backdrop-blur-md flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-md"
            >
              <Keyboard className="w-4 h-4 text-emerald-400" />
              <span>Digitar código</span>
            </button>
          </div>
        )}

        {/* Simulador rápido de Códigos para Teste Rápido */}
        {scannerStatus === 'WAITING_SCAN' && (
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center gap-1.5 z-20 flex-wrap">
            <span className="text-[10px] text-slate-400 bg-black/60 px-2 py-0.5 rounded-md">
              Testar rápido:
            </span>
            <button
              type="button"
              onClick={() => handleBarcodeDetected('7891000100103')}
              className="text-[11px] bg-slate-900/80 hover:bg-emerald-600/80 border border-slate-700 text-slate-200 px-2 py-1 rounded-lg backdrop-blur-sm cursor-pointer"
            >
              🥛 Leite Piracanjuba
            </button>
            <button
              type="button"
              onClick={() => handleBarcodeDetected('7891025114130')}
              className="text-[11px] bg-slate-900/80 hover:bg-emerald-600/80 border border-slate-700 text-slate-200 px-2 py-1 rounded-lg backdrop-blur-sm cursor-pointer"
            >
              🍚 Arroz Tio João
            </button>
            <button
              type="button"
              onClick={() => handleBarcodeDetected('7899999000001')}
              className="text-[11px] bg-emerald-950/80 hover:bg-emerald-800 border border-emerald-600/50 text-emerald-300 px-2 py-1 rounded-lg backdrop-blur-sm cursor-pointer"
            >
              ✨ + Produto Novo
            </button>
          </div>
        )}

        {/* Mensagem caso câmera não seja permitida */}
        {cameraError && scannerStatus === 'WAITING_SCAN' && (
          <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center z-30">
            <AlertCircle className="w-12 h-12 text-amber-400 mb-3" />
            <h3 className="text-base font-bold text-white mb-1">Acesso à Câmera</h3>
            <p className="text-xs text-slate-400 max-w-sm mb-4">{cameraError}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={initCamera}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Tentar Novamente
              </button>
              <button
                type="button"
                onClick={() => setManualCodeModal(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Keyboard className="w-3.5 h-3.5" />
                Digitar Código Manualmente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Área Inferior: Dinâmica de acordo com o Estado */}

      {/* ESTADO 1: PRODUTO ENCONTRADO -> Exibe Card e Keypad Nativo */}
      {scannerStatus === 'PRODUCT_FOUND' && currentProduct && (
        <div className="shrink-0 bg-slate-900 border-t border-slate-800 animate-in slide-in-from-bottom duration-200 z-30">
          {/* Card do Produto Identificado */}
          <div className="p-3.5 bg-slate-800/80 border-b border-slate-700/60 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {currentProduct.unit || 'un'}
                </span>
                {currentProduct.brand && (
                  <span className="text-xs font-semibold text-slate-300 truncate">
                    {currentProduct.brand}
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-white leading-tight mt-0.5 truncate">
                {currentProduct.name}
              </h3>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                <BarcodeIcon className="w-3.5 h-3.5" />
                {currentProduct.barcode}
              </div>
            </div>

            {/* Menor Preço Histórico para Comparação Imediata */}
            {lowestPriceInfo ? (
              <div className="text-right shrink-0 bg-slate-900/80 px-2.5 py-1.5 rounded-xl border border-slate-700/50">
                <div className="text-[10px] font-semibold text-emerald-400 flex items-center justify-end gap-1">
                  <TrendingDown className="w-3 h-3" />
                  Menor preço pago
                </div>
                <div className="text-sm font-extrabold text-white">
                  {formatCurrencyCents(lowestPriceInfo.priceCents)}
                </div>
                <div className="text-[9px] text-slate-400 truncate max-w-[110px]">
                  {lowestPriceInfo.marketName}
                </div>
              </div>
            ) : (
              <div className="text-right shrink-0 bg-slate-900/50 px-2.5 py-1.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400">1º registro de preço</span>
              </div>
            )}
          </div>

          {/* Keypad Numérico Nativo com Máscara de Centavos */}
          <Keypad
            valueCents={priceCents}
            onChange={setPriceCents}
            onSave={handleSavePrice}
            onCancel={handleNextProduct}
          />
        </div>
      )}

      {/* ESTADO 2: PRODUTO NOVO -> Formulário Inline */}
      {scannerStatus === 'NEW_PRODUCT' && (
        <form
          onSubmit={handleCreateNewProduct}
          className="shrink-0 bg-slate-900 border-t border-slate-800 p-4 space-y-3.5 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200 z-30"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <PackagePlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Novo Produto Detectado</h3>
                <p className="text-xs font-mono text-slate-400">{scannedBarcode}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleNextProduct}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 cursor-pointer"
            >
              Cancelar
            </button>
          </div>

          {/* Nome do Produto (Obrigatório) */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Nome do Produto *
            </label>
            <input
              type="text"
              autoFocus
              required
              placeholder="Ex: Azeite Extra Virgem"
              value={newProductName}
              onChange={(e) => setNewProductName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Marca com Autocomplete Baseado no Histórico */}
          <div className="relative">
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Marca (opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Gallo, Sadia, Nestlé"
              value={newProductBrand}
              onChange={(e) => handleBrandChange(e.target.value)}
              onFocus={() => {
                if (newProductBrand && brandSuggestions.length > 0) setShowBrandSuggestions(true);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            {/* Dropdown de sugestões de marca */}
            {showBrandSuggestions && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-40 max-h-36 overflow-y-auto">
                {brandSuggestions.map((brand) => (
                  <div
                    key={brand}
                    onClick={() => handleSelectBrand(brand)}
                    className="px-3.5 py-2 text-sm text-slate-200 hover:bg-emerald-600 hover:text-white cursor-pointer transition-colors"
                  >
                    {brand}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Seletor de Unidade: Radiobutton para [ml] e [g] + Campo Numérico para o Valor */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-300">
              Unidade de Medida
            </label>
            <div className="grid grid-cols-2 gap-2">
              {/* Radiobutton ml */}
              <label
                onClick={() => setNewProductUnitType('ml')}
                className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                  newProductUnitType === 'ml'
                    ? 'bg-emerald-500/20 border-emerald-500 ring-2 ring-emerald-500/30 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <input
                  type="radio"
                  name="unitType"
                  value="ml"
                  checked={newProductUnitType === 'ml'}
                  onChange={() => setNewProductUnitType('ml')}
                  className="w-4 h-4 text-emerald-500 focus:ring-emerald-500 bg-slate-900 border-slate-700"
                />
                <div className="flex flex-col">
                  <span className="font-bold text-sm">ml (Mililitros)</span>
                  <span className="text-[10px] text-slate-400">Líquidos e bebidas</span>
                </div>
              </label>

              {/* Radiobutton g */}
              <label
                onClick={() => setNewProductUnitType('g')}
                className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                  newProductUnitType === 'g'
                    ? 'bg-emerald-500/20 border-emerald-500 ring-2 ring-emerald-500/30 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <input
                  type="radio"
                  name="unitType"
                  value="g"
                  checked={newProductUnitType === 'g'}
                  onChange={() => setNewProductUnitType('g')}
                  className="w-4 h-4 text-emerald-500 focus:ring-emerald-500 bg-slate-900 border-slate-700"
                />
                <div className="flex flex-col">
                  <span className="font-bold text-sm">g (Gramas)</span>
                  <span className="text-[10px] text-slate-400">Peso e sólidos</span>
                </div>
              </label>
            </div>

            {/* Campo Numérico para o Valor em si (sem botões pré-definidos) */}
            <div className="pt-1">
              <label className="block text-[11px] text-slate-400 mb-1">
                Valor numérico ({newProductUnitType}):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder={newProductUnitType === 'ml' ? 'Ex: 350, 500, 1000' : 'Ex: 250, 500, 1000'}
                  value={newProductQuantity}
                  onChange={(e) => setNewProductQuantity(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-base font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <div className="px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-emerald-400 font-bold text-sm min-w-[50px] text-center">
                  {newProductUnitType}
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full h-13 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-base shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Salvar e Digitar Preço</span>
            <ChevronRight className="w-5 h-5 stroke-[2.5]" />
          </button>
        </form>
      )}

      {/* ESTADO 3: PREÇO SALVO -> Câmera Pausada e BOTÃO GIGANTE "PRÓXIMO PRODUTO" */}
      {scannerStatus === 'PRICE_SAVED' && (
        <div className="shrink-0 bg-slate-900 border-t border-slate-800 p-4 space-y-3 animate-in slide-in-from-bottom duration-200 z-30">
          {/* Confirmação do produto salvo */}
          <div className="p-3 rounded-2xl bg-emerald-950/80 border border-emerald-600/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <div className="text-xs font-semibold text-emerald-300">
                  {savedPriceNotice || 'Preço registrado com sucesso!'}
                </div>
                {currentProduct && (
                  <div className="text-sm font-bold text-white truncate max-w-[220px]">
                    {currentProduct.name}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* BOTÃO GIGANTE "PRÓXIMO PRODUTO" */}
          <button
            type="button"
            autoFocus
            onClick={handleNextProduct}
            className="w-full h-16 sm:h-18 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 active:scale-[0.98] text-slate-950 font-black text-xl tracking-wide uppercase shadow-2xl shadow-emerald-500/40 flex items-center justify-center gap-3 cursor-pointer transition-all border border-emerald-300"
          >
            <Camera className="w-7 h-7 stroke-[2.5]" />
            <span>PRÓXIMO PRODUTO</span>
          </button>
        </div>
      )}

      {/* Modal de Digitação Manual de Código */}
      {manualCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-2">
              <Keyboard className="w-5 h-5 text-emerald-400" />
              Digitar Código de Barras
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Digite os números impressos sob as barras do produto (ex: 7891234567890).
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (manualCodeInput.trim()) {
                  setManualCodeModal(false);
                  handleBarcodeDetected(manualCodeInput.trim());
                  setManualCodeInput('');
                }
              }}
            >
              <input
                type="text"
                autoFocus
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Ex: 7891000100103"
                value={manualCodeInput}
                onChange={(e) => setManualCodeInput(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-lg text-center tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-4"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setManualCodeModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-sm hover:bg-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!manualCodeInput.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-sm shadow-md cursor-pointer"
                >
                  Buscar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
