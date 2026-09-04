const clientsModule = {
  async render() {
    const list = document.getElementById('clientsList');
    const clients = await dbModule.getAll('clients');
    const search = document.getElementById('clientSearch')?.value?.toLowerCase() || '';

    let filtered = clients;
    if (search) {
      filtered = clients.filter(c =>
        (c.nom + ' ' + c.prenom + ' ' + c.phone + ' ' + c.email).toLowerCase().includes(search)
      );
    }
    filtered.sort((a, b) => (b.lastIntervention || b.createdAt) - (a.lastIntervention || a.createdAt));

    list.innerHTML = filtered.length
      ? filtered.map(c => `
        <div class="list-item" onclick="app.goTo('client-detail'); clientsModule.showDetail(${c.id})">
          <div>
            <div class="list-item-title">${c.prenom} ${c.nom}</div>
            <div class="list-item-sub">${c.phone || ''} ${c.email ? '• ' + c.email : ''}</div>
          </div>
          <span class="list-item-meta">${c.lastIntervention ? new Date(c.lastIntervention).toLocaleDateString('fr-FR') : 'Nouveau'}</span>
        </div>
      `).join('')
      : '<div class="empty-state">Aucun client trouvé</div>';
  },

  search(val) { this.render(); },

  async showDetail(id) {
    app.currentClientId = id;
    const c = await dbModule.get('clients', id);
    if (!c) return;

    document.getElementById('cdName').textContent = `${c.prenom} ${c.nom}`;
    document.getElementById('cdContact').textContent = [c.phone, c.email].filter(Boolean).join(' • ');
    document.getElementById('cdAddress').textContent = c.address || '';
    document.getElementById('cdNotes').textContent = c.notes || '';

    // Devices
    const devices = await dbModule.getByIndex('devices', 'clientId', id);
    document.getElementById('cdDevices').innerHTML = devices.length
      ? devices.map(d => `
        <div class="list-item" onclick="app.goTo('device-detail'); devicesModule.showDetail(${d.id})">
          <div>
            <div class="list-item-title">${d.brand} ${d.model}</div>
            <div class="list-item-sub">${d.category} — ${d.os || ''}</div>
          </div>
        </div>
      `).join('')
      : '<div class="empty-state">Aucun appareil</div>';

    // History
    const ints = await dbModule.getByIndex('interventions', 'clientId', id);
    ints.sort((a, b) => b.date - a.date);
    document.getElementById('cdHistory').innerHTML = ints.length
      ? ints.map(i => `
        <div class="list-item" onclick="app.goTo('intervention-detail'); interventionsModule.showDetail(${i.id})">
          <div>
            <div class="list-item-title">${i.problem?.substring(0, 45) || 'Intervention'}...</div>
            <div class="list-item-sub">${new Date(i.date).toLocaleDateString('fr-FR')} — ${app.statusLabel(i.status)}</div>
          </div>
        </div>
      `).join('')
      : '<div class="empty-state">Aucune intervention</div>';
  },

  prepareModal(data) {
    app.editingClientId = data.id || null;
    document.getElementById('modalClientTitle').textContent = data.id ? 'Modifier client' : 'Nouveau client';
    document.getElementById('clientNom').value = data.nom || '';
    document.getElementById('clientPrenom').value = data.prenom || '';
    document.getElementById('clientPhone').value = data.phone || '';
    document.getElementById('clientEmail').value = data.email || '';
    document.getElementById('clientAddress').value = data.address || '';
    document.getElementById('clientNotes').value = data.notes || '';
    document.getElementById('btnDeleteClient').style.display = data.id ? 'block' : 'none';
  },

  async save() {
    const nom = document.getElementById('clientNom').value.trim();
    const prenom = document.getElementById('clientPrenom').value.trim();
    if (!nom || !prenom) { app.toast('Nom et prénom obligatoires'); return; }

    const data = {
      id: app.editingClientId || undefined,
      nom, prenom,
      phone: document.getElementById('clientPhone').value.trim(),
      email: document.getElementById('clientEmail').value.trim(),
      address: document.getElementById('clientAddress').value.trim(),
      notes: document.getElementById('clientNotes').value.trim(),
      createdAt: app.editingClientId ? (await dbModule.get('clients', app.editingClientId))?.createdAt || Date.now() : Date.now(),
      lastIntervention: app.editingClientId ? (await dbModule.get('clients', app.editingClientId))?.lastIntervention || null : null
    };

    await dbModule.put('clients', data);
    app.closeModal('modal-client');
    app.toast(app.editingClientId ? 'Client modifié' : 'Client créé');
    app.editingClientId = null;
    app.refreshAll();
  },

  async deleteCurrent() {
    if (!app.editingClientId) return;
    if (!confirm('Supprimer ce client et toutes ses données associées ?')) return;

    // Delete associated devices and interventions
    const devices = await dbModule.getByIndex('devices', 'clientId', app.editingClientId);
    for (const d of devices) {
      const ints = await dbModule.getByIndex('interventions', 'deviceId', d.id);
      for (const i of ints) await dbModule.delete('interventions', i.id);
      await dbModule.delete('devices', d.id);
    }
    const ints = await dbModule.getByIndex('interventions', 'clientId', app.editingClientId);
    for (const i of ints) await dbModule.delete('interventions', i.id);

    await dbModule.delete('clients', app.editingClientId);
    app.closeModal('modal-client');
    app.toast('Client supprimé');
    app.editingClientId = null;
    app.goTo('clients');
    app.refreshAll();
  },

  editCurrent() {
    if (!app.currentClientId) return;
    dbModule.get('clients', app.currentClientId).then(c => {
      app.openModal('modal-client', c);
    });
  }
};
