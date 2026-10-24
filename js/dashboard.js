/**
 * Abbas Medical Store - Executive Dashboard & Analytics
 * Real-time business metrics: Today's Sales, Profit Estimates, Products Count, Low Stock Warnings,
 * Recent Orders Activity, and Quick Action Navigators.
 */

const DashboardModule = {
  init() {
    this.bindEvents();
    this.render();
  },

  bindEvents() {
    // Quick action buttons in dashboard
    document.getElementById('dash-action-pos')?.addEventListener('click', () => App.switchTab('pos'));
    document.getElementById('dash-action-add')?.addEventListener('click', () => {
      App.switchTab('catalog');
      CatalogModule.openAddModal();
    });
    document.getElementById('dash-action-scan')?.addEventListener('click', () => {
      ScannerModule.openScannerModal('pos');
    });
    document.getElementById('dash-action-lowstock')?.addEventListener('click', () => {
      App.switchTab('catalog');
      const stockFilter = document.getElementById('catalog-stock-filter');
      if (stockFilter) {
        stockFilter.value = 'low';
        CatalogModule.stockFilter = 'low';
        CatalogModule.renderTable();
      }
    });

    // Reset Data / Seed Demo Invoices Button (in settings or dashboard)
    const resetDataBtn = document.getElementById('btn-reset-demo-data');
    if (resetDataBtn) {
      resetDataBtn.addEventListener('click', () => this.seedDemoData());
    }
  },

  render() {
    this.updateMetrics();
    this.renderRecentSalesTable();
    this.renderTopSellingMedicines();
    this.renderLowStockAlerts();
  },

  updateMetrics() {
    const today = new Date().toISOString().split('T')[0];

    // Filter invoices created today
    const todayInvoices = App.invoices.filter(inv => {
      return inv.timestamp && inv.timestamp.startsWith(today);
    });

    // Today's Sales Revenue
    const todayRevenue = todayInvoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);

    // Today's Estimated Profit
    const todayProfit = todayInvoices.reduce((sum, inv) => sum + (Number(inv.estimatedProfit) || 0), 0);

    // Total Inventory Products Count
    const totalProducts = App.products.length;

    // Total Low Stock Items (stock <= 15)
    const lowStockCount = App.products.filter(p => p.stock !== undefined && p.stock <= 15).length;

    // Update UI elements
    const revEl = document.getElementById('metric-today-sales');
    const profitEl = document.getElementById('metric-today-profit');
    const billsEl = document.getElementById('metric-today-bills');
    const prodsEl = document.getElementById('metric-total-products');
    const lowStockEl = document.getElementById('metric-low-stock');

    if (revEl) revEl.textContent = `Rs. ${todayRevenue.toFixed(2)}`;
    if (profitEl) profitEl.textContent = `Rs. ${todayProfit.toFixed(2)}`;
    if (billsEl) billsEl.textContent = `${todayInvoices.length}`;
    if (prodsEl) prodsEl.textContent = `${totalProducts}`;
    if (lowStockEl) lowStockEl.textContent = `${lowStockCount}`;
  },

  renderRecentSalesTable() {
    const tbody = document.getElementById('dash-recent-sales-tbody');
    if (!tbody) return;

    const recentInvoices = App.invoices.slice(0, 6);

    if (recentInvoices.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">
            No sales recorded today yet.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = recentInvoices.map(inv => {
      const timeFormatted = new Date(inv.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `
        <tr>
          <td><strong style="color: var(--primary); font-family: var(--font-mono);">${inv.invoiceNumber}</strong></td>
          <td>${timeFormatted}</td>
          <td>${inv.customerName || 'Walk-in'}</td>
          <td>${inv.items.length} item(s)</td>
          <td><strong style="font-family: var(--font-mono);">Rs. ${Number(inv.grandTotal).toFixed(2)}</strong></td>
          <td>
            <button class="btn-icon" style="width: 30px; height: 30px; color: var(--wa-green);" onclick="InvoiceModule.reopenInvoice('${inv.id}', true)" title="WhatsApp Bill">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Mobile Recent Sales Cards
    const mobileContainer = document.getElementById('dash-recent-sales-mobile');
    if (mobileContainer) {
      if (recentInvoices.length === 0) {
        mobileContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem; padding: 1rem 0; text-align: center;">No sales recorded today yet.</p>`;
      } else {
        mobileContainer.innerHTML = recentInvoices.map(inv => {
          const timeFormatted = new Date(inv.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return `
            <div style="background: #ffffff; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 0.75rem 0.85rem; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 1px 2px rgba(0,0,0,0.04);">
              <div>
                <div style="display: flex; align-items: center; gap: 0.45rem;">
                  <strong style="color: var(--primary); font-family: var(--font-mono); font-size: 0.95rem;">${inv.invoiceNumber}</strong>
                  <span style="font-size: 0.72rem; color: #64748b;">${timeFormatted}</span>
                </div>
                <div style="font-size: 0.82rem; color: #0f172a; margin-top: 2px;">
                  ${inv.customerName || 'Walk-in'} • ${inv.items.length} item(s)
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 0.65rem;">
                <strong style="font-family: var(--font-mono); font-size: 0.98rem; color: #1d4ed8;">Rs. ${Number(inv.grandTotal).toFixed(2)}</strong>
                <button class="btn-icon" style="width: 32px; height: 32px; color: var(--wa-green);" onclick="InvoiceModule.reopenInvoice('${inv.id}', true)" title="WhatsApp Bill">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                </button>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  },

  renderTopSellingMedicines() {
    const container = document.getElementById('dash-top-medicines-container');
    if (!container) return;

    // Aggregate items sold
    const itemSalesMap = {};
    App.invoices.forEach(inv => {
      inv.items.forEach(item => {
        if (!itemSalesMap[item.name]) {
          itemSalesMap[item.name] = { count: 0, revenue: 0, unit: item.unit };
        }
        itemSalesMap[item.name].count += item.qty;
        itemSalesMap[item.name].revenue += item.subtotal;
      });
    });

    const sortedItems = Object.entries(itemSalesMap)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);

    if (sortedItems.length === 0) {
      container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem; padding: 1rem 0;">No sales recorded yet to calculate top medicines.</p>`;
      return;
    }

    container.innerHTML = sortedItems.map(([name, stats], idx) => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.65rem 0; border-bottom: 1px solid var(--border-subtle);">
        <div style="display: flex; align-items: center; gap: 0.65rem;">
          <span style="font-weight: 800; font-size: 0.85rem; color: var(--primary); min-width: 20px;">#${idx + 1}</span>
          <div>
            <div style="font-weight: 700; font-size: 0.9rem; color: var(--text-main);">${name}</div>
            <div style="font-size: 0.74rem; color: var(--text-muted);">${stats.count} ${stats.unit}s sold</div>
          </div>
        </div>
        <div style="font-weight: 700; font-family: var(--font-mono); color: var(--primary);">
          Rs. ${stats.revenue.toFixed(2)}
        </div>
      </div>
    `).join('');
  },

  renderLowStockAlerts() {
    const container = document.getElementById('dash-low-stock-container');
    if (!container) return;

    const lowStockItems = App.products
      .filter(p => p.stock !== undefined && p.stock <= 25)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 5);

    if (lowStockItems.length === 0) {
      container.innerHTML = `<p style="color: var(--primary); font-size: 0.85rem; padding: 1rem 0;">✓ All medicine inventory levels are healthy!</p>`;
      return;
    }

    container.innerHTML = lowStockItems.map(p => {
      const isOut = p.stock === 0;
      return `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.65rem 0; border-bottom: 1px solid var(--border-subtle);">
          <div>
            <div style="font-weight: 700; font-size: 0.9rem; color: var(--text-main);">${p.name}</div>
            <div style="font-size: 0.74rem; color: var(--text-muted);">${p.category || 'Medicine'} • ${p.barcode}</div>
          </div>
          <div>
            <span class="badge ${isOut ? 'badge-danger' : 'badge-warning'}">
              ${isOut ? 'Out of Stock' : `${p.stock} left`}
            </span>
          </div>
        </div>
      `;
    }).join('');
  },

  seedDemoData() {
    if (confirm('Load sample invoices to preview the dashboard with realistic pharmacy sales data?')) {
      const sampleInvoices = [
        {
          id: 'inv-demo-1',
          invoiceNumber: 'AMS-1082',
          timestamp: new Date().toISOString(),
          customerName: 'Muhammad Tariq',
          customerPhone: '03001234567',
          items: [
            { id: 'prod-1', name: 'Panadol 500mg', barcode: '8964000100123', unit: 'Tablet', qty: 20, unitPrice: 4.00, subtotal: 80.00, purchasePrice: 3.00 },
            { id: 'prod-5', name: 'Augmentin 625mg', barcode: '8964000300222', unit: 'Tablet', qty: 4, unitPrice: 45.00, subtotal: 180.00, purchasePrice: 36.00 }
          ],
          subtotal: 260.00,
          discountPercent: 5,
          discountAmount: 13.00,
          grandTotal: 247.00,
          estimatedProfit: 51.00,
          paymentMethod: 'Cash',
          cashier: 'Abbas Medical Counter'
        },
        {
          id: 'inv-demo-2',
          invoiceNumber: 'AMS-1083',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          customerName: 'Fatima Zahra',
          customerPhone: '03219876543',
          items: [
            { id: 'prod-7', name: 'Risek 20mg (Omeprazole)', barcode: '8964000500444', unit: 'Capsule', qty: 14, unitPrice: 28.00, subtotal: 392.00, purchasePrice: 22.00 },
            { id: 'prod-10', name: 'Gaviscon Liquid 120ml', barcode: '8964000800777', unit: 'Bottle', qty: 1, unitPrice: 195.00, subtotal: 195.00, purchasePrice: 160.00 }
          ],
          subtotal: 587.00,
          discountPercent: 0,
          discountAmount: 0.00,
          grandTotal: 587.00,
          estimatedProfit: 119.00,
          paymentMethod: 'Card',
          cashier: 'Abbas Medical Counter'
        },
        {
          id: 'inv-demo-3',
          invoiceNumber: 'AMS-1084',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          customerName: 'Kamran Bilal',
          customerPhone: '03335551234',
          items: [
            { id: 'prod-8', name: 'Arinac Forte', barcode: '8964000600555', unit: 'Tablet', qty: 10, unitPrice: 12.00, subtotal: 120.00, purchasePrice: 9.50 },
            { id: 'prod-11', name: 'Sancos Cough Syrup 120ml', barcode: '8964000900888', unit: 'Bottle', qty: 1, unitPrice: 140.00, subtotal: 140.00, purchasePrice: 115.00 }
          ],
          subtotal: 260.00,
          discountPercent: 0,
          discountAmount: 0.00,
          grandTotal: 260.00,
          estimatedProfit: 50.00,
          paymentMethod: 'Cash',
          cashier: 'Abbas Medical Counter'
        }
      ];

      App.invoices = sampleInvoices;
      App.saveInvoices();
      this.render();
      App.showToast('Sample pharmacy sales data loaded!', 'success');
    }
  }
};
