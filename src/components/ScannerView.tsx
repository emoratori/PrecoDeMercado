import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
import { Market, Product, PriceRecord, ScannerStatus } from '../types';
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
  AlertTriangle,
  CheckCircle2,
  PackagePlus,
  RefreshCw,
  Trash2,
  Calendar,
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

  // Price history display state for PRICE_SAVED screen
  const [productPricesHistory, setProductPricesHistory] = useState<PriceRecord[]>([]);
  const [historySortMode, setHistorySortMode] = useState<'lowest' | 'recent'>('lowest');
  const [priceToDelete, setPriceToDelete] = useState<PriceRecord | null>(null);

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
  const isScanningActiveRef = useRef<boolean>(false);
  const animationFrameIdRef = useRef<number | null>(null);
  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  // Load known brands
  useEffect(() => {
    setKnownBrands(storage.getAllKnownBrands());
  }, []);

  // Format date time helper (ex: 17/10/2026 às 00:43)
  const formatDateTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} às ${hours}:${minutes}`;
    } catch {
      return isoString;
    }
  };

  // Market name lookup helper
  const getMarketName = (marketId: number): string => {
    const market = storage.getMarketById(marketId);
    return market ? market.name : 'Mercado desconhecido';
  };

  // Stop camera stream completely to save battery and ensure a clean state
  const stopCamera = useCallback(() => {
    isScanningActiveRef.current = false;
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore track stop error
        }
      });
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsTorchOn(false);
  }, []);

  // Continuous Detection Loop (uses Native BarcodeDetector if available, ZXing as fallback)
  const startDetectionLoop = useCallback((onDetected: (code: string) => void) => {
    let lastScanTime = 0;
    const scanIntervalMs = 100; // 10 scans per second for instant barcode capture

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
                  onDetected(detectedCode);
                  return; // Stop this loop instance as onDetected closes the camera
                }
              }
            } else if (zxingReaderRef.current && isScanningActiveRef.current) {
              const result = zxingReaderRef.current.decode(videoRef.current);
              if (result && isScanningActiveRef.current) {
                onDetected(result.getText());
                return;
              }
            }
          } catch {
            // Normal scan miss between frames
          }
        }
      }

      if (isScanningActiveRef.current) {
        animationFrameIdRef.current = requestAnimationFrame(loop);
      }
    };

    animationFrameIdRef.current = requestAnimationFrame(loop);
  }, []);

  // Handle barcode scanned (from camera or manual entry)
  const handleBarcodeDetected = useCallback((barcode: string) => {
    const clean = barcode.trim();
    if (!clean) return;

    // 1. Immediately shut down the camera completely
    stopCamera();

    // 2. Instant tactile and audio feedback
    const settings = storage.getSettings();
    playScanFeedback(settings.soundEnabled, settings.vibrationEnabled);

    setScannedBarcode(clean);

    // 3. Look up product
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
  }, [stopCamera]);

  // Initialize Camera Stream directly using getUserMedia
  const initCamera = useCallback(async () => {
    try {
      setCameraError(null);
      stopCamera();

      // Request camera fresh
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

      // Start detection loop fresh
      isScanningActiveRef.current = true;
      startDetectionLoop(handleBarcodeDetected);
    } catch (err: unknown) {
      console.warn('Camera access error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
        setCameraError('Permissão da câmera não concedida. Permita o acesso nas configurações do navegador ou digite o código.');
      } else {
        setCameraError('Não foi possível iniciar a câmera deste aparelho. Use a digitação manual ou os testes rápidos.');
      }
    }
  }, [stopCamera, startDetectionLoop, handleBarcodeDetected]);

  // Start camera on initial mount
  useEffect(() => {
    initCamera();

    return () => {
      stopCamera();
    };
  }, []);

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

      // Load updated price history for this product
      const updatedHistory = storage.getPricesForProduct(currentProduct.id);
      setProductPricesHistory(updatedHistory);

      // Read default sort preference from settings (either 'lowest' or 'recent')
      const settings = storage.getSettings();
      setHistorySortMode(settings.defaultPriceSort || 'lowest');

      setScannerStatus('PRICE_SAVED');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao salvar preço.');
    }
  };

  // Confirm delete price handler
  const handleConfirmDeletePrice = () => {
    if (!priceToDelete || !currentProduct) return;
    try {
      storage.deletePrice(priceToDelete.id);
      const updatedHistory = storage.getPricesForProduct(currentProduct.id);
      setProductPricesHistory(updatedHistory);
      setPriceToDelete(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao excluir preço.');
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
    setProductPricesHistory([]);
    setPriceToDelete(null);
    setScannerStatus('WAITING_SCAN');

    // Turn camera back on fresh for the next reading
    initCamera();
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

  // Sorted prices for history view
  const sortedHistoryPrices = [...productPricesHistory].sort((a, b) => {
    if (historySortMode === 'lowest') {
      if (a.price_cents !== b.price_cents) {
        return a.price_cents - b.price_cents;
      }
      return new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime();
    }
    return new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime();
  });

  const lowestHistoryPriceCents = productPricesHistory.length > 0
    ? Math.min(...productPricesHistory.map((p) => p.price_cents))
    : 0;

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

      {/* 2. Área Central: Câmera (WAITING_SCAN) OU Histórico Completo (PRICE_SAVED) OU Repouso */}
      <div className="relative flex-1 bg-slate-950 flex flex-col overflow-hidden">
        {/* Quando estiver escaneando: exibe o visor de câmera */}
        {scannerStatus === 'WAITING_SCAN' && (
          <div className="relative w-full h-full bg-black flex flex-col justify-center items-center overflow-hidden">
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className="w-full h-full object-cover"
            />

            {/* Overlay com mira óptica */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6 z-10">
              <div className="relative w-72 h-44 border-2 border-emerald-400/80 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center">
                <div className="w-full h-0.5 bg-rose-500/80 shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-pulse" />
                <div className="absolute top-1 left-1 w-4 h-4 border-t-2 border-l-2 border-white rounded-tl-sm" />
                <div className="absolute top-1 right-1 w-4 h-4 border-t-2 border-r-2 border-white rounded-tr-sm" />
                <div className="absolute bottom-1 left-1 w-4 h-4 border-b-2 border-l-2 border-white rounded-bl-sm" />
                <div className="absolute bottom-1 right-1 w-4 h-4 border-b-2 border-r-2 border-white rounded-br-sm" />
              </div>

              <p className="mt-4 text-xs font-medium text-white/90 bg-slate-900/80 px-3.5 py-1.5 rounded-full backdrop-blur-sm border border-slate-700/50">
                Aponte para o código de barras do produto
              </p>
            </div>

            {/* Botões Lanterna e Digitar Código */}
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

            {/* Testes Rápidos */}
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

            {/* Erro de Câmera */}
            {cameraError && (
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
        )}

        {/* ESTADO PRICE_SAVED: EXIBIÇÃO DO HISTÓRICO COMPLETO (Exatamente como Sugerido.png) */}
        {scannerStatus === 'PRICE_SAVED' && (
          <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-200">
            {/* 1. Banner de Sucesso */}
            <div className="mx-4 mt-3 p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-600/50 flex items-center gap-3 shrink-0 shadow-lg">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-emerald-300">
                  {savedPriceNotice || 'Preço salvo com sucesso'}
                </div>
                <div className="text-sm font-bold text-white truncate">
                  {currentProduct?.name} {currentProduct?.unit ? `(${currentProduct.unit})` : ''}
                </div>
              </div>
            </div>

            {/* 2. Cabeçalho do Histórico com Abas de Ordenação */}
            <div className="px-4 pt-3.5 pb-2 flex items-center justify-between shrink-0">
              <span className="text-xs font-extrabold text-slate-300 tracking-wider">
                HISTÓRICO ({productPricesHistory.length})
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setHistorySortMode('lowest')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    historySortMode === 'lowest'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  Menor Preço
                </button>
                <button
                  type="button"
                  onClick={() => setHistorySortMode('recent')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    historySortMode === 'recent'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  Mais Recente
                </button>
              </div>
            </div>

            {/* 3. Lista de Preços com Rolagem */}
            <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-2.5">
              {sortedHistoryPrices.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  Nenhum registro de preço encontrado.
                </div>
              ) : (
                sortedHistoryPrices.map((item) => {
                  const isLowest = item.price_cents === lowestHistoryPriceCents;
                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                        isLowest
                          ? 'bg-emerald-950/20 border-emerald-500/60 shadow-md'
                          : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5 text-sm font-bold text-white truncate">
                          <Store className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="truncate">{getMarketName(item.market_id)}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-1">
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          <span>{formatDateTime(item.recorded_at)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="text-base font-extrabold text-white">
                          {formatCurrencyCents(item.price_cents)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPriceToDelete(item)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                          title="Excluir este preço"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Em outros estados (PRODUCT_FOUND ou NEW_PRODUCT), câmera desligada */}
        {scannerStatus !== 'WAITING_SCAN' && scannerStatus !== 'PRICE_SAVED' && (
          <div className="flex-1 bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-2">
              <Camera className="w-6 h-6" />
            </div>
            <div className="text-xs font-semibold text-slate-300">
              Câmera desligada
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs">
              A câmera fica em repouso economizando bateria enquanto você registra o preço.
            </p>
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

      {/* ESTADO 3: PREÇO SALVO -> Apenas o BOTÃO GIGANTE "PRÓXIMO PRODUTO" na base fixa */}
      {scannerStatus === 'PRICE_SAVED' && (
        <div className="shrink-0 bg-slate-950 px-4 pt-2 pb-4 z-30">
          <button
            type="button"
            autoFocus
            onClick={handleNextProduct}
            className="w-full h-15 sm:h-16 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 active:scale-[0.98] text-slate-950 font-black text-lg tracking-wide uppercase shadow-2xl shadow-emerald-500/40 flex items-center justify-center gap-2.5 cursor-pointer transition-all border border-emerald-300"
          >
            <Camera className="w-6 h-6 stroke-[2.5]" />
            <span>PRÓXIMO PRODUTO</span>
          </button>
        </div>
      )}

      {/* Modal de Confirmação para Excluir Registro de Preço */}
      {priceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-rose-900/60 rounded-3xl p-5 shadow-2xl text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Excluir este preço?</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Você deseja apagar o registro de <strong className="text-white">{formatCurrencyCents(priceToDelete.price_cents)}</strong> feito em <strong className="text-white">{getMarketName(priceToDelete.market_id)}</strong> em {formatDateTime(priceToDelete.recorded_at)}?
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPriceToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-sm hover:bg-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePrice}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-md cursor-pointer"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
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
