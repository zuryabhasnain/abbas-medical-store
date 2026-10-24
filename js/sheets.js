/**
 * Abbas Medical Store - Excel Spreadsheet & Google Sheets Live Sync Engine
 * Supports 1-click Excel (.xlsx/.csv) downloads, Excel imports, and real-time
 * background webhook synchronization to Google Sheets.
 */

const STORAGE_KEY_GSHEET = 'abbas_medical_gsheet_config';

const SheetsModule = {
  config: {
    webhookUrl: '',
    autoSyncSales: true,
    autoSyncInventory: true,
    sheetName: 'Abbas Medical Store DB',
    lastSyncTime: null
  },

  init() {
    this.loadConfig();
    this.bindEvents();
    this.renderSettingsView();
  },

  loadConfig() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_GSHEET);
      if (stored) {
        this.config = { ...this.config, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Failed loading Google Sheets config:', e);
    }
  },

  saveConfig() {
    try {
      localStorage.setItem(STORAGE_KEY_GSHEET, JSON.stringify(this.config));
    } catch (e) {
      console.error('Failed saving Google Sheets config:', e);
    }
  },

  bindEvents() {
    // Save Webhook URL Button
    const saveUrlBtn = document.getElementById('btn-save-gsheet-url');
    if (saveUrlBtn) {
      saveUrlBtn.addEventListener('click', () => {
        const input = document.getElementById('gsheet-webhook-url');
        if (input) {
          this.config.webhookUrl = input.value.trim();
          this.saveConfig();
          App.showToast('Google Sheet Webhook URL saved!', 'success');
          this.renderSettingsView();
        }
      });
    }

    // Auto-sync Toggles
    const autoSalesToggle = document.getElementById('toggle-auto-sync-sales');
    if (autoSalesToggle) {
      autoSalesToggle.addEventListener('change', (e) => {
        this.config.autoSyncSales = e.target.checked;
        this.saveConfig();
      });
    }

    const autoInvToggle = document.getElementById('toggle-auto-sync-inv');
    if (autoInvToggle) {
      autoInvToggle.addEventListener('change', (e) => {
        this.config.autoSyncInventory = e.target.checked;
        this.saveConfig();
      });
    }

    // Manual Full Sync Button
    const fullSyncBtn = document.getElementById('btn-sync-all-to-gsheet');
    if (fullSyncBtn) {
      fullSyncBtn.addEventListener('click', () => this.syncAllToGoogleSheets());
    }

    // Test Webhook Connection Button
    const testBtn = document.getElementById('btn-test-gsheet-connection');
    if (testBtn) {
      testBtn.addEventListener('click', () => this.testGoogleSheetConnection());
    }

    // Copy Google Apps Script Button
    const copyScriptBtn = document.getElementById('btn-copy-apps-script');
    if (copyScriptBtn) {
      copyScriptBtn.addEventListener('click', () => this.copyAppsScriptCode());
    }

    // Excel Export Buttons
    document.querySelectorAll('.btn-export-medicines-excel').forEach(btn => {
      btn.addEventListener('click', () => this.exportMedicinesToExcel());
    });

    document.querySelectorAll('.btn-export-sales-excel').forEach(btn => {
      btn.addEventListener('click', () => this.exportSalesToExcel());
    });

    document.querySelectorAll('.btn-export-full-workbook').forEach(btn => {
      btn.addEventListener('click', () => this.exportCompleteWorkbook());
    });

    // Excel / CSV File Import
    const fileInput = document.getElementById('import-excel-file-input');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          this.importMedicinesFromExcel(file);
          fileInput.value = '';
        }
      });
    }
  },

  renderSettingsView() {
    const input = document.getElementById('gsheet-webhook-url');
    if (input) input.value = this.config.webhookUrl || '';

    const autoSalesToggle = document.getElementById('toggle-auto-sync-sales');
    if (autoSalesToggle) autoSalesToggle.checked = this.config.autoSyncSales;

    const autoInvToggle = document.getElementById('toggle-auto-sync-inv');
    if (autoInvToggle) autoInvToggle.checked = this.config.autoSyncInventory;

    const syncStatusEl = document.getElementById('gsheet-sync-status-badge');
    if (syncStatusEl) {
      if (this.config.webhookUrl) {
        syncStatusEl.className = 'badge badge-success';
        syncStatusEl.innerHTML = `✓ Connected (${this.config.lastSyncTime ? 'Last Sync: ' + new Date(this.config.lastSyncTime).toLocaleTimeString() : 'Ready'})`;
      } else {
        syncStatusEl.className = 'badge badge-warning';
        syncStatusEl.textContent = 'Not Connected (Paste Webhook URL below)';
      }
    }
  },

  /* ========================================================================
     EXCEL (.XLSX) EXPORT & IMPORT USING SHEETJS
     ======================================================================== */

  // Export Medicines Catalog to Excel (.xlsx)
  exportMedicinesToExcel() {
    if (typeof XLSX === 'undefined') {
      App.showToast('SheetJS library is loading, please try again.', 'error');
      return;
    }

    const rows = App.products.map(p => ({
      'Barcode': p.barcode || '',
      'Medicine Name': p.name || '',
      'Category': p.category || 'General',
      'Unit': p.unit || 'Piece',
      'Sale Price (Rs.)': p.salePrice !== null && p.salePrice !== undefined ? Number(p.salePrice) : 'Optional',
      'Purchase Price (Rs.)': p.purchasePrice !== null && p.purchasePrice !== undefined ? Number(p.purchasePrice) : 'Optional',
      'Stock Quantity': p.stock || 0,
      'Batch No': p.batchNo || '',
      'Expiry Date': p.expiryDate || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Medicines');

    // Auto-size columns
    const colWidths = [
      { wch: 18 }, // Barcode
      { wch: 28 }, // Name
      { wch: 20 }, // Category
      { wch: 10 }, // Unit
      { wch: 16 }, // Sale Price
      { wch: 18 }, // Purchase Price
      { wch: 14 }, // Stock
      { wch: 14 }, // Batch
      { wch: 14 }  // Expiry
    ];
    worksheet['!cols'] = colWidths;

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Abbas_Medical_Medicines_${dateStr}.xlsx`);
    App.showToast('Medicines Excel sheet downloaded!', 'success');
  },

  // Export Sales & Invoices to Excel (.xlsx)
  exportSalesToExcel() {
    if (typeof XLSX === 'undefined') {
      App.showToast('SheetJS library is loading, please try again.', 'error');
      return;
    }

    if (App.invoices.length === 0) {
      App.showToast('No sales invoices recorded yet to export.', 'info');
      return;
    }

    const rows = App.invoices.map(inv => {
      const itemsList = inv.items.map(i => `${i.name} (x${i.qty} @ Rs.${i.unitPrice})`).join('; ');
      return {
        'Invoice #': inv.invoiceNumber,
        'Date & Time': new Date(inv.timestamp).toLocaleString(),
        'Customer Name': inv.customerName || 'Walk-in',
        'Customer Phone': inv.customerPhone || 'N/A',
        'Medicines Sold': itemsList,
        'Items Count': inv.items.length,
        'Subtotal (Rs.)': Number(inv.subtotal),
        'Discount (Rs.)': Number(inv.discountAmount || 0),
        'Grand Total (Rs.)': Number(inv.grandTotal),
        'Estimated Profit (Rs.)': Number(inv.estimatedProfit || 0),
        'Payment Method': inv.paymentMethod || 'Cash'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Bills');

    const colWidths = [
      { wch: 14 }, // Inv #
      { wch: 22 }, // Date
      { wch: 20 }, // Customer
      { wch: 16 }, // Phone
      { wch: 40 }, // Medicines
      { wch: 12 }, // Items Count
      { wch: 14 }, // Subtotal
      { wch: 14 }, // Discount
      { wch: 16 }, // Grand Total
      { wch: 18 }, // Profit
      { wch: 16 }  // Payment
    ];
    worksheet['!cols'] = colWidths;

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Abbas_Medical_Sales_${dateStr}.xlsx`);
    App.showToast('Sales Excel sheet downloaded!', 'success');
  },

  // Export Complete Multi-Sheet Pharmacy Database Workbook (.xlsx)
  exportCompleteWorkbook() {
    if (typeof XLSX === 'undefined') {
      App.showToast('SheetJS library is loading, please try again.', 'error');
      return;
    }

    const workbook = XLSX.utils.book_new();

    // Sheet 1: Medicines
    const medRows = App.products.map(p => ({
      'Barcode': p.barcode || '',
      'Medicine Name': p.name || '',
      'Category': p.category || 'General',
      'Unit': p.unit || 'Piece',
      'Sale Price': p.salePrice !== null && p.salePrice !== undefined ? Number(p.salePrice) : '',
      'Purchase Price': p.purchasePrice !== null && p.purchasePrice !== undefined ? Number(p.purchasePrice) : '',
      'Stock': p.stock || 0,
      'Batch No': p.batchNo || '',
      'Expiry Date': p.expiryDate || ''
    }));
    const ws1 = XLSX.utils.json_to_sheet(medRows);
    XLSX.utils.book_append_sheet(workbook, ws1, 'Inventory');

    // Sheet 2: Sales
    const saleRows = App.invoices.map(inv => ({
      'Invoice #': inv.invoiceNumber,
      'Date': new Date(inv.timestamp).toLocaleDateString(),
      'Time': new Date(inv.timestamp).toLocaleTimeString(),
      'Customer': inv.customerName || 'Walk-in',
      'Phone': inv.customerPhone || '',
      'Medicines': inv.items.map(i => `${i.name} (x${i.qty})`).join(', '),
      'Total (Rs.)': Number(inv.grandTotal),
      'Profit (Rs.)': Number(inv.estimatedProfit || 0),
      'Payment': inv.paymentMethod || 'Cash'
    }));
    const ws2 = XLSX.utils.json_to_sheet(saleRows);
    XLSX.utils.book_append_sheet(workbook, ws2, 'Sales History');

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Abbas_Medical_Store_Complete_DB_${dateStr}.xlsx`);
    App.showToast('Complete Multi-Sheet Database downloaded!', 'success');
  },

  // Import Medicines from Excel (.xlsx or .csv)
  importMedicinesFromExcel(file) {
    if (typeof XLSX === 'undefined') {
      App.showToast('SheetJS library is loading, please try again.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        if (!json || json.length === 0) {
          App.showToast('The selected sheet is empty.', 'error');
          return;
        }

        let importedCount = 0;
        json.forEach(row => {
          // Normalize header keys (case-insensitive)
          const findKey = (candidates) => {
            for (let c of candidates) {
              const matched = Object.keys(row).find(k => k.trim().toLowerCase() === c.toLowerCase());
              if (matched && row[matched] !== undefined) return row[matched];
            }
            return null;
          };

          const name = findKey(['Medicine Name', 'Name', 'Item', 'Product']);
          if (!name) return;

          let barcode = String(findKey(['Barcode', 'Code', 'Barcode Number']) || '').trim();
          if (!barcode) {
            barcode = `8964${Math.floor(100000000 + Math.random() * 900000000)}`;
          }

          const category = String(findKey(['Category', 'Department']) || 'General').trim();
          const unit = String(findKey(['Unit', 'Unit Type', 'Type']) || 'Tablet').trim();
          
          const saleVal = findKey(['Sale Price (Rs.)', 'Sale Price', 'Price', 'Retail Price']);
          const salePrice = (saleVal !== null && !isNaN(parseFloat(saleVal))) ? parseFloat(saleVal) : null;

          const purchVal = findKey(['Purchase Price (Rs.)', 'Purchase Price', 'Cost Price', 'Cost']);
          const purchasePrice = (purchVal !== null && !isNaN(parseFloat(purchVal))) ? parseFloat(purchVal) : null;

          const stockVal = findKey(['Stock Quantity', 'Stock', 'Qty']);
          const stock = (stockVal !== null && !isNaN(parseInt(stockVal))) ? parseInt(stockVal) : 50;

          const batchNo = String(findKey(['Batch No', 'Batch', 'Lot']) || '').trim();
          const expiryDate = String(findKey(['Expiry Date', 'Expiry', 'Exp']) || '').trim();

          // Check if already exists by barcode
          const existing = App.products.find(p => p.barcode === barcode);
          if (existing) {
            existing.name = name;
            existing.category = category;
            existing.unit = unit;
            if (salePrice !== null) existing.salePrice = salePrice;
            if (purchasePrice !== null) existing.purchasePrice = purchasePrice;
            existing.stock = stock;
            if (batchNo) existing.batchNo = batchNo;
            if (expiryDate) existing.expiryDate = expiryDate;
          } else {
            App.products.push({
              id: `prod-imp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              barcode,
              name,
              category,
              unit,
              salePrice,
              purchasePrice,
              stock,
              batchNo,
              expiryDate
            });
          }
          importedCount++;
        });

        App.saveProducts();
        CatalogModule.render();
        ScannerModule.renderTestBarcodeChips();
        App.showToast(`Successfully imported ${importedCount} medicines from Excel!`, 'success');
      } catch (err) {
        console.error('Failed parsing Excel file:', err);
        App.showToast('Failed to import Excel file. Please check format.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  },

  /* ========================================================================
     GOOGLE SHEETS LIVE TWO-WAY SYNC (APPS SCRIPT WEBHOOK)
     ======================================================================== */

  // Triggered automatically whenever a sale occurs
  async syncSaleToGoogleSheet(invoice) {
    if (!this.config.webhookUrl || !this.config.autoSyncSales) return;

    const payload = {
      action: 'ADD_SALE',
      storeName: 'Abbas Medical Store',
      timestamp: new Date().toISOString(),
      invoice: {
        invoiceNumber: invoice.invoiceNumber,
        date: new Date(invoice.timestamp).toLocaleString(),
        customerName: invoice.customerName || 'Walk-in',
        customerPhone: invoice.customerPhone || '',
        itemsSummary: invoice.items.map(i => `${i.name} (x${i.qty} @ Rs.${i.unitPrice})`).join(', '),
        subtotal: invoice.subtotal,
        discount: invoice.discountAmount || 0,
        grandTotal: invoice.grandTotal,
        estimatedProfit: invoice.estimatedProfit || 0,
        paymentMethod: invoice.paymentMethod
      }
    };

    try {
      // Standard no-cors for Google Apps Script Webhooks
      await fetch(this.config.webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      this.config.lastSyncTime = new Date().toISOString();
      this.saveConfig();
      this.renderSettingsView();
      console.log('Invoice synced to Google Sheet');
    } catch (err) {
      console.warn('Google Sheet sync error:', err);
    }
  },

  // Sync entire inventory and sales history in bulk to Google Sheets
  async syncAllToGoogleSheets() {
    if (!this.config.webhookUrl) {
      App.showToast('Please paste your Google Sheet Webhook URL first.', 'error');
      return;
    }

    App.showToast('Syncing all data to Google Sheet...', 'info');

    const payload = {
      action: 'BULK_SYNC',
      storeName: 'Abbas Medical Store',
      timestamp: new Date().toISOString(),
      medicines: App.products,
      invoices: App.invoices
    };

    try {
      await fetch(this.config.webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      this.config.lastSyncTime = new Date().toISOString();
      this.saveConfig();
      this.renderSettingsView();
      App.showToast('Google Sheet successfully updated with all data!', 'success');
    } catch (err) {
      console.error('Google Sheet bulk sync failed:', err);
      App.showToast('Failed to reach Google Sheet Webhook.', 'error');
    }
  },

  // Test webhook
  async testGoogleSheetConnection() {
    if (!this.config.webhookUrl) {
      App.showToast('Please paste a Google Sheet Webhook URL first.', 'error');
      return;
    }

    App.showToast('Testing Google Sheet connection...', 'info');

    try {
      await fetch(this.config.webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'PING',
          store: 'Abbas Medical Store',
          message: 'Connection successful from Abbas Medical Store App!'
        })
      });

      this.config.lastSyncTime = new Date().toISOString();
      this.saveConfig();
      this.renderSettingsView();
      App.showToast('✓ Connection test signal sent to Google Sheet!', 'success');
    } catch (e) {
      App.showToast('Connection failed. Please check the Webhook URL.', 'error');
    }
  },

  // Google Apps Script template code
  getGoogleAppsScriptCode() {
    return `// ====================================================================
// Abbas Medical Store - Google Apps Script Webhook
// Paste this in Google Sheets: Extensions > Apps Script > Replace code > Deploy
// ====================================================================

function doPost(e) {
  try {
    var raw = e.postData.contents;
    var data = JSON.parse(raw);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (data.action === 'ADD_SALE') {
      var sheet = getOrCreateSheet(ss, 'Sales');
      var inv = data.invoice;
      sheet.appendRow([
        inv.invoiceNumber,
        inv.date,
        inv.customerName,
        inv.customerPhone,
        inv.itemsSummary,
        inv.subtotal,
        inv.discount,
        inv.grandTotal,
        inv.estimatedProfit,
        inv.paymentMethod
      ]);
    } else if (data.action === 'BULK_SYNC') {
      // Sync Medicines
      var medSheet = getOrCreateSheet(ss, 'Medicines');
      medSheet.clear();
      medSheet.appendRow(['Barcode', 'Medicine Name', 'Category', 'Unit', 'Sale Price', 'Purchase Price', 'Stock', 'Batch', 'Expiry Date']);
      data.medicines.forEach(function(m) {
        medSheet.appendRow([m.barcode, m.name, m.category, m.unit, m.salePrice || '', m.purchasePrice || '', m.stock, m.batchNo || '', m.expiryDate || '']);
      });

      // Sync Sales
      var salesSheet = getOrCreateSheet(ss, 'Sales');
      salesSheet.clear();
      salesSheet.appendRow(['Invoice #', 'Date & Time', 'Customer', 'Phone', 'Items Sold', 'Subtotal', 'Discount', 'Grand Total', 'Profit', 'Payment']);
      data.invoices.forEach(function(i) {
        var summary = i.items.map(function(x) { return x.name + ' (x' + x.qty + ')'; }).join(', ');
        salesSheet.appendRow([i.invoiceNumber, i.timestamp, i.customerName, i.customerPhone, summary, i.subtotal, i.discountAmount, i.grandTotal, i.estimatedProfit, i.paymentMethod]);
      });
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSheet(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (sheetName === 'Sales') {
      sheet.appendRow(['Invoice #', 'Date & Time', 'Customer', 'Phone', 'Items Sold', 'Subtotal', 'Discount', 'Grand Total', 'Profit', 'Payment']);
    } else if (sheetName === 'Medicines') {
      sheet.appendRow(['Barcode', 'Medicine Name', 'Category', 'Unit', 'Sale Price', 'Purchase Price', 'Stock', 'Batch', 'Expiry Date']);
    }
  }
  return sheet;
}`;
  },

  copyAppsScriptCode() {
    const code = this.getGoogleAppsScriptCode();
    navigator.clipboard.writeText(code).then(() => {
      App.showToast('Google Apps Script copied to clipboard!', 'success');
    }).catch(() => {
      App.showToast('Failed to copy script code', 'error');
    });
  }
};
