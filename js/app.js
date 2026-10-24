/**
 * Abbas Medical Store - Application Core
 * State Management, Audio Beep Synthesizer, LocalStorage Persistence & Event Hub
 */

const STORAGE_KEYS = {
  PRODUCTS: 'abbas_medical_products',
  INVOICES: 'abbas_medical_invoices',
  SETTINGS: 'abbas_medical_settings',
  THEME: 'abbas_medical_theme'
};

// Initial Seed Data (Authentic Medical Store Inventory)
const DEFAULT_PRODUCTS = [
  {
    id: 'prod-1',
    barcode: '8964000100123',
    name: 'Panadol 500mg',
    category: 'Analgesics / Fever',
    unit: 'Tablet',
    salePrice: 4.00,
    purchasePrice: 3.00,
    stock: 240,
    batchNo: 'BN-2024A',
    expiryDate: '2027-08-30'
  },
  {
    id: 'prod-2',
    barcode: '8964000100456',
    name: 'Panadol Extra',
    category: 'Analgesics / Fever',
    unit: 'Tablet',
    salePrice: 6.00,
    purchasePrice: 4.50,
    stock: 180,
    batchNo: 'BN-2024E',
    expiryDate: '2027-11-15'
  },
  {
    id: 'prod-3',
    barcode: '8964000100789',
    name: 'Disprin 300mg Soluble',
    category: 'Analgesics / Fever',
    unit: 'Tablet',
    salePrice: 3.50,
    purchasePrice: 2.50,
    stock: 150,
    batchNo: 'BN-2024D',
    expiryDate: '2027-04-20'
  },
  {
    id: 'prod-4',
    barcode: '8964000200111',
    name: 'Brufen 400mg',
    category: 'Pain Relief',
    unit: 'Tablet',
    salePrice: 8.00,
    purchasePrice: 6.00,
    stock: 120,
    batchNo: 'BN-BR400',
    expiryDate: '2027-09-10'
  },
  {
    id: 'prod-5',
    barcode: '8964000300222',
    name: 'Augmentin 625mg',
    category: 'Antibiotics',
    unit: 'Tablet',
    salePrice: 45.00,
    purchasePrice: 36.00,
    stock: 45,
    batchNo: 'AG-625M',
    expiryDate: '2026-12-31'
  },
  {
    id: 'prod-6',
    barcode: '8964000400333',
    name: 'Flagyl 400mg',
    category: 'Antibiotics',
    unit: 'Tablet',
    salePrice: 5.00,
    purchasePrice: 3.80,
    stock: 85,
    batchNo: 'FL-400A',
    expiryDate: '2027-06-18'
  },
  {
    id: 'prod-7',
    barcode: '8964000500444',
    name: 'Risek 20mg (Omeprazole)',
    category: 'Gastro / Antacid',
    unit: 'Capsule',
    salePrice: 28.00,
    purchasePrice: 22.00,
    stock: 60,
    batchNo: 'RK-20MG',
    expiryDate: '2027-01-25'
  },
  {
    id: 'prod-8',
    barcode: '8964000600555',
    name: 'Arinac Forte',
    category: 'Cold & Allergy',
    unit: 'Tablet',
    salePrice: 12.00,
    purchasePrice: 9.50,
    stock: 95,
    batchNo: 'AR-FT01',
    expiryDate: '2027-05-14'
  },
  {
    id: 'prod-9',
    barcode: '8964000700666',
    name: 'Softin 10mg (Loratadine)',
    category: 'Cold & Allergy',
    unit: 'Tablet',
    salePrice: 15.00,
    purchasePrice: 11.00,
    stock: 40,
    batchNo: 'SF-10MG',
    expiryDate: '2027-03-30'
  },
  {
    id: 'prod-10',
    barcode: '8964000800777',
    name: 'Gaviscon Liquid 120ml',
    category: 'Syrups',
    unit: 'Bottle',
    salePrice: 195.00,
    purchasePrice: 160.00,
    stock: 18,
    batchNo: 'GV-120ML',
    expiryDate: '2026-11-20'
  },
  {
    id: 'prod-11',
    barcode: '8964000900888',
    name: 'Sancos Cough Syrup 120ml',
    category: 'Syrups',
    unit: 'Bottle',
    salePrice: 140.00,
    purchasePrice: 115.00,
    stock: 22,
    batchNo: 'SN-120ML',
    expiryDate: '2027-08-10'
  },
  {
    id: 'prod-12',
    barcode: '8964001000999',
    name: 'Dettol Antiseptic 100ml',
    category: 'Antiseptic / First Aid',
    unit: 'Bottle',
    salePrice: 220.00,
    purchasePrice: 180.00,
    stock: 35,
    batchNo: 'DT-100ML',
    expiryDate: '2028-01-10'
  },
  {
    id: 'prod-13',
    barcode: '8964001100011',
    name: 'Surgical Face Masks 3-Ply',
    category: 'Medical Supplies',
    unit: 'Box',
    salePrice: 250.00,
    purchasePrice: 180.00,
    stock: 50,
    batchNo: 'MSK-50P',
    expiryDate: '2029-12-31'
  },
  {
    id: 'prod-14',
    barcode: '8964001200022',
    name: 'Band-Aid Medicated Strips (100s)',
    category: 'Medical Supplies',
    unit: 'Box',
    salePrice: 180.00,
    purchasePrice: 130.00,
    stock: 28,
    batchNo: 'BA-100S',
    expiryDate: '2028-05-15'
  }
];

class AppState {
  constructor() {
    this.products = this.loadProducts();
    this.invoices = this.loadInvoices();
    this.activeTab = 'pos';
    this.audioContext = null;
    this.initTheme();
    this.initAudio();
  }

  loadProducts() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed reading products from localStorage', e);
    }
    // Seed default dataset
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
    return DEFAULT_PRODUCTS;
  }

  saveProducts() {
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(this.products));
    } catch (e) {
      console.error('Failed saving products to localStorage', e);
    }
  }

  loadInvoices() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.INVOICES);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed reading invoices from localStorage', e);
    }
    return [];
  }

  saveInvoices() {
    try {
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(this.invoices));
    } catch (e) {
      console.error('Failed saving invoices to localStorage', e);
    }
  }

  initTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(STORAGE_KEYS.THEME, next);
    App.showToast(`Switched to ${next} theme`, 'info');
  }

  initAudio() {
    // Lazy audio context init on user gesture
    window.addEventListener('click', () => {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.audioContext = new AudioCtx();
        }
      }
    }, { once: true });
  }

  playScanBeep() {
    try {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.audioContext = new AudioCtx();
      }
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      if (this.audioContext) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, this.audioContext.currentTime); // High-pitched scanner chirp
        gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.09);
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        osc.start();
        osc.stop(this.audioContext.currentTime + 0.09);
      }
    } catch (err) {
      console.warn('Audio feedback failed', err);
    }

    // Haptic vibration on mobile
    if (navigator.vibrate) {
      navigator.vibrate(40);
    }
  }

  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    } else {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `${iconSvg}<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'all 0.3s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  switchTab(tabId) {
    this.activeTab = tabId;

    // Update desktop nav buttons
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      if (btn.getAttribute('data-tab') === tabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update mobile nav buttons
    document.querySelectorAll('.mobile-nav-item').forEach(btn => {
      if (btn.getAttribute('data-tab') === tabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Switch view sections
    document.querySelectorAll('.view-section').forEach(view => {
      if (view.id === `view-${tabId}`) {
        view.classList.add('active');
      } else {
        view.classList.remove('active');
      }
    });

    // Lifecycle triggers
    if (tabId === 'dashboard') {
      DashboardModule.render();
    } else if (tabId === 'catalog') {
      CatalogModule.render();
    } else if (tabId === 'invoices') {
      InvoiceModule.renderHistory();
    } else if (tabId === 'scanner') {
      ScannerModule.openFullscreenScanner();
    } else if (tabId === 'sheets' && typeof SheetsModule !== 'undefined') {
      SheetsModule.renderSettingsView();
    }
  }

  // Barcode Lookup Helper
  findProductByBarcode(code) {
    if (!code) return null;
    const cleanCode = String(code).trim().toLowerCase();
    return this.products.find(p => p.barcode && String(p.barcode).trim().toLowerCase() === cleanCode);
  }
}

// Global App Instance
const App = new AppState();

// Initialize on DOM load
window.addEventListener('DOMContentLoaded', () => {
  // Navigation event listeners
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      if (tab) App.switchTab(tab);
    });
  });

  // Theme switch button
  const themeBtn = document.getElementById('btn-toggle-theme');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => App.toggleTheme());
  }

  // Live Clock update
  const clockEl = document.getElementById('live-time-display');
  if (clockEl) {
    const updateTime = () => {
      const now = new Date();
      clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };
    updateTime();
    setInterval(updateTime, 1000);
  }

  // Render initial modules
  PosModule.init();
  CatalogModule.init();
  DashboardModule.init();
  InvoiceModule.init();
  ScannerModule.init();
  if (typeof SheetsModule !== 'undefined') {
    SheetsModule.init();
  }

  // Register Service Worker for PWA
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').then((reg) => {
        console.log('Abbas Medical Store PWA Service Worker registered:', reg.scope);
      }).catch((err) => {
        console.warn('PWA Service Worker registration skipped:', err);
      });
    });
  }

  // PWA Standalone Install Trigger
  let deferredPrompt = null;
  const installBanner = document.getElementById('pwa-install-banner');
  const installBtn = document.getElementById('btn-pwa-install');
  const dismissBtn = document.getElementById('btn-dismiss-pwa-banner');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    const isDismissed = localStorage.getItem('pwa_banner_dismissed') === 'true';
    if (installBanner && !isStandalone && !isDismissed) {
      installBanner.style.display = 'flex';
    }
  });

  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          App.showToast('Installing Abbas Medical Store App!', 'success');
        }
        deferredPrompt = null;
        if (installBanner) installBanner.style.display = 'none';
        localStorage.setItem('pwa_banner_dismissed', 'true');
      } else {
        // iOS or non-Chrome instructions modal
        document.getElementById('modal-ios-install')?.classList.add('active');
      }
    });
  }

  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      if (installBanner) installBanner.style.display = 'none';
      localStorage.setItem('pwa_banner_dismissed', 'true');
    });
  }

  // Close iOS Install Modal
  document.getElementById('btn-close-ios-install')?.addEventListener('click', () => {
    document.getElementById('modal-ios-install')?.classList.remove('active');
  });
});

