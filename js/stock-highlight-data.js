/**
 * js/stock-highlight-data.js
 * Highlight table rows using data-stock and data-min attributes (robusto)
 * Usage:
 *   highlightStockByData('#inventoryTable', { minDefault: 5 });
 *   const observer = observeAndHighlightByData('#inventoryTable', { minDefault: 5 });
 */

function highlightStockByData(tableSelector, options = {}) {
  const { minDefault = 5, stockCellSelector = '.col-stock' } = options;
  const table = document.querySelector(tableSelector);
  if (!table) return;
  table.querySelectorAll('tbody tr').forEach(row => {
    const ds = row.dataset;
    let stock = typeof ds.stock !== 'undefined' ? Number(ds.stock) : NaN;
    if (Number.isNaN(stock)) {
      const cell = row.querySelector(stockCellSelector);
      if (cell) stock = Number(cell.textContent.replace(/[, ]/g,'')) || 0;
      else stock = 0;
    }
    const min = (typeof ds.min !== 'undefined') ? Number(ds.min) : Number(minDefault);
    row.classList.remove('stock-out','stock-low');
    row.removeAttribute('aria-errormessage');
    if (stock <= 0) {
      row.classList.add('stock-out');
      row.setAttribute('aria-errormessage','Stock agotado');
    } else if (stock <= min) {
      row.classList.add('stock-low');
      row.setAttribute('aria-errormessage','Stock bajo');
    }
  });
}

function observeAndHighlightByData(tableSelector, options = {}) {
  const table = document.querySelector(tableSelector);
  if (!table) return null;
  const tbody = table.querySelector('tbody') || table;
  const mo = new MutationObserver(() => highlightStockByData(tableSelector, options));
  mo.observe(tbody, { childList: true, subtree: true });
  highlightStockByData(tableSelector, options);
  return mo;
}

// Expose globally
window.highlightStockByData = highlightStockByData;
window.observeAndHighlightByData = observeAndHighlightByData;
