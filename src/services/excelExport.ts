import * as XLSX from 'xlsx';
import { Market, Product, PriceRecord } from '../types';

export async function exportToExcel(
  markets: Market[],
  products: Product[],
  prices: PriceRecord[]
): Promise<{ fileName: string; sharedNatively: boolean }> {
  const wb = XLSX.utils.book_new();

  // 1. Sheet: Mercados
  const marketsData = markets.map((m) => ({
    ID: m.id,
    Nome: m.name,
    Endereço: m.address || '',
    Latitude: m.latitude ?? '',
    Longitude: m.longitude ?? '',
    'Data de cadastro': new Date(m.created_at).toLocaleString('pt-BR'),
  }));
  const wsMarkets = XLSX.utils.json_to_sheet(marketsData);
  XLSX.utils.book_append_sheet(wb, wsMarkets, 'Mercados');

  // 2. Sheet: Produtos
  const productsData = products.map((p) => ({
    ID: p.id,
    'Código de barras': p.barcode,
    Nome: p.name,
    Marca: p.brand || '',
    Unidade: p.unit || '',
    'Data de cadastro': new Date(p.created_at).toLocaleString('pt-BR'),
  }));
  const wsProducts = XLSX.utils.json_to_sheet(productsData);
  XLSX.utils.book_append_sheet(wb, wsProducts, 'Produtos');

  // 3. Sheet: Precos
  const productsMap = new Map(products.map((p) => [p.id, p]));
  const marketsMap = new Map(markets.map((m) => [m.id, m]));

  const pricesData = prices.map((pr) => {
    const prod = productsMap.get(pr.product_id);
    const mkt = marketsMap.get(pr.market_id);
    return {
      ID: pr.id,
      Produto: prod ? prod.name : 'Produto removido',
      'Código de barras': prod ? prod.barcode : '',
      Mercado: mkt ? mkt.name : 'Mercado removido',
      Preço: Number((pr.price_cents / 100).toFixed(2)),
      'Data/hora': new Date(pr.recorded_at).toLocaleString('pt-BR'),
    };
  });
  const wsPrices = XLSX.utils.json_to_sheet(pricesData);
  XLSX.utils.book_append_sheet(wb, wsPrices, 'Precos');

  // Generate file buffer
  const today = new Date().toISOString().split('T')[0];
  const fileName = `precos_mercados_${today}.xlsx`;

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  // Try Android native sharing first via Web Share API
  let sharedNatively = false;
  if (
    typeof navigator !== 'undefined' &&
    'canShare' in navigator &&
    'share' in navigator
  ) {
    try {
      const file = new File([blob], fileName, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Planilha de Preços de Mercado',
          text: `Backup de preços gerado em ${new Date().toLocaleDateString('pt-BR')}`,
        });
        sharedNatively = true;
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.warn('Native share failed or dismissed, falling back to download', err);
      }
    }
  }

  // Fallback: direct download link if not shared natively or on desktop
  if (!sharedNatively) {
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
  }

  return { fileName, sharedNatively };
}
