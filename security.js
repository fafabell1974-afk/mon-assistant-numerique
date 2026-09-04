const securityModule = {
  pin: '',
  tempPin: '',
  pinMode: 'check',
  autoLockTimer: null,

  async init() {
    const savedPin = await dbModule.getSetting('pin', '');
    const autoLock = await dbModule.getSetting('autoLock', false);
    if (savedPin) {
      if (autoLock) this.startAutoLock();
      this.showPin('check');
    }
    // Mettre à jour le toggle dans les paramètres
    if (autoLock) {
      const toggle = document.getElementById('autoLockToggle');
      if (toggle) toggle.classList.add('active');
    }
  },

  startAutoLock() {
    ['click', 'touchstart', 'input', 'scroll'].forEach(evt => {
      document.addEventListener(evt, () => this.resetAutoLock(), { passive: true });
    });
    this.resetAutoLock();
  },

  resetAutoLock() {
    clearTimeout(this.autoLockTimer);
    this.autoLockTimer = setTimeout(() => {
      const pin = dbModule.getSetting('pin', '');
      pin.then(p => { if (p) this.showPin('check'); });
    }, 5 * 60 * 1000);
  },

  async toggleAutoLock() {
    const current = await dbModule.getSetting('autoLock', false);
    await dbModule.setSetting('autoLock', !current);
    const toggle = document.getElementById('autoLockToggle');
    if (toggle) toggle.classList.toggle('active');
    if (!current) {
      this.startAutoLock();
      app.toast('Verrouillage auto activé (5 min)');
    } else {
      clearTimeout(this.autoLockTimer);
      app.toast('Verrouillage auto désactivé');
    }
  },

  showPin(mode) {
    this.pinMode = mode;
    this.tempPin = '';
    document.getElementById('pinOverlay').classList.add('active');
    this.updatePinDisplay();
    const title = document.querySelector('#pinOverlay h2');
    if (title) title.textContent = mode === 'check' ? '🔒 Assistant Numérique' : '🔒 Nouveau code PIN';
  },

  enterPin(digit) {
    if (this.tempPin.length < 4) {
      this.tempPin += digit;
      this.updatePinDisplay();
      if (this.tempPin.length === 4) setTimeout(() => this.validatePin(), 200);
    }
  },

  backspacePin() {
    this.tempPin = this.tempPin.slice(0, -1);
    this.updatePinDisplay();
  },

  clearPin() {
    this.tempPin = '';
    this.updatePinDisplay();
  },

  updatePinDisplay() {
    const dots = document.querySelectorAll('#pinDisplay .pin-dot');
    dots.forEach((d, i) => d.classList.toggle('filled', i < this.tempPin.length));
  },

  async validatePin() {
    if (this.pinMode === 'setup') {
      this.pin = this.tempPin;
      this.pinMode = 'confirm';
      this.tempPin = '';
      this.updatePinDisplay();
      app.toast('Répétez le code pour confirmer');
      return;
    }
    if (this.pinMode === 'confirm') {
      if (this.pin === this.tempPin) {
        await dbModule.setSetting('pin', this.pin);
        document.getElementById('pinOverlay').classList.remove('active');
        app.toast('PIN enregistré');
        this.pin = '';
      } else {
        app.toast('Les codes ne correspondent pas');
        this.pinMode = 'setup';
        this.tempPin = '';
        this.updatePinDisplay();
      }
      return;
    }
    // check mode
    const saved = await dbModule.getSetting('pin', '');
    if (this.tempPin === saved) {
      document.getElementById('pinOverlay').classList.remove('active');
    } else {
      app.toast('Code incorrect');
      this.tempPin = '';
      this.updatePinDisplay();
    }
  },

  setupPin() {
    dbModule.getSetting('pin', '').then(p => {
      if (p && !confirm('Un PIN existe déjà. Le remplacer ?')) return;
      this.showPin('setup');
      app.toast('Entrez un nouveau code à 4 chiffres');
    });
  },

  forgotPin() {
    if (confirm('Cela supprimera le PIN. Continuer ?')) {
      dbModule.setSetting('pin', '');
      dbModule.setSetting('autoLock', false);
      document.getElementById('pinOverlay').classList.remove('active');
      app.toast('PIN réinitialisé');
    }
  }
};
