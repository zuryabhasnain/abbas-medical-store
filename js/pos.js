/**
 * Abbas Medical Store - Point of Sale (POS) Module
 * Fast barcode lookup, quantity steppers (1 tablet, 3 tablets, full strip),
 * editable price override, customer details, and instant WhatsApp invoice trigger.
 */

const PosModule = {
  cart: [],
  customerName: '',
  customerPhone: '',
  discountPercent: 0,
  paymentMethod: 'Cash',

  init() {
    this.bindEvents();
    this.renderCart();
  },

  bindEvents() {
    // Manual Barcode Input / Quick Search
    const barcodeInput = document.getElementById('pos-barcode-input');
    if (barcodeInput) {
      barcodeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleManualBarcodeEntry(barcodeInput.value.trim());
          barcodeInput.value = '';
        }
      });
    }

    // Customer Name Input
    const nameInput = document.getElementById('pos-customer-name');
    if (nameInput) {
      nameInput.addEventListener('input', (e) => {
        this.customerName = e.target.value;
      });
    }

    // Customer Phone / WhatsApp Input
    const phoneInput = document.getElementById('pos-customer-phone');
    if (phoneInput) {
      phoneInput.addEventListener('input', (e) => {
        this.customerPhone = e.target.value;
      });
    }

    // Discount Select / Input
    const discountInput = document.getElementById('pos-discount');
    if (discountInput) {
      discountInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) || 0;
        this.discountPercent = Math.max(0, Math.min(val, 100));
        this.updateTotals();
      });
    }

    // Payment Method
    const paySelect = document.getElementById('pos-payment-method');
    if (paySelect) {
      paySelect.addEventListener('change', (e) => {
        this.paymentMethod = e.target.value;
      });
    }

    // Clear Cart Button
    const clearBtn = document.getElementById('btn-clear-cart');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearCart());
    }

    // Trigger Complete & WhatsApp Share Button
    const waCheckoutBtn = document.getElementById('btn-pos-whatsapp-checkout');
    if (waCheckoutBtn) {
      waCheckoutBtn.addEventListener('click', () => this.processCheckout('whatsapp'));
    }

    // Trigger Print Receipt Button
    const printCheckoutBtn = document.getElementById('btn-pos-print-checkout');
    if (printCheckoutBtn) {
      printCheckoutBtn.addEventListener('click', () => this.processCheckout('print'));
    }
  },

  handleManualBarcodeEntry(query) {
    if (!query) return;

    // Search by exact barcode first
    let product = App.findProductByBarcode(query);

    // If not found by barcode, search by medicine name
    if (!product) {
      const qLower = query.toLowerCase();
      product = App.products.find(p => p.name.toLowerCase().includes(qLower));
    }

    if (product) {
      this.addToCart(product);
      App.playScanBeep();
      App.showToast(`Added: ${product.name}`, 'success');
    } else {
      App.showToast(`Product not found for "${query}"`, 'error');
    }
  },

  addToCart(product) {
    const existingIndex = this.cart.findIndex(item => item.product.id === product.id);

    if (existingIndex > -1) {
      // Increase quantity by 1
      this.cart[existingIndex].qty += 1;
      this.cart[existingIndex].subtotal = this.cart[existingIndex].qty * this.cart[existingIndex].unitPrice;
    } else {
      // New item in cart
      // Price is optional on product, default to 0 if not set and allow cashier to input
      const unitPrice = (product.salePrice !== undefined && product.salePrice !== null) ? Number(product.salePrice) : 0;
      this.cart.push({
        product: product,
        qty: 1,
        unitPrice: unitPrice,
        subtotal: unitPrice
      });
    }

    this.renderCart();
  },

  updateQuantity(index, newQty) {
    if (!this.cart[index]) return;
    const qty = Math.max(1, parseInt(newQty) || 1);
    this.cart[index].qty = qty;
    this.cart[index].subtotal = this.cart[index].qty * this.cart[index].unitPrice;
    this.renderCart();
  },

  updatePrice(index, newPrice) {
    if (!this.cart[index]) return;
    const price = Math.max(0, parseFloat(newPrice) || 0);
    this.cart[index].unitPrice = price;
    this.cart[index].subtotal = this.cart[index].qty * price;
    this.renderCart();
  },

  removeItem(index) {
    if (!this.cart[index]) return;
    const item = this.cart[index];
    this.cart.splice(index, 1);
    this.renderCart();
    App.showToast(`Removed ${item.product.name}`, 'info');
  },

  clearCart() {
    if (this.cart.length === 0) return;
    if (confirm('Are you sure you want to clear the current cart?')) {
      this.cart = [];
      this.customerName = '';
      this.customerPhone = '';
      const nameInput = document.getElementById('pos-customer-name');
      const phoneInput = document.getElementById('pos-customer-phone');
      if (nameInput) nameInput.value = '';
      if (phoneInput) phoneInput.value = '';
      this.renderCart();
      App.showToast('Cart cleared', 'info');
    }
  },

  renderCart() {
    const container = document.getElementById('cart-items-container');
    const badgeCount = document.getElementById('cart-item-count-badge');
    if (!container) return;

    if (badgeCount) {
      const totalPcs = this.cart.reduce((sum, item) => sum + item.qty, 0);
      badgeCount.textContent = `${this.cart.length} items (${totalPcs} pcs)`;
    }

    if (this.cart.length === 0) {
      container.innerHTML = `
        <div class="cart-empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
          <p style="font-weight: 700; font-size: 1.05rem; color: var(--text-main);">Cart is Empty</p>
          <p style="font-size: 0.82rem; margin-top: 0.35rem;">Scan a medicine barcode using the camera or select from the quick test chips above to add items.</p>
        </div>
      `;
      this.updateTotals();
      return;
    }

    container.innerHTML = this.cart.map((item, index) => {
      const p = item.product;
      const unitLabel = p.unit || 'Piece';
      return `
        <div class="cart-item-card">
          <div class="cart-item-info">
            <div class="cart-item-title">
              <span>${p.name}</span>
              <span class="badge-unit">${unitLabel}</span>
            </div>
            <div class="cart-item-meta">
              <span class="cart-item-barcode">Code: ${p.barcode || 'N/A'}</span>
              ${p.category ? `<span>• ${p.category}</span>` : ''}
              ${p.stock !== undefined ? `<span style="color: ${p.stock <= 10 ? 'var(--accent-rose)' : 'var(--text-muted)'};">• Stock: ${p.stock}</span>` : ''}
            </div>
          </div>

          <div class="cart-item-controls">
            <!-- Quantity Stepper -->
            <div class="qty-stepper">
              <button class="btn-stepper" onclick="PosModule.updateQuantity(${index}, ${item.qty - 1})" title="Decrease">-</button>
              <input type="number" class="qty-input" min="1" value="${item.qty}" onchange="PosModule.updateQuantity(${index}, this.value)" title="Quantity">
              <button class="btn-stepper" onclick="PosModule.updateQuantity(${index}, ${item.qty + 1})" title="Increase">+</button>
            </div>

            <!-- Price & Subtotal -->
            <div class="cart-item-price-wrap">
              <div class="cart-item-total">Rs. ${item.subtotal.toFixed(2)}</div>
              <div class="cart-item-unit-rate" onclick="PosModule.promptEditPrice(${index})" title="Click to edit unit rate">
                @ Rs. ${item.unitPrice.toFixed(2)} ✎
              </div>
            </div>

            <!-- Delete Button -->
            <button class="btn-delete-item" onclick="PosModule.removeItem(${index})" title="Remove item">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      `;
    }).join('');

    this.updateTotals();
  },

  promptEditPrice(index) {
    const item = this.cart[index];
    if (!item) return;
    const currentPrice = item.unitPrice;
    const input = prompt(`Enter new selling price per ${item.product.unit || 'unit'} for "${item.product.name}":`, currentPrice);
    if (input !== null) {
      const newPrice = parseFloat(input);
      if (!isNaN(newPrice) && newPrice >= 0) {
        this.updatePrice(index, newPrice);
        App.showToast(`Updated price to Rs. ${newPrice.toFixed(2)}`, 'info');
      }
    }
  },

  updateTotals() {
    const subtotal = this.cart.reduce((sum, item) => sum + item.subtotal, 0);
    const discountAmount = (subtotal * this.discountPercent) / 100;
    const grandTotal = Math.max(0, subtotal - discountAmount);

    const subtotalEl = document.getElementById('summary-subtotal');
    const discountEl = document.getElementById('summary-discount');
    const grandTotalEl = document.getElementById('summary-grand-total');

    if (subtotalEl) subtotalEl.textContent = `Rs. ${subtotal.toFixed(2)}`;
    if (discountEl) discountEl.textContent = `- Rs. ${discountAmount.toFixed(2)} (${this.discountPercent}%)`;
    if (grandTotalEl) grandTotalEl.textContent = `Rs. ${grandTotal.toFixed(2)}`;
  },

  processCheckout(action = 'whatsapp') {
    if (this.cart.length === 0) {
      App.showToast('Please add medicines to the cart before checking out.', 'error');
      return;
    }

    const subtotal = this.cart.reduce((sum, item) => sum + item.subtotal, 0);
    const discountAmount = (subtotal * this.discountPercent) / 100;
    const grandTotal = Math.max(0, subtotal - discountAmount);

    // Calculate estimated profit if purchase prices were recorded
    let totalCost = 0;
    this.cart.forEach(item => {
      const cost = item.product.purchasePrice !== undefined && item.product.purchasePrice !== null 
        ? Number(item.product.purchasePrice) 
        : item.unitPrice;
      totalCost += cost * item.qty;
    });
    const estimatedProfit = Math.max(0, grandTotal - totalCost);

    // Generate Invoice Object
    const invoiceNumber = `AMS-${Math.floor(1000 + Math.random() * 9000)}`;
    const invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: invoiceNumber,
      timestamp: new Date().toISOString(),
      customerName: this.customerName.trim() || 'Walk-in Customer',
      customerPhone: this.customerPhone.trim() || '',
      items: this.cart.map(item => ({
        id: item.product.id,
        name: item.product.name,
        barcode: item.product.barcode,
        unit: item.product.unit || 'Piece',
        qty: item.qty,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
        purchasePrice: item.product.purchasePrice || 0
      })),
      subtotal: subtotal,
      discountPercent: this.discountPercent,
      discountAmount: discountAmount,
      grandTotal: grandTotal,
      estimatedProfit: estimatedProfit,
      paymentMethod: this.paymentMethod,
      cashier: 'Abbas Medical Counter'
    };

    // Deduct stock from inventory
    this.cart.forEach(cartItem => {
      const prod = App.products.find(p => p.id === cartItem.product.id);
      if (prod && prod.stock !== undefined) {
        prod.stock = Math.max(0, prod.stock - cartItem.qty);
      }
    });
    App.saveProducts();

    // Save invoice
    App.invoices.unshift(invoice);
    App.saveInvoices();

    // Clear cart
    this.cart = [];
    const nameInput = document.getElementById('pos-customer-name');
    const phoneInput = document.getElementById('pos-customer-phone');
    if (nameInput) nameInput.value = '';
    if (phoneInput) phoneInput.value = '';
    this.renderCart();

    // Trigger Live Google Sheets Sync (if webhook configured)
    if (typeof SheetsModule !== 'undefined') {
      SheetsModule.syncSaleToGoogleSheet(invoice);
    }

    // Trigger Invoice Presentation & Sharing
    InvoiceModule.showInvoiceModal(invoice, action === 'whatsapp');
  },

  quickAddFromCatalog(productId) {
    const prod = App.products.find(p => p.id === productId);
    if (prod) {
      this.addToCart(prod);
      App.switchTab('pos');
      App.playScanBeep();
      App.showToast(`Added ${prod.name} to bill`, 'success');
    }
  }
};
