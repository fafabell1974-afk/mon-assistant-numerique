const app = {
  currentSection: 'dashboard',
  currentClientId: null,
  currentDeviceId: null,
  currentInterventionId: null,
  editingClientId: null,
  editingDeviceId: null,

  async init() {
    await dbModule.init();
    this.updateOnlineStatus();
    window.addEventListener('online', () => this.updateOnlineStatus());
    window.addEventListener('offline', () => this.updateOnlineStatus());

    // Theme
    const savedTheme = await dbModule.getSetting('theme', 'light');
    if (savedTheme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');

    // Populate selects
    await this.populateSelects();

    // Refresh all views
    this.refreshAll();

    // Security
    await securityModule.init();

    // Google Drive init
    googleDriveModule.init();

    app.toast('Assistant Numérique prêt');
  },

  updateOnlineStatus() {
    const online = navigator.onLine;
    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');
    if (online) {
      dot.classList.add('online');
      text.textContent = 'En ligne';
    } else {
      dot.classList.remove('online');
      text.textContent = 'Hors ligne';
    }
  },

  goTo(section) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById('sec-' + section)?.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`.nav-item[data-target="${section}"]`)?.classList.add('active');
    this.currentSection = section;
    window.scrollTo(0, 0);

    if (section === 'dashboard') this.refreshDashboard();
    if (section === 'clients') clientsModule.render();
    if (section === 'devices') devicesModule.render();
    if (section === 'interventions') interventionsModule.render();
    if (section === 'checklists') checklistsModule.render();
    if (section === 'documentation') documentationModule.render();
    if (section === 'ai') aiModule.init();
    if (section === 'settings') settingsModule.load();
  },

  openModal(id, data = {}) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
    if (id === 'modal-client') clientsModule.prepareModal(data);
    if (id === 'modal-device') devicesModule.prepareModal(data);
  },

  closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
  },

  toast(message, duration = 2500) {
    const t = document.getElementById('toast');
    t.textContent = message;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), duration);
  },

  async populateSelects() {
    const clients = await dbModule.getAll('clients');
    const opts = clients.map(c => `<option value="${c.id}">${c.prenom} ${c.nom}</option>`).join('');

    ['deviceClient', 'aiClientSelect', 'filterClient'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        const first = el.options[0]?.outerHTML || '';
        el.innerHTML = first + opts;
      }
    });
  },

  async refreshAll() {
    this.refreshDashboard();
    clientsModule.render();
    devicesModule.render();
    interventionsModule.render();
    checklistsModule.render();
    documentationModule.render();
    await this.populateSelects();
  },

  async refreshDashboard() {
    const clients = await dbModule.getAll('clients');
    const interventions = await dbModule.getAll('interventions');
    const today = new Date().setHours(0, 0, 0, 0);

    document.getElementById('statClients').textContent = clients.length;
    document.getElementById('statToday').textContent = interventions.filter(i => new Date(i.date).setHours(0, 0, 0, 0) === today).length;
    document.getElementById('statDone').textContent = interventions.filter(i => i.status === 'resolu').length;
    document.getElementById('statPending').textContent = interventions.filter(i => i.status === 'en-cours').length;

    // Derniers clients
    const recentClients = [...clients].sort((a, b) => (b.lastIntervention || b.createdAt) - (a.lastIntervention || a.createdAt)).slice(0, 5);
    document.getElementById('dashboardClients').innerHTML = recentClients.length
      ? recentClients.map(c => `
        <div class="list-item" onclick="app.goTo('client-detail'); clientsModule.showDetail(${c.id})">
          <div>
            <div class="list-item-title">${c.prenom} ${c.nom}</div>
            <div class="list-item-sub">${c.phone || ''}</div>
          </div>
          <span class="list-item-meta">${c.lastIntervention ? new Date(c.lastIntervention).toLocaleDateString('fr-FR') : 'Jamais'}</span>
        </div>
      `).join('')
      : '<div class="empty-state">Aucun client</div>';

    // Dernières interventions
    const recentInt = [...interventions].sort((a, b) => b.date - a.date).slice(0, 5);
    document.getElementById('dashboardInterventions').innerHTML = recentInt.length
      ? recentInt.map(i => `
        <div class="list-item" onclick="app.goTo('intervention-detail'); interventionsModule.showDetail(${i.id})">
          <div>
            <div class="list-item-title">${i.problem?.substring(0, 40) || 'Intervention'}...</div>
            <div class="list-item-sub">${new Date(i.date).toLocaleDateString('fr-FR')} — ${this.statusLabel(i.status)}</div>
          </div>
        </div>
      `).join('')
      : '<div class="empty-state">Aucune intervention</div>';
  },

  statusLabel(s) {
    const map = { 'en-cours': 'En cours', 'resolu': 'Résolu', 'non-resolu': 'Non résolu', 'a-revoir': 'À revoir' };
    return map[s] || s;
  },

  async globalSearch(query) {
    if (!query.trim()) { app.toast('Entrez un terme de recherche'); return; }
    query = query.toLowerCase();
    const [clients, devices, interventions, docs] = await Promise.all([
      dbModule.getAll('clients'),
      dbModule.getAll('devices'),
      dbModule.getAll('interventions'),
      dbModule.getAll('documentation')
    ]);

    const results = { clients: [], devices: [], interventions: [], docs: [] };

    clients.forEach(c => {
      if ((c.nom + ' ' + c.prenom + ' ' + c.phone + ' ' + c.email).toLowerCase().includes(query))
        results.clients.push(c);
    });
    devices.forEach(d => {
      if ((d.brand + ' ' + d.model + ' ' + d.os).toLowerCase().includes(query))
        results.devices.push(d);
    });
    interventions.forEach(i => {
      if ((i.problem + ' ' + i.solution + ' ' + i.diagnostic).toLowerCase().includes(query))
        results.interventions.push(i);
    });
    docs.forEach(d => {
      if ((d.title + ' ' + d.source).toLowerCase().includes(query))
        results.docs.push(d);
    });

    let html = '';
    if (results.clients.length) {
      html += '<h3 style="margin:16px 0 8px">👤 Clients</h3>';
      html += results.clients.map(c => `
        <div class="list-item" onclick="app.goTo('client-detail'); clientsModule.showDetail(${c.id})">
          <div class="list-item-title">${c.prenom} ${c.nom}</div>
          <div class="list-item-sub">${c.phone || ''}</div>
        </div>
      `).join('');
    }
    if (results.devices.length) {
      html += '<h3 style="margin:16px 0 8px">📱 Appareils</h3>';
      html += results.devices.map(d => `
        <div class="list-item" onclick="app.goTo('device-detail'); devicesModule.showDetail(${d.id})">
          <div class="list-item-title">${d.brand} ${d.model}</div>
          <div class="list-item-sub">${d.category} — ${d.os || ''}</div>
        </div>
      `).join('');
    }
    if (results.interventions.length) {
      html += '<h3 style="margin:16px 0 8px">🔧 Interventions</h3>';
      html += results.interventions.map(i => `
        <div class="list-item" onclick="app.goTo('intervention-detail'); interventionsModule.showDetail(${i.id})">
          <div class="list-item-title">${i.problem?.substring(0, 50) || 'Intervention'}...</div>
          <div class="list-item-sub">${new Date(i.date).toLocaleDateString('fr-FR')}</div>
        </div>
      `).join('');
    }
    if (results.docs.length) {
      html += '<h3 style="margin:16px 0 8px">📚 Documentation</h3>';
      html += results.docs.map(d => `
        <div class="doc-item">
          <a href="${d.url}" target="_blank" rel="noopener">${d.title}</a>
          <div class="doc-source">Source: ${d.source}</div>
        </div>
      `).join('');
    }

    if (!html) html = '<div class="empty-state">Aucun résultat</div>';
    document.getElementById('searchResults').innerHTML = html;
    app.goTo('search-results');
  }
};

document.addEventListener('DOMContentLoaded', () => app.init());
