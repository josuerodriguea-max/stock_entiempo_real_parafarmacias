// js/export-csv.js
// Exportador CSV genérico. Exponer exportToCsv y hook para botón #btnExportStock

(function(){
  function escapeCell(v) {
    if (v === null || v === undefined) return '';
    const s = String(v).replace(/"/g, '""');
    return s.search(/("|,|\n)/) >= 0 ? `"${s}"` : s;
  }

  function arrayToCsv(items, keys) {
    const header = keys.join(',');
    const rows = items.map(obj => keys.map(k => escapeCell(obj[k])).join(','));
    return [header, ...rows].join('\r\n');
  }

  async function exportToCsv(filename = 'reporte_stock.csv', items = []) {
    if (!Array.isArray(items)) throw new Error('exportToCsv: items debe ser arreglo');
    if (items.length === 0) {
      if (window.appState && Array.isArray(window.appState.medicines) && window.appState.medicines.length > 0) {
        items = window.appState.medicines;
      } else {
        console.warn('exportToCsv: no hay datos para exportar');
        return;
      }
    }
    const keys = Object.keys(items[0]);
    const csv = arrayToCsv(items, keys);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btnExportStock');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      const items = (window.appState && Array.isArray(window.appState.medicines)) ? window.appState.medicines : [];
      await exportToCsv('reporte_stock.csv', items);
    });
  });

  window.exportToCsv = exportToCsv;
})();
