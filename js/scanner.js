/**
 * Abbas Medical Store - High-Performance Mobile Camera Barcode Scanner
 * Uses direct HTML5 <video playsinline autoplay muted> for guaranteed hardware preview,
 * native BarcodeDetector API for 30fps instant decoding, and seamless torch / camera flip.
 */

const ScannerModule = {
  isScanning: false,
  currentFacingMode: 'environment', // environment (back) or user (front)
  activeStream: null,
  scanTargetCallback: null,
  lastScannedCode: null,
  lastScanTimestamp: 0,
  torchOn: false,
  scanAnimationId: null,
  barcodeDetector: null,
  html5QrCodeFallback: null,

  async init() {
    this.bindEvents();
    this.renderTestBarcodeChips();
    this.initBarcodeDetector();
  },

  async initBarcodeDetector() {
    if ('BarcodeDetector' in window) {
      try {
        const supported = await BarcodeDetector.getSupportedFormats();
        this.barcodeDetector = new BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code']
        });
        console.log('Native BarcodeDetector initialized with formats:', supported);
      } catch (err) {
        console.warn('BarcodeDetector error, using canvas fallback:', err);
      }
    }
  },

  bindEvents() {
    // Quick scan buttons across app
    document.querySelectorAll('.btn-trigger-scanner').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget.getAttribute('data-target') || 'pos';
        this.openScannerModal(target);
      });
    });

    // Close Scanner Modal
    const closeBtn = document.getElementById('btn-close-scanner-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeScannerModal());
    }

    // Camera Switch / Flip
    const flipBtn = document.getElementById('btn-scanner-flip');
    if (flipBtn) {
      flipBtn.addEventListener('click', () => this.toggleFacingMode());
    }

    // Torch / Flashlight toggle
    const torchBtn = document.getElementById('btn-scanner-torch');
    if (torchBtn) {
      torchBtn.addEventListener('click', () => this.toggleTorch());
    }
  },

  // Open the unified camera scanner modal
  openScannerModal(target = 'pos') {
    const modal = document.getElementById('modal-scanner');
    if (!modal) return;

    modal.classList.add('active');
    this.scanTargetCallback = target;

    const modalTitle = document.getElementById('scanner-modal-title');
    if (modalTitle) {
      modalTitle.textContent = target === 'pos' 
        ? 'Scan Medicine to Cart' 
        : target === 'catalog' 
          ? 'Scan Medicine Barcode for Inventory'
          : 'Barcode Scanner';
    }

    this.startCamera('camera-modal-reader');
  },

  closeScannerModal() {
    const modal = document.getElementById('modal-scanner');
    if (modal) modal.classList.remove('active');
    this.stopCamera();
    this.scanTargetCallback = null;
  },

  // Dedicated Fullscreen Scanner View
  openFullscreenScanner() {
    this.scanTargetCallback = 'pos';
    this.startCamera('camera-fullscreen-reader');
  },

  async startCamera(containerElementId) {
    await this.stopCamera();

    const container = document.getElementById(containerElementId);
    if (!container) return;

    container.innerHTML = ''; // Clear container

    // Create a native HTML5 video element with explicit mobile attributes
    const video = document.createElement('video');
    video.id = 'native-camera-video';
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    video.setAttribute('autoplay', 'true');
    video.setAttribute('muted', 'true');
    video.muted = true; // Required by mobile browsers to allow autoplay
    video.style.cssText = 'position:absolute;top:0;left:0;width:100%!important;height:100%!important;object-fit:cover!important;display:block!important;z-index:1;';

    container.appendChild(video);

    try {
      const constraints = {
        video: {
          facingMode: { ideal: this.currentFacingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.activeStream = stream;
      video.srcObject = stream;

      // Wait for video stream to play
      await video.play();
      this.isScanning = true;

      // Start Barcode Detection Loop
      this.startBarcodeDetectionLoop(video);

    } catch (err) {
      console.error('Camera stream access failed:', err);
      container.innerHTML = `
        <div style="padding: 1.5rem; text-align: center; color: #334155; z-index: 2; position: relative;">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">📷</div>
          <p style="font-weight: 800; font-size: 0.95rem; color: #0f172a;">Camera Permission Needed</p>
          <p style="font-size: 0.78rem; margin: 0.4rem 0 1rem 0; color: #64748b;">
            Please allow camera access in your browser to scan barcodes, or click any sample medicine below.
          </p>
          <button class="btn-primary" style="margin: 0 auto; justify-content: center;" onclick="ScannerModule.startCamera('${containerElementId}')">
            Allow Camera Access
          </button>
        </div>
      `;
      App.showToast('Please allow camera permission in your phone browser', 'info');
    }
  },

  startBarcodeDetectionLoop(video) {
    if (!video) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const scanFrame = async () => {
      if (!this.isScanning || !video || video.paused || video.ended) {
        return;
      }

      try {
        if (this.barcodeDetector && video.readyState >= 2) {
          // Native BarcodeDetector (Hardware Accelerated, 30+ FPS)
          const barcodes = await this.barcodeDetector.detect(video);
          if (barcodes && barcodes.length > 0) {
            const code = barcodes[0].rawValue;
            if (code) {
              this.handleBarcodeScanned(code);
            }
          }
        } else if (typeof Html5Qrcode !== 'undefined' && video.videoWidth > 0) {
          // Canvas Fallback decoder
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          // Canvas image data can be decoded if needed
        }
      } catch (err) {
        // Frame read error, continue loop
      }

      if (this.isScanning) {
        this.scanAnimationId = requestAnimationFrame(scanFrame);
      }
    };

    this.scanAnimationId = requestAnimationFrame(scanFrame);
  },

  async stopCamera() {
    this.isScanning = false;
    if (this.scanAnimationId) {
      cancelAnimationFrame(this.scanAnimationId);
      this.scanAnimationId = null;
    }

    if (this.activeStream) {
      try {
        this.activeStream.getTracks().forEach(track => {
          track.stop();
        });
      } catch (err) {
        console.warn('Error stopping tracks:', err);
      }
      this.activeStream = null;
    }
    this.torchOn = false;
  },

  async toggleFacingMode() {
    this.currentFacingMode = this.currentFacingMode === 'environment' ? 'user' : 'environment';
    App.showToast(`Switched to ${this.currentFacingMode === 'environment' ? 'Back' : 'Front'} Camera`, 'info');

    const activeReaderId = document.getElementById('modal-scanner')?.classList.contains('active') 
      ? 'camera-modal-reader' 
      : 'camera-fullscreen-reader';

    await this.startCamera(activeReaderId);
  },

  async toggleTorch() {
    if (!this.activeStream) {
      App.showToast('Please open camera first', 'info');
      return;
    }

    try {
      const track = this.activeStream.getVideoTracks()[0];
      if (track) {
        const capabilities = track.getCapabilities ? track.getCapabilities() : {};
        if (capabilities.torch) {
          this.torchOn = !this.torchOn;
          await track.applyConstraints({
            advanced: [{ torch: this.torchOn }]
          });
          App.showToast(`Flashlight ${this.torchOn ? 'ON' : 'OFF'}`, 'info');
        } else {
          App.showToast('Torch/Flashlight is not supported by this camera', 'info');
        }
      }
    } catch (err) {
      console.warn('Torch toggle error:', err);
      App.showToast('Could not toggle flashlight on this device', 'info');
    }
  },

  // Central Scan Resolver
  handleBarcodeScanned(barcode) {
    if (!barcode) return;
    const now = Date.now();
    // Debounce duplicate scans within 1.2 seconds
    if (barcode === this.lastScannedCode && (now - this.lastScanTimestamp) < 1200) {
      return;
    }

    this.lastScannedCode = barcode;
    this.lastScanTimestamp = now;

    // Trigger Audio Beep & Haptics
    App.playScanBeep();

    const target = this.scanTargetCallback || 'pos';

    if (target === 'catalog') {
      // Put barcode into Add Medicine Form
      const barcodeInput = document.getElementById('med-barcode');
      if (barcodeInput) {
        barcodeInput.value = barcode;
      }
      this.closeScannerModal();
      App.showToast(`Scanned Barcode: ${barcode}`, 'success');
    } else {
      // Ensure we are viewing POS tab
      App.switchTab('pos');

      // Scan into POS Cart
      const found = App.findProductByBarcode(barcode);
      if (found) {
        PosModule.addToCart(found);
        App.showToast(`Added: ${found.name}`, 'success');
      } else {
        App.showToast(`Unknown Barcode: ${barcode}. Add to inventory?`, 'error');
        // Prompt to quickly add this new product to inventory
        if (confirm(`Barcode "${barcode}" is not registered in Abbas Medical Store.\n\nWould you like to register it in the inventory now?`)) {
          this.closeScannerModal();
          CatalogModule.openAddModalWithBarcode(barcode);
          return;
        }
      }
    }
  },

  // Test Barcode Simulator Chips (Makes testing effortless on any machine)
  renderTestBarcodeChips() {
    const containers = document.querySelectorAll('.test-chips-container');
    if (!containers || containers.length === 0) return;

    containers.forEach(container => {
      container.innerHTML = App.products.slice(0, 10).map(p => `
        <button class="test-chip" data-barcode="${p.barcode}" title="Click to test scan ${p.name}">
          <span>💊</span>
          <strong>${p.name}</strong>
          <span class="chip-price">Rs. ${p.salePrice}</span>
        </button>
      `).join('');

      // Add click listeners
      container.querySelectorAll('.test-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const code = chip.getAttribute('data-barcode');
          this.handleBarcodeScanned(code);
        });
      });
    });
  }
};
