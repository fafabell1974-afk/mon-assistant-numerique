const devicesModule = {
  async render() {
    const list = document.getElementById('devicesList');
    const devices = await dbModule.getAll('devices');
    const search = document.getElementById('deviceSearch')?.value?.toLowerCase() || '';

    let filtered = devices;
    if (search) {
      filtered = devices.filter(d =>
        (d.brand + ' ' + d.model + ' ' + d.os + ' ' + d.category).toLowerCase().includes(search)
      );
    }
    filtered.sort((a, b) => b.createdAt - a.createdAt);

    list.innerHTML = filtered.length
      ? filtered.map(d => `
        <div class="list-item" onclick="app.goTo('device-detail'); devicesModule.showDetail(${d.id})">
          <div>
            <div class="list-item-title">${d.brand} ${d.model}</div>
            <div class="list-item-sub">${d.category} ${d.os ? '• ' + d.os : ''}</div>
          </div>
        </div>
      `).join('')
      : '<div class="empty-state">Aucun appareil trouvé</div>';
  },

  search(val) { this.render(); },

  async showDetail(id) {
    app.currentDeviceId = id;
    const d = await dbModule.get('devices', id);
    if (!d) return;

    const client = d.clientId ? await dbModule.get('clients', d.clientId) : null;

    document.getElementById('ddContent').innerHTML = `
      <h2 style="margin-bottom:4px">${d.brand} ${d.model}</h2>
      <div style="margin-bottom:8px">
        <span class="tag tag-blue">${d.category}</span>
        ${d.os ? `<span class="tag tag-green">${d.os}</span>` : ''}
      </div>
      ${d.modelNum ? `<p style="font-size:0.85rem;color:var(--text-secondary)">N° modèle: ${d.modelNum}</p>` : ''}
      ${d.serial ? `<p style="font-size:0.85rem;color:var(--text-secondary)">S/N: ${d.serial}</p>` : ''}
      ${client ? `<p style="font-size:0.85rem;margin-top:8px">👤 <a href="#" onclick="app.goTo('client-detail'); clientsModule.showDetail(${client.id});return false">${client.prenom} ${client.nom}</a></p>` : ''}
      ${d.notes ? `<p style="margin-top:10px;font-size:0.9rem">${d.notes}</p>` : ''}
    `;

    const ints = await dbModule.getByIndex('interventions', 'deviceId', id);
    ints.sort((a, b) => b.date - a.date);
    document.getElementById('ddInterventions').innerHTML = ints.length
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
    app.editingDeviceId = data.id || null;
    document.getElementById('modalDeviceTitle').textContent = data.id ? 'Modifier appareil' : 'Nouvel appareil';
    document.getElementById('deviceCategory').value = data.category || '';
    document.getElementById('deviceBrand').value = data.brand || '';
    document.getElementById('deviceModel').value = data.model || '';
    document.getElementById('deviceModelNum').value = data.modelNum || '';
    document.getElementById('deviceOS').value = data.os || '';
    document.getElementById('deviceSerial').value = data.serial || '';
    document.getElementById('deviceClient').value = data.clientId || (data.clientId === undefined ? '' : data.clientId);
    document.getElementById('deviceNotes').value = data.notes || '';
    document.getElementById('btnDeleteDevice').style.display = data.id ? 'block' : 'none';
  },

  async save() {
    const category = document.getElementById('deviceCategory').value;
    const brand = document.getElementById('deviceBrand').value.trim();
    const model = document.getElementById('deviceModel').value.trim();
    if (!category || !brand || !model) { app.toast('Catégorie, marque et modèle obligatoires'); return; }

    const data = {
      id: app.editingDeviceId || undefined,
      category, brand, model,
      modelNum: document.getElementById('deviceModelNum').value.trim(),
      os: document.getElementById('deviceOS').value.trim(),
      serial: document.getElementById('deviceSerial').value.trim(),
      clientId: document.getElementById('deviceClient').value || null,
      notes: document.getElementById('deviceNotes').value.trim(),
      createdAt: app.editingDeviceId ? (await dbModule.get('devices', app.editingDeviceId))?.createdAt || Date.now() : Date.now()
    };

    await dbModule.put('devices', data);
    app.closeModal('modal-device');
    app.toast(app.editingDeviceId ? 'Appareil modifié' : 'Appareil créé');
    app.editingDeviceId = null;
    app.refreshAll();
  },

  async deleteCurrent() {
    if (!app.editingDeviceId) return;
    if (!confirm('Supprimer cet appareil et ses interventions associées ?')) return;

    const ints = await dbModule.getByIndex('interventions', 'deviceId', app.editingDeviceId);
    for (const i of ints) await dbModule.delete('interventions', i.id);
    await dbModule.delete('devices', app.editingDeviceId);

    app.closeModal('modal-device');
    app.toast('Appareil supprimé');
    app.editingDeviceId = null;
    app.goTo('devices');
    app.refreshAll();
  },

  editCurrent() {
    if (!app.currentDeviceId) return;
    dbModule.get('devices', app.currentDeviceId).then(d => {
      app.openModal('modal-device', d);
    });
  }
};
