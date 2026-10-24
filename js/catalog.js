/**
 * Abbas Medical Store - Medicine Inventory & Product Catalog Module
 * Supports Barcode Scanning for Adding Products, Optional Purchase & Sale Prices,
 * Categorization, Batch & FEFO Expiry Tracking, and Barcode Label Generation.
 */

const CatalogModule = {
  activeCategory: 'all',
  searchQuery: '',
  stockFilter: 'all', // all, low, out
  editingProductId: null,

  init() {
    this.bindEvents();
    this.render();
  },

  bindEvents() {
    // Add Medicine Button
    const addBtn = document.getElementById('btn-add-medicine');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.openAddModal());
    }

    // Modal Close
    const closeBtn = document.getElementById('btn-close-medicine-modal');
    const cancelBtn = document.getElementById('btn-cancel-medicine-modal');
    if (closeBtn) closeBtn.addEventListener('click', () => this.closeMedicineModal());
    if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeMedicineModal());

    // Medicine Form Submit
    const form = document.getElementById('form-medicine');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveMedicine();
      });
    }

    // Camera Scan Trigger inside Medicine Modal
    const modalScanBtn = document.getElementById('btn-modal-scan-barcode');
    if (modalScanBtn) {
      modalScanBtn.addEventListener('click', () => {
        ScannerModule.openScannerModal('catalog');
      });
    }

    // Search Input
    const searchInput = document.getElementById('catalog-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderTable();
      });
    }

    // Category Filter Select
    const catSelect = document.getElementById('catalog-category-filter');
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        this.activeCategory = e.target.value;
        this.renderTable();
      });
    }

    // Stock Filter Select
    const stockSelect = document.getElementById('catalog-stock-filter');
    if (stockSelect) {
      stockSelect.addEventListener('change', (e) => {
        this.stockFilter = e.target.value;
        this.renderTable();
      });
    }

    // Barcode Preview Modal Close
    const closeBarcodeModal = document.getElementById('btn-close-barcode-modal');
    if (closeBarcodeModal) {
      closeBarcodeModal.addEventListener('click', () => {
        document.getElementById('modal-barcode-preview')?.classList.remove('active');
      });
    }
  },

  openAddModal() {
    this.editingProductId = null;
    const modal = document.getElementById('modal-medicine');
    const title = document.getElementById('medicine-modal-title');
    const form = document.getElementById('form-medicine');
    if (!modal || !form) return;

    if (title) title.textContent = 'Add New Medicine';
    form.reset();

    // Default auto-generated barcode suggestion
    const barcodeInput = document.getElementById('med-barcode');
    if (barcodeInput) {
      barcodeInput.value = `8964${Math.floor(100000000 + Math.random() * 900000000)}`;
    }

    modal.classList.add('active');
  },

  openAddModalWithBarcode(barcode) {
    this.openAddModal();
    const barcodeInput = document.getElementById('med-barcode');
    if (barcodeInput) {
      barcodeInput.value = barcode;
    }
  },

  openEditModal(productId) {
    const product = App.products.find(p => p.id === productId);
    if (!product) return;

    this.editingProductId = productId;
    const modal = document.getElementById('modal-medicine');
    const title = document.getElementById('medicine-modal-title');
    if (!modal) return;

    if (title) title.textContent = `Edit Medicine: ${product.name}`;

    document.getElementById('med-barcode').value = product.barcode || '';
    document.getElementById('med-name').value = product.name || '';
    document.getElementById('med-category').value = product.category || 'General';
    document.getElementById('med-unit').value = product.unit || 'Tablet';
    document.getElementById('med-sale-price').value = product.salePrice !== undefined ? product.salePrice : '';
    document.getElementById('med-purchase-price').value = product.purchasePrice !== undefined ? product.purchasePrice : '';
    document.getElementById('med-stock').value = product.stock !== undefined ? product.stock : 50;
    document.getElementById('med-batch').value = product.batchNo || '';
    document.getElementById('med-expiry').value = product.expiryDate || '';

    modal.classList.add('active');
  },

  closeMedicineModal() {
    const modal = document.getElementById('modal-medicine');
    if (modal) modal.classList.remove('active');
    this.editingProductId = null;
  },

  saveMedicine() {
    const barcode = document.getElementById('med-barcode').value.trim();
    const name = document.getElementById('med-name').value.trim();
    const category = document.getElementById('med-category').value;
    const unit = document.getElementById('med-unit').value;
    
    // Purchase and Sale prices are explicitly optional as requested by user
    const salePriceVal = document.getElementById('med-sale-price').value.trim();
    const purchasePriceVal = document.getElementById('med-purchase-price').value.trim();
    const salePrice = salePriceVal !== '' ? parseFloat(salePriceVal) : null;
    const purchasePrice = purchasePriceVal !== '' ? parseFloat(purchasePriceVal) : null;

    const stock = parseInt(document.getElementById('med-stock').value) || 0;
    const batchNo = document.getElementById('med-batch').value.trim();
    const expiryDate = document.getElementById('med-expiry').value;

    if (!name) {
      App.showToast('Please enter the medicine or product name.', 'error');
      return;
    }

    if (!barcode) {
      App.showToast('Please enter or scan a barcode.', 'error');
      return;
    }

    // Check duplicate barcode
    const duplicate = App.products.find(p => p.barcode.toLowerCase() === barcode.toLowerCase() && p.id !== this.editingProductId);
    if (duplicate) {
      App.showToast(`Barcode is already assigned to "${duplicate.name}"`, 'error');
      return;
    }

    if (this.editingProductId) {
      // Update
      const index = App.products.findIndex(p => p.id === this.editingProductId);
      if (index > -1) {
        App.products[index] = {
          ...App.products[index],
          barcode,
          name,
          category,
          unit,
          salePrice,
          purchasePrice,
          stock,
          batchNo,
          expiryDate
        };
        App.showToast(`Updated "${name}"`, 'success');
      }
    } else {
      // Create new
      const newProduct = {
        id: `prod-${Date.now()}`,
        barcode,
        name,
        category,
        unit,
        salePrice,
        purchasePrice,
        stock,
        batchNo,
        expiryDate
      };
      App.products.unshift(newProduct);
      App.showToast(`Added "${name}" to inventory!`, 'success');
    }

    App.saveProducts();
    this.closeMedicineModal();
    this.render();
    ScannerModule.renderTestBarcodeChips();
  },

  deleteProduct(productId) {
    const product = App.products.find(p => p.id === productId);
    if (!product) return;

    if (confirm(`Are you sure you want to delete "${product.name}" from Abbas Medical Store inventory?`)) {
      App.products = App.products.filter(p => p.id !== productId);
      App.saveProducts();
      this.render();
      ScannerModule.renderTestBarcodeChips();
      App.showToast(`Deleted "${product.name}"`, 'info');
    }
  },

  showBarcodeModal(productId) {
    const product = App.products.find(p => p.id === productId);
    if (!product) return;

    const modal = document.getElementById('modal-barcode-preview');
    const labelTitle = document.getElementById('barcode-label-title');
    const labelPrice = document.getElementById('barcode-label-price');
    const labelUnit = document.getElementById('barcode-label-unit');
    const svgEl = document.getElementById('barcode-canvas');

    if (!modal) return;

    if (labelTitle) labelTitle.textContent = product.name;
    if (labelPrice) {
      labelPrice.textContent = product.salePrice !== null ? `Rs. ${product.salePrice.toFixed(2)}` : 'Price on Scan';
    }
    if (labelUnit) labelUnit.textContent = `Unit: ${product.unit}`;

    if (typeof JsBarcode !== 'undefined' && svgEl && product.barcode) {
      try {
        JsBarcode(svgEl, product.barcode, {
          format: "CODE128",
          lineColor: "#000000",
          width: 2,
          height: 60,
          displayValue: true,
          font: "monospace",
          fontSize: 14
        });
      } catch (err) {
        console.warn('JsBarcode render error', err);
      }
    }

    modal.classList.add('active');
  },

  render() {
    this.renderCategoryDropdown();
    this.renderTable();
  },

  renderCategoryDropdown() {
    const categories = Array.from(new Set(App.products.map(p => p.category).filter(Boolean)));
    const filterSelect = document.getElementById('catalog-category-filter');
    const formSelect = document.getElementById('med-category');

    if (filterSelect) {
      const currentVal = filterSelect.value || 'all';
      filterSelect.innerHTML = `<option value="all">All Categories</option>` +
        categories.map(c => `<option value="${c}">${c}</option>`).join('');
      filterSelect.value = currentVal;
    }

    if (formSelect && formSelect.options.length <= 1) {
      const defaultCategories = ['Analgesics / Fever', 'Pain Relief', 'Antibiotics', 'Gastro / Antacid', 'Cold & Allergy', 'Syrups', 'Antiseptic / First Aid', 'Medical Supplies', 'Cardiology', 'Vitamins & Supplements', 'General'];
      formSelect.innerHTML = defaultCategories.map(c => `<option value="${c}">${c}</option>`).join('');
    }
  },

  renderTable() {
    const tbody = document.getElementById('catalog-table-body');
    const countBadge = document.getElementById('catalog-total-count');
    if (!tbody) return;

    let filtered = App.products.filter(p => {
      // Search
      const matchesSearch = !this.searchQuery || 
        p.name.toLowerCase().includes(this.searchQuery) ||
        (p.barcode && p.barcode.toLowerCase().includes(this.searchQuery)) ||
        (p.category && p.category.toLowerCase().includes(this.searchQuery));

      // Category
      const matchesCategory = this.activeCategory === 'all' || p.category === this.activeCategory;

      // Stock
      let matchesStock = true;
      if (this.stockFilter === 'low') {
        matchesStock = p.stock > 0 && p.stock <= 15;
      } else if (this.stockFilter === 'out') {
        matchesStock = p.stock === 0;
      }

      return matchesSearch && matchesCategory && matchesStock;
    });

    if (countBadge) {
      countBadge.textContent = `${filtered.length} Medicines`;
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 3rem; color: var(--text-muted);">
            No medicines match the selected filters or search query.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(p => {
      const isLowStock = p.stock !== undefined && p.stock <= 15;
      const isOutOfStock = p.stock !== undefined && p.stock === 0;
      const stockBadge = isOutOfStock
        ? `<span class="badge badge-danger">Out of Stock (0)</span>`
        : isLowStock 
          ? `<span class="badge badge-warning">Low: ${p.stock}</span>`
          : `<span class="badge badge-success">${p.stock || 0}</span>`;

      const salePriceText = p.salePrice !== null && p.salePrice !== undefined 
        ? `<strong style="color: var(--primary);">Rs. ${Number(p.salePrice).toFixed(2)}</strong>` 
        : `<span style="color: var(--text-muted); font-size: 0.78rem;">Optional</span>`;

      const purchasePriceText = p.purchasePrice !== null && p.purchasePrice !== undefined 
        ? `<span style="color: var(--text-secondary); font-size: 0.82rem;">Rs. ${Number(p.purchasePrice).toFixed(2)}</span>` 
        : `<span style="color: var(--text-muted); font-size: 0.78rem;">Optional</span>`;

      return `
        <tr>
          <td>
            <div style="font-weight: 700; color: var(--text-main);">${p.name}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono); margin-top: 2px;">
              ${p.barcode}
            </div>
          </td>
          <td><span class="badge badge-info">${p.category || 'General'}</span></td>
          <td><span class="badge-unit">${p.unit || 'Piece'}</span></td>
          <td>${salePriceText}</td>
          <td>${purchasePriceText}</td>
          <td>${stockBadge}</td>
          <td>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <button class="btn-icon" style="width: 32px; height: 32px;" onclick="CatalogModule.showBarcodeModal('${p.id}')" title="View & Print Barcode">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 5v14M7 5v14M11 5v14M15 5v14M19 5v14M21 5v14"/></svg>
              </button>
              <button class="btn-icon" style="width: 32px; height: 32px;" onclick="CatalogModule.openEditModal('${p.id}')" title="Edit Medicine">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
              </button>
              <button class="btn-icon" style="width: 32px; height: 32px; color: var(--accent-rose);" onclick="CatalogModule.deleteProduct('${p.id}')" title="Delete Medicine">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Render Mobile Cards View (Zero Horizontal Scrolling)
    const mobileContainer = document.getElementById('catalog-mobile-cards');
    if (mobileContainer) {
      if (filtered.length === 0) {
        mobileContainer.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-muted); background: #ffffff; border-radius: 8px;">No medicines match your search.</div>`;
      } else {
        mobileContainer.innerHTML = filtered.map(p => {
          const isLowStock = p.stock !== undefined && p.stock <= 15;
          const isOutOfStock = p.stock !== undefined && p.stock === 0;
          const stockBadge = isOutOfStock
            ? `<span class="badge badge-danger">Out of Stock</span>`
            : isLowStock 
              ? `<span class="badge badge-warning">Low: ${p.stock} left</span>`
              : `<span class="badge badge-success">${p.stock || 0} in stock</span>`;

          const salePriceText = p.salePrice !== null && p.salePrice !== undefined 
            ? `<strong style="color: var(--primary); font-size: 1.05rem;">Rs. ${Number(p.salePrice).toFixed(2)}</strong>` 
            : `<span style="color: var(--text-muted); font-size: 0.8rem;">Price on scan</span>`;

          return `
            <div class="mobile-med-card">
              <div class="mobile-med-header">
                <div>
                  <div class="mobile-med-title">${p.name}</div>
                  <div class="mobile-med-barcode">Barcode: ${p.barcode}</div>
                </div>
                <span class="badge-unit">${p.unit || 'Piece'}</span>
              </div>
              <div class="mobile-med-row">
                <div>
                  <span style="font-size: 0.72rem; color: #64748b; display: block;">Sale Price:</span>
                  ${salePriceText}
                </div>
                <div style="text-align: right;">
                  <span style="font-size: 0.72rem; color: #64748b; display: block;">Stock:</span>
                  ${stockBadge}
                </div>
              </div>
              <div class="mobile-med-actions">
                <button class="btn-mobile-sell" onclick="PosModule.quickAddFromCatalog('${p.id}')">
                  🛒 Add to Bill
                </button>
                <div style="display: flex; gap: 0.35rem;">
                  <button class="btn-secondary" style="padding: 0.35rem 0.55rem; font-size: 0.75rem;" onclick="CatalogModule.showBarcodeModal('${p.id}')" title="Barcode">
                    🏷️ Barcode
                  </button>
                  <button class="btn-secondary" style="padding: 0.35rem 0.55rem; font-size: 0.75rem;" onclick="CatalogModule.openEditModal('${p.id}')" title="Edit">
                    ✎ Edit
                  </button>
                  <button class="btn-secondary" style="padding: 0.35rem 0.55rem; font-size: 0.75rem; color: var(--accent-rose);" onclick="CatalogModule.deleteProduct('${p.id}')" title="Delete">
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  }
};
