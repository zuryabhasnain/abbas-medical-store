/**
 * Abbas Medical Store - Invoice & WhatsApp Sharing Engine
 * Generates thermal receipts, creates formatted WhatsApp messages,
 * supports direct WhatsApp chat routing, mobile WebShare API, and thermal printing.
 */

const InvoiceModule = {
  activeInvoice: null,

  init() {
    this.bindEvents();
  },

  bindEvents() {
    // Close Invoice Modal
    const closeBtn = document.getElementById('btn-close-invoice-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        document.getElementById('modal-invoice')?.classList.remove('active');
      });
    }

    // Modal WhatsApp Send Trigger
    const waBtn = document.getElementById('btn-modal-send-whatsapp');
    if (waBtn) {
      waBtn.addEventListener('click', () => {
        this.shareInvoiceOnWhatsApp(this.activeInvoice);
      });
    }

    // Modal Print Trigger
    const printBtn = document.getElementById('btn-modal-print-invoice');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        window.print();
      });
    }

    // Modal Copy Text Trigger
    const copyBtn = document.getElementById('btn-modal-copy-invoice');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        this.copyInvoiceToClipboard(this.activeInvoice);
      });
    }

    // Modal WebShare Trigger (for Mobile)
    const shareBtn = document.getElementById('btn-modal-native-share');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        this.nativeMobileShare(this.activeInvoice);
      });
    }
  },

  showInvoiceModal(invoice, autoOpenWhatsApp = false) {
    this.activeInvoice = invoice;
    const modal = document.getElementById('modal-invoice');
    const container = document.getElementById('invoice-render-target');
    if (!modal || !container) return;

    container.innerHTML = this.buildReceiptHtml(invoice);

    // Sync modal phone input field
    const phoneInput = document.getElementById('modal-wa-phone-input');
    if (phoneInput) {
      phoneInput.value = invoice.customerPhone || '';
    }

    modal.classList.add('active');

    if (autoOpenWhatsApp) {
      this.shareInvoiceOnWhatsApp(invoice);
    }
  },

  buildReceiptHtml(invoice) {
    const dateFormatted = new Date(invoice.timestamp).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    const itemsHtml = invoice.items.map(item => `
      <tr>
        <td style="padding-top: 4px; padding-bottom: 2px;">
          <strong>${item.name}</strong>
          <div style="font-size: 0.7rem; color: #64748b;">${item.qty} ${item.unit} x Rs. ${Number(item.unitPrice).toFixed(2)}</div>
        </td>
        <td style="text-align: right; vertical-align: top; font-weight: 700;">
          Rs. ${Number(item.subtotal).toFixed(2)}
        </td>
      </tr>
    `).join('');

    return `
      <div class="invoice-receipt-wrapper">
        <div class="receipt-header">
          <div class="receipt-store-name">ABBAS MEDICAL STORE</div>
          <div class="receipt-store-sub">Retail & Wholesale Pharmacy</div>
          <div class="receipt-store-sub">📞 0300-1234567 • License #AMS-PH-992</div>
        </div>

        <div class="receipt-meta-grid">
          <div>
            <div><strong>Inv #:</strong> ${invoice.invoiceNumber}</div>
            <div><strong>Date:</strong> ${dateFormatted}</div>
          </div>
          <div style="text-align: right;">
            <div><strong>Customer:</strong> ${invoice.customerName || 'Walk-in'}</div>
            <div><strong>Phone:</strong> ${invoice.customerPhone || 'N/A'}</div>
          </div>
        </div>

        <table class="receipt-items-table">
          <thead>
            <tr>
              <th>Medicine / Item</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="receipt-totals">
          <div class="receipt-total-line">
            <span>Subtotal:</span>
            <span>Rs. ${Number(invoice.subtotal).toFixed(2)}</span>
          </div>
          ${invoice.discountAmount > 0 ? `
            <div class="receipt-total-line" style="color: #dc2626;">
              <span>Discount (${invoice.discountPercent}%):</span>
              <span>- Rs. ${Number(invoice.discountAmount).toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="receipt-total-line receipt-grand-total">
            <span>TOTAL AMOUNT:</span>
            <span>Rs. ${Number(invoice.grandTotal).toFixed(2)}</span>
          </div>
          <div class="receipt-total-line" style="font-size: 0.75rem; margin-top: 4px; color: #475569;">
            <span>Payment Mode:</span>
            <span>${invoice.paymentMethod || 'Cash'} (Paid)</span>
          </div>
        </div>

        <div class="receipt-footer-note">
          <p>*** THANK YOU FOR YOUR PURCHASE ***</p>
          <p style="margin-top: 2px;">Please take medicines according to prescription.</p>
          <p style="font-size: 0.65rem; color: #94a3b8; margin-top: 4px;">Software by Abbas Medical Store POS</p>
        </div>
      </div>
    `;
  },

  // Generates Clean WhatsApp Formatted Message with Emojis & Bold Formatting
  formatWhatsAppText(invoice) {
    const dateFormatted = new Date(invoice.timestamp).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    let text = `🧾 *ABBAS MEDICAL STORE*\n`;
    text += `📍 _Pharmacy & Healthcare Store_\n`;
    text += `📞 _Contact: 0300-1234567_\n`;
    text += `────────────────────\n`;
    text += `*Bill #:* ${invoice.invoiceNumber}\n`;
    text += `*Date:* ${dateFormatted}\n`;
    text += `*Customer:* ${invoice.customerName || 'Walk-in Customer'}\n`;
    text += `────────────────────\n`;
    text += `*MEDICINES / ITEMS:*\n`;

    invoice.items.forEach((item, idx) => {
      text += `${idx + 1}. *${item.name}*\n`;
      text += `   Qty: ${item.qty} ${item.unit} @ Rs.${Number(item.unitPrice).toFixed(2)} = *Rs.${Number(item.subtotal).toFixed(2)}*\n`;
    });

    text += `────────────────────\n`;
    text += `*Subtotal:* Rs.${Number(invoice.subtotal).toFixed(2)}\n`;

    if (invoice.discountAmount > 0) {
      text += `*Discount:* -Rs.${Number(invoice.discountAmount).toFixed(2)} (${invoice.discountPercent}%)\n`;
    }

    text += `💰 *TOTAL PAYABLE:* *Rs.${Number(invoice.grandTotal).toFixed(2)}*\n`;
    text += `*Payment Mode:* ${invoice.paymentMethod || 'Cash'} (Paid)\n`;
    text += `────────────────────\n`;
    text += `💊 *Thank you for choosing Abbas Medical Store!*\n`;
    text += `_Take medicines only as advised by your doctor._`;

    return text;
  },

  // Normalize phone numbers (especially Pakistani numbers: 03001234567 -> 923001234567)
  sanitizePhoneNumber(phone) {
    if (!phone) return '';
    let cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('03')) {
      cleaned = '92' + cleaned.slice(1);
    } else if (cleaned.startsWith('00')) {
      cleaned = cleaned.slice(2);
    }
    return cleaned;
  },

  // Share on WhatsApp Trigger
  shareInvoiceOnWhatsApp(invoice) {
    if (!invoice) return;

    // Check if phone was updated in modal input
    const phoneInput = document.getElementById('modal-wa-phone-input');
    const targetPhone = phoneInput ? phoneInput.value.trim() : invoice.customerPhone;
    const cleanPhone = this.sanitizePhoneNumber(targetPhone);
    const message = this.formatWhatsAppText(invoice);
    const encoded = encodeURIComponent(message);

    let waUrl = '';
    if (cleanPhone && cleanPhone.length >= 7) {
      // Direct WhatsApp Chat with recipient
      waUrl = `https://wa.me/${cleanPhone}?text=${encoded}`;
    } else {
      // Open WhatsApp contact picker so user can search or pick contact on phone!
      waUrl = `https://api.whatsapp.com/send?text=${encoded}`;
    }

    // Open WhatsApp in new tab or native app
    window.open(waUrl, '_blank');
    App.showToast('Opening WhatsApp...', 'success');
  },

  // Native Mobile Web Share API fallback
  async nativeMobileShare(invoice) {
    if (!invoice) return;
    const text = this.formatWhatsAppText(invoice);

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invoice ${invoice.invoiceNumber} - Abbas Medical Store`,
          text: text
        });
        App.showToast('Shared successfully!', 'success');
      } catch (err) {
        if (err.name !== 'AbortError') {
          this.copyInvoiceToClipboard(invoice);
        }
      }
    } else {
      this.copyInvoiceToClipboard(invoice);
    }
  },

  // Copy receipt text to clipboard
  copyInvoiceToClipboard(invoice) {
    if (!invoice) return;
    const text = this.formatWhatsAppText(invoice);
    navigator.clipboard.writeText(text).then(() => {
      App.showToast('Receipt text copied to clipboard! You can paste in WhatsApp.', 'success');
    }).catch(() => {
      App.showToast('Failed to copy to clipboard', 'error');
    });
  },

  // Render Invoices History Tab
  renderHistory() {
    const tbody = document.getElementById('invoices-table-body');
    const countBadge = document.getElementById('invoices-total-count');
    if (!tbody) return;

    if (countBadge) {
      countBadge.textContent = `${App.invoices.length} Bills`;
    }

    if (App.invoices.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">
            No sales or invoices recorded yet. Start selling from the POS tab!
          </td>
        </tr>
      `;
    } else {
      tbody.innerHTML = App.invoices.map(inv => {
        const dateFormatted = new Date(inv.timestamp).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        const itemsSummary = inv.items.map(i => `${i.name} (x${i.qty})`).join(', ');

        return `
          <tr>
            <td>
              <strong style="font-family: var(--font-mono); color: var(--primary);">${inv.invoiceNumber}</strong>
            </td>
            <td><span style="font-size: 0.8rem; color: var(--text-secondary);">${dateFormatted}</span></td>
            <td>
              <div>${inv.customerName || 'Walk-in'}</div>
              ${inv.customerPhone ? `<div style="font-size: 0.74rem; color: var(--text-muted);">${inv.customerPhone}</div>` : ''}
            </td>
            <td style="max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.82rem; color: var(--text-secondary);" title="${itemsSummary}">
              ${itemsSummary}
            </td>
            <td>
              <strong style="font-family: var(--font-mono); color: var(--text-main);">Rs. ${Number(inv.grandTotal).toFixed(2)}</strong>
            </td>
            <td>
              <span class="badge badge-success">Paid (${inv.paymentMethod})</span>
            </td>
            <td>
              <div style="display: flex; gap: 0.45rem; align-items: center;">
                <button class="btn-icon" style="width: 32px; height: 32px; color: var(--wa-green);" onclick="InvoiceModule.reopenInvoice('${inv.id}', true)" title="Share on WhatsApp">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                </button>
                <button class="btn-icon" style="width: 32px; height: 32px;" onclick="InvoiceModule.reopenInvoice('${inv.id}', false)" title="View Invoice">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    // Render Mobile Bill Cards (Zero Horizontal Scrolling)
    const mobileContainer = document.getElementById('invoices-mobile-cards');
    if (mobileContainer) {
      if (App.invoices.length === 0) {
        mobileContainer.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-muted); background: #ffffff; border-radius: 8px;">No sales bills recorded yet.</div>`;
      } else {
        mobileContainer.innerHTML = App.invoices.map(inv => {
          const dateFormatted = new Date(inv.timestamp).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
          const itemsSummary = inv.items.map(i => `${i.name} (x${i.qty})`).join(', ');

          return `
            <div class="mobile-med-card">
              <div class="mobile-med-header">
                <div>
                  <div style="font-weight: 800; font-size: 1.05rem; color: #1d4ed8; font-family: var(--font-mono);">${inv.invoiceNumber}</div>
                  <div style="font-size: 0.74rem; color: #64748b;">${dateFormatted}</div>
                </div>
                <span class="badge badge-success">Paid (${inv.paymentMethod})</span>
              </div>
              <div style="font-size: 0.85rem; color: #0f172a; margin-top: 2px;">
                <strong>Customer:</strong> ${inv.customerName || 'Walk-in'} ${inv.customerPhone ? `(${inv.customerPhone})` : ''}
              </div>
              <div style="font-size: 0.78rem; color: #64748b; line-height: 1.3;">
                ${itemsSummary}
              </div>
              <div class="mobile-med-row">
                <span style="font-size: 0.82rem; color: #334155;">Total Amount:</span>
                <strong style="font-size: 1.15rem; color: #1d4ed8; font-family: var(--font-mono);">Rs. ${Number(inv.grandTotal).toFixed(2)}</strong>
              </div>
              <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 0.5rem; margin-top: 0.25rem;">
                <button class="btn-whatsapp-checkout" style="padding: 0.45rem 0.75rem; font-size: 0.82rem;" onclick="InvoiceModule.reopenInvoice('${inv.id}', true)">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                  <span>WhatsApp</span>
                </button>
                <button class="btn-secondary" style="justify-content: center; padding: 0.45rem 0.75rem; font-size: 0.82rem;" onclick="InvoiceModule.reopenInvoice('${inv.id}', false)">
                  🧾 View Bill
                </button>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  },

  reopenInvoice(invoiceId, shareImmediately = false) {
    const inv = App.invoices.find(i => i.id === invoiceId);
    if (!inv) return;
    this.showInvoiceModal(inv, shareImmediately);
  }
};
