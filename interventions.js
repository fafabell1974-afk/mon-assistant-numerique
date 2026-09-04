const interventionsModule = {
  wizardData: {},
  wizardStep: 1,
  currentFilter: {},
  photoBuffer: [],

  async render() {
    const list = document.getElementById('interventionsList');
    let ints = await dbModule.getAll('interventions');

    // Apply filters
    if (this.currentFilter.client) ints = ints.filter(i => i.clientId == this.currentFilter.client);
    if (this.currentFilter.status) ints = ints.filter(i => i.status === this.currentFilter.status);
    if (this.currentFilter.category) ints = ints.filter(i => i.category === this.currentFilter.category);

    ints.sort((a, b) => b.date - a.date);

    list.innerHTML = ints.length
      ? ints.map(i => `
        <div class="list-item" onclick="app.goTo('intervention-detail'); interventionsModule.showDetail(${i.id})">
          <div>
            <div class="list-item-title">${i.problem?.substring(0, 45) || 'Intervention'}...</div>
            <div class="list-item-sub">${new Date(i.date).toLocaleDateString('fr-FR')} — ${app.statusLabel(i.status)} ${i.timeSpent ? '• ' + i.timeSpent : ''}</div>
          </div>
          <span class="tag tag-${i.status === 'resolu' ? 'green' : i.status === 'en-cours' ? 'orange' : 'red'}">${app.statusLabel(i.status)}</span>
        </div>
      `).join('')
      : '<div class="empty-state">Aucune intervention</div>';
  },

  applyFilters() {
    this.currentFilter = {
      client: document.getElementById('filterClient').value,
      status: document.getElementById('filterStatus').value,
      category: document.getElementById('filterCategory').value
    };
    this.render();
    app.closeModal('modal-filters');
  },

  resetFilters() {
    this.currentFilter = {};
    document.getElementById('filterClient').value = '';
    document.getElementById('filterStatus').value = '';
    document.getElementById('filterCategory').value = '';
    this.render();
    app.closeModal('modal-filters');
  },

  async showDetail(id) {
    app.currentInterventionId = id;
    const i = await dbModule.get('interventions', id);
    if (!i) return;
    const client = i.clientId ? await dbModule.get('clients', i.clientId) : null;
    const device = i.deviceId ? await dbModule.get('devices', i.deviceId) : null;

    document.getElementById('idContent').innerHTML = `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
          <div>
            <h3>${client ? client.prenom + ' ' + client.nom : 'Client inconnu'}</h3>
            <p style="font-size:0.85rem;color:var(--text-secondary)">${new Date(i.date).toLocaleString('fr-FR')}</p>
          </div>
          <span class="tag tag-${i.status === 'resolu' ? 'green' : i.status === 'en-cours' ? 'orange' : 'red'}">${app.statusLabel(i.status)}</span>
        </div>
        ${device ? `<p style="margin-bottom:8px"><strong>Appareil:</strong> ${device.brand} ${device.model}</p>` : ''}
        <p style="margin-bottom:8px"><strong>Problème:</strong><br>${i.problem || '-'}</p>
        <p style="margin-bottom:8px"><strong>Diagnostic:</strong><br>${i.diagnostic || '-'}</p>
        <p style="margin-bottom:8px"><strong>Solution:</strong><br>${i.solution || '-'}</p>
        <p style="margin-bottom:8px"><strong>Résultat:</strong> ${i.result || '-'}</p>
        ${i.material ? `<p style="margin-bottom:8px"><strong>Matériel:</strong> ${i.material}</p>` : ''}
        ${i.timeSpent ? `<p style="margin-bottom:8px"><strong>Temps:</strong> ${i.timeSpent}</p>` : ''}
        ${i.notes ? `<p style="margin-bottom:8px"><strong>Notes:</strong><br>${i.notes}</p>` : ''}
        <div class="btn-row" style="margin-top:12px">
          <button class="btn btn-primary btn-sm" onclick="interventionsModule.edit(${i.id})">✏️ Modifier</button>
          <button class="btn btn-secondary btn-sm" onclick="interventionsModule.duplicate(${i.id})">📋 Dupliquer</button>
          <button class="btn btn-danger btn-sm" onclick="interventionsModule.delete(${i.id})">🗑️ Supprimer</button>
        </div>
      </div>
      ${i.photos?.length ? `
        <div class="card">
          <div class="card-title">📷 Photos</div>
          <div class="photo-gallery">
            ${i.photos.map(p => `<img src="${p}" class="photo-thumb" onclick="window.open('${p}')">`).join('')}
          </div>
        </div>
      ` : ''}
      ${i.checklist?.length ? `
        <div class="card">
          <div class="card-title">✅ Checklist</div>
          ${i.checklist.map(item => `
            <div class="checklist-item ${item.checked ? 'checked' : ''}">
              <input type="checkbox" ${item.checked ? 'checked' : ''} disabled>
              <span>${item.text}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
    `;
  },

  async startWizard(clientId = null, deviceId = null) {
    this.wizardData = { clientId: clientId || null, deviceId: deviceId || null, checklist: [], photos: [] };
    this.wizardStep = 1;
    this.photoBuffer = [];
    app.goTo('intervention-wizard');
    this.renderWizard();
  },

  renderWizard() {
    // Update steps
    for (let s = 1; s <= 7; s++) {
      const el = document.getElementById('ws' + s);
      el.classList.remove('active', 'completed');
      if (s < this.wizardStep) el.classList.add('completed');
      if (s === this.wizardStep) el.classList.add('active');
    }

    const container = document.getElementById('wizardContent');

    switch (this.wizardStep) {
      case 1:
        this.renderStep1(container);
        break;
      case 2:
        this.renderStep2(container);
        break;
      case 3:
        this.renderStep3(container);
        break;
      case 4:
        this.renderStep4(container);
        break;
      case 5:
        this.renderStep5(container);
        break;
      case 6:
        this.renderStep6(container);
        break;
      case 7:
        this.renderStep7(container);
        break;
    }
  },

  async renderStep1(container) {
    const clients = await dbModule.getAll('clients');
    container.innerHTML = `
      <div class="card">
        <div class="card-title">Étape 1 — Sélectionner un client</div>
        <div class="search-box" style="margin-bottom:12px">
          <input type="text" id="wizClientSearch" placeholder="Rechercher..." oninput="interventionsModule.filterWizardClients(this.value)">
        </div>
        <div id="wizClientList" style="max-height:300px;overflow-y:auto">
          ${clients.map(c => `
            <div class="list-item ${this.wizardData.clientId === c.id ? 'selected' : ''}" onclick="interventionsModule.selectClient(${c.id})" style="${this.wizardData.clientId === c.id ? 'border-color:var(--primary);background:#eff6ff' : ''}">
              <div class="list-item-title">${c.prenom} ${c.nom}</div>
              <div class="list-item-sub">${c.phone || ''}</div>
            </div>
          `).join('')}
        </div>
        <button class="btn btn-secondary" style="margin-top:12px" onclick="app.openModal('modal-client'); app.wizardCallback = (id) => interventionsModule.selectClient(id)">➕ Nouveau client</button>
        <div style="margin-top:16px;display:flex;gap:8px">
          <button class="btn btn-secondary" onclick="app.goTo('dashboard')">Annuler</button>
          <button class="btn btn-primary" onclick="interventionsModule.nextStep()" ${!this.wizardData.clientId ? 'disabled style="opacity:0.5"' : ''}>Suivant →</button>
        </div>
      </div>
    `;
  },

  filterWizardClients(val) {
    const items = document.querySelectorAll('#wizClientList .list-item');
    items.forEach(el => {
      el.style.display = el.textContent.toLowerCase().includes(val.toLowerCase()) ? 'flex' : 'none';
    });
  },

  selectClient(id) {
    this.wizardData.clientId = id;
    this.renderWizard();
  },

  async renderStep2(container) {
    const devices = await dbModule.getByIndex('devices', 'clientId', this.wizardData.clientId);
    container.innerHTML = `
      <div class="card">
        <div class="card-title">Étape 2 — Sélectionner un appareil</div>
        <div id="wizDeviceList">
          ${devices.map(d => `
            <div class="list-item ${this.wizardData.deviceId === d.id ? 'selected' : ''}" onclick="interventionsModule.selectDevice(${d.id})" style="${this.wizardData.deviceId === d.id ? 'border-color:var(--primary);background:#eff6ff' : ''}">
              <div class="list-item-title">${d.brand} ${d.model}</div>
              <div class="list-item-sub">${d.category} — ${d.os || ''}</div>
            </div>
          `).join('')}
          ${!devices.length ? '<div class="empty-state">Aucun appareil pour ce client</div>' : ''}
        </div>
        <button class="btn btn-secondary" style="margin-top:12px" onclick="app.openModal('modal-device', {clientId: ${this.wizardData.clientId}}); app.wizardCallback = (id) => interventionsModule.selectDevice(id)">➕ Nouvel appareil</button>
        <div style="margin-top:16px;display:flex;gap:8px">
          <button class="btn btn-secondary" onclick="interventionsModule.prevStep()">← Précédent</button>
          <button class="btn btn-primary" onclick="interventionsModule.nextStep()" ${!this.wizardData.deviceId ? 'disabled style="opacity:0.5"' : ''}>Suivant →</button>
        </div>
      </div>
    `;
  },

  selectDevice(id) {
    this.wizardData.deviceId = id;
    this.renderWizard();
  },

  renderStep3(container) {
    const cats = [
      {k:'ordinateur',l:'💻 Ordinateur'},{k:'smartphone',l:'📱 Smartphone'},{k:'tablette',l:'📱 Tablette'},
      {k:'imprimante',l:'🖨️ Imprimante'},{k:'whatsapp',l:'💬 WhatsApp'},{k:'photos',l:'📷 Photos'},
      {k:'email',l:'📧 E-mail'},{k:'wifi',l:'📶 Wi-Fi'},{k:'internet',l:'🌐 Internet'},
      {k:'sauvegarde',l:'💾 Sauvegarde'},{k:'applications',l:'📲 Applications'},{k:'autre',l:'❓ Autre'}
    ];
    container.innerHTML = `
      <div class="card">
        <div class="card-title">Étape 3 — Catégorie du problème</div>
        <div class="category-grid">
          ${cats.map(c => `
            <button class="category-btn ${this.wizardData.category === c.k ? 'selected' : ''}" onclick="interventionsModule.selectCategory('${c.k}')">${c.l}</button>
          `).join('')}
        </div>
        <div style="margin-top:16px;display:flex;gap:8px">
          <button class="btn btn-secondary" onclick="interventionsModule.prevStep()">← Précédent</button>
          <button class="btn btn-primary" onclick="interventionsModule.nextStep()" ${!this.wizardData.category ? 'disabled style="opacity:0.5"' : ''}>Suivant →</button>
        </div>
      </div>
    `;
  },

  selectCategory(cat) {
    this.wizardData.category = cat;
    this.renderWizard();
  },

  renderStep4(container) {
    container.innerHTML = `
      <div class="card">
        <div class="card-title">Étape 4 — Diagnostic</div>
        <div class="form-group">
          <label>Décrivez le problème rencontré</label>
          <textarea id="wizProblem" placeholder="Le client ne peut plus...">${this.wizardData.problem || ''}</textarea>
        </div>
        <div class="form-group">
          <label>Votre diagnostic initial</label>
          <textarea id="wizDiagnostic" placeholder="Probablement un problème de...">${this.wizardData.diagnostic || ''}</textarea>
        </div>
        <div style="margin-top:16px;display:flex;gap:8px">
          <button class="btn btn-secondary" onclick="interventionsModule.prevStep()">← Précédent</button>
          <button class="btn btn-primary" onclick="interventionsModule.saveStep4()">Suivant →</button>
        </div>
      </div>
    `;
  },

  saveStep4() {
    this.wizardData.problem = document.getElementById('wizProblem').value.trim();
    this.wizardData.diagnostic = document.getElementById('wizDiagnostic').value.trim();
    this.nextStep();
  },

  async renderStep5(container) {
    const device = this.wizardData.deviceId ? await dbModule.get('devices', this.wizardData.deviceId) : null;
    const docs = device ? await dbModule.getByIndex('documentation', 'deviceId', device.id) : [];

    container.innerHTML = `
      <div class="card">
        <div class="card-title">Étape 5 — Recherche et assistance</div>
        <div class="btn-row" style="margin-bottom:12px">
          <button class="btn btn-primary" onclick="interventionsModule.searchDocs()">📚 Documentation</button>
          <button class="btn btn-secondary" onclick="interventionsModule.askAI()">🤖 Demander à l'IA</button>
        </div>
        <div id="wizSearchResults"></div>
        <div style="margin-top:16px;display:flex;gap:8px">
          <button class="btn btn-secondary" onclick="interventionsModule.prevStep()">← Précédent</button>
          <button class="btn btn-primary" onclick="interventionsModule.nextStep()">Suivant →</button>
        </div>
      </div>
    `;

    if (docs.length) {
      document.getElementById('wizSearchResults').innerHTML = `
        <h4 style="margin-bottom:8px">Documentation associée</h4>
        ${docs.map(d => `
          <div class="doc-item">
            <a href="${d.url}" target="_blank" rel="noopener">${d.title}</a>
            <div class="doc-source">${d.source}</div>
          </div>
        `).join('')}
      `;
    }
  },

  async searchDocs() {
    const device = this.wizardData.deviceId ? await dbModule.get('devices', this.wizardData.deviceId) : null;
    const query = device ? `${device.brand} ${device.model} ${this.wizardData.category}` : this.wizardData.category;
    const allDocs = await dbModule.getAll('documentation');
    const results = allDocs.filter(d =>
      (d.title + ' ' + d.category).toLowerCase().includes(query.toLowerCase()) ||
      (device && d.deviceId === device.id)
    );

    document.getElementById('wizSearchResults').innerHTML = results.length
      ? `<h4 style="margin-bottom:8px">Résultats</h4>` + results.map(d => `
        <div class="doc-item">
          <a href="${d.url}" target="_blank" rel="noopener">${d.title}</a>
          <div class="doc-source">${d.source}</div>
        </div>
      `).join('')
      : '<div class="empty-state">Aucune documentation trouvée localement</div>';
  },

  async askAI() {
    const device = this.wizardData.deviceId ? await dbModule.get('devices', this.wizardData.deviceId) : null;
    const client = this.wizardData.clientId ? await dbModule.get('clients', this.wizardData.clientId) : null;

    let prompt = this.wizardData.problem || '';
    if (device) prompt = `[Appareil: ${device.brand} ${device.model}, ${device.os || ''}]\n` + prompt;

    document.getElementById('wizSearchResults').innerHTML = '<div class="empty-state">Chargement...</div>';
    const response = await aiModule.sendPrompt(prompt, device, client);
    document.getElementById('wizSearchResults').innerHTML = `
      <h4 style="margin-bottom:8px">Réponse de l'IA</h4>
      <div class="ai-response">${response}</div>
    `;
  },

  async renderStep6(container) {
    const checklists = await dbModule.getAll('checklists');
    container.innerHTML = `
      <div class="card">
        <div class="card-title">Étape 6 — Intervention</div>
        <div class="form-group">
          <label>Charger une checklist</label>
          <select onchange="interventionsModule.loadChecklist(this.value)">
            <option value="">-- Aucune --</option>
            ${checklists.map(c => `<option value="${c.id}">${c.title}</option>`).join('')}
          </select>
        </div>
        <div id="wizChecklist"></div>
        <button class="btn btn-secondary" style="margin-top:8px" onclick="interventionsModule.addChecklistItem()">➕ Ajouter une étape</button>
        <div style="margin-top:16px;display:flex;gap:8px">
          <button class="btn btn-secondary" onclick="interventionsModule.prevStep()">← Précédent</button>
          <button class="btn btn-primary" onclick="interventionsModule.saveStep6()">Suivant →</button>
        </div>
      </div>
    `;
    this.renderChecklist();
  },

  async loadChecklist(id) {
    if (!id) return;
    const cl = await dbModule.get('checklists', parseInt(id));
    if (cl) {
      this.wizardData.checklist = cl.items.map(i => ({ ...i }));
      this.renderChecklist();
    }
  },

  renderChecklist() {
    const container = document.getElementById('wizChecklist');
    if (!container) return;
    container.innerHTML = (this.wizardData.checklist || []).map((item, idx) => `
      <div class="checklist-item">
        <input type="checkbox" ${item.checked ? 'checked' : ''} onchange="interventionsModule.toggleCheckItem(${idx})">
        <input type="text" value="${item.text}" onchange="interventionsModule.updateCheckItem(${idx}, this.value)" style="flex:1;border:none;background:transparent;color:var(--text);font-size:0.9rem">
        <button onclick="interventionsModule.removeCheckItem(${idx})" style="background:none;border:none;color:var(--danger);font-size:1.2rem;cursor:pointer">&times;</button>
      </div>
    `).join('');
  },

  addChecklistItem() {
    if (!this.wizardData.checklist) this.wizardData.checklist = [];
    this.wizardData.checklist.push({ text: 'Nouvelle étape', checked: false });
    this.renderChecklist();
  },

  toggleCheckItem(idx) {
    this.wizardData.checklist[idx].checked = !this.wizardData.checklist[idx].checked;
    this.renderChecklist();
  },

  updateCheckItem(idx, val) {
    this.wizardData.checklist[idx].text = val;
  },

  removeCheckItem(idx) {
    this.wizardData.checklist.splice(idx, 1);
    this.renderChecklist();
  },

  saveStep6() {
    this.nextStep();
  },

  renderStep7(container) {
    container.innerHTML = `
      <div class="card">
        <div class="card-title">Étape 7 — Compte-rendu</div>
        <div class="form-group">
          <label>Solution appliquée</label>
          <textarea id="wizSolution">${this.wizardData.solution || ''}</textarea>
        </div>
        <div class="form-group">
          <label>Résultat</label>
          <input type="text" id="wizResult" value="${this.wizardData.result || ''}" placeholder="Ex: Résolu, Amélioration partielle...">
        </div>
        <div class="form-group">
          <label>Matériel utilisé</label>
          <input type="text" id="wizMaterial" value="${this.wizardData.material || ''}">
        </div>
        <div class="form-group">
          <label>Temps passé</label>
          <input type="text" id="wizTime" value="${this.wizardData.timeSpent || ''}" placeholder="Ex: 30 min">
        </div>
        <div class="form-group">
          <label>Notes complémentaires</label>
          <textarea id="wizNotes">${this.wizardData.notes || ''}</textarea>
        </div>
        <div class="form-group">
          <label>Statut</label>
          <select id="wizStatus">
            <option value="en-cours" ${this.wizardData.status === 'en-cours' ? 'selected' : ''}>En cours</option>
            <option value="resolu" ${this.wizardData.status === 'resolu' ? 'selected' : ''}>Résolu</option>
            <option value="non-resolu" ${this.wizardData.status === 'non-resolu' ? 'selected' : ''}>Non résolu</option>
            <option value="a-revoir" ${this.wizardData.status === 'a-revoir' ? 'selected' : ''}>À revoir</option>
          </select>
        </div>
        <div class="form-group">
          <label>Photos</label>
          <button class="btn btn-secondary" onclick="document.getElementById('photoInput').click()">📷 Ajouter une photo</button>
          <div id="wizPhotos" class="photo-gallery" style="margin-top:8px">
            ${(this.wizardData.photos || []).map(p => `<img src="${p}" class="photo-thumb">`).join('')}
          </div>
        </div>
        <div style="margin-top:16px;display:flex;gap:8px">
          <button class="btn btn-secondary" onclick="interventionsModule.prevStep()">← Précédent</button>
          <button class="btn btn-primary" onclick="interventionsModule.finish()">💾 Enregistrer l'intervention</button>
        </div>
      </div>
    `;
  },

  handlePhoto(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (!this.wizardData.photos) this.wizardData.photos = [];
      // Compression simple via canvas
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxW = 1200;
        const scale = Math.min(1, maxW / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL('image/jpeg', 0.7);
        this.wizardData.photos.push(compressed);
        const gallery = document.getElementById('wizPhotos');
        if (gallery) {
          gallery.innerHTML = this.wizardData.photos.map(p => `<img src="${p}" class="photo-thumb">`).join('');
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    input.value = '';
  },

  async finish() {
    const solution = document.getElementById('wizSolution').value.trim();
    const result = document.getElementById('wizResult').value.trim();
    const material = document.getElementById('wizMaterial').value.trim();
    const timeSpent = document.getElementById('wizTime').value.trim();
    const notes = document.getElementById('wizNotes').value.trim();
    const status = document.getElementById('wizStatus').value;

    const data = {
      id: this.wizardData.id || undefined,
      clientId: this.wizardData.clientId,
      deviceId: this.wizardData.deviceId,
      category: this.wizardData.category,
      problem: this.wizardData.problem,
      diagnostic: this.wizardData.diagnostic,
      solution, result, material, timeSpent, notes, status,
      date: this.wizardData.id ? (await dbModule.get('interventions', this.wizardData.id))?.date || Date.now() : Date.now(),
      checklist: this.wizardData.checklist || [],
      photos: this.wizardData.photos || []
    };

    await dbModule.put('interventions', data);

    // Update client last intervention
    const client = await dbModule.get('clients', this.wizardData.clientId);
    if (client) {
      client.lastIntervention = Date.now();
      await dbModule.put('clients', client);
    }

    app.toast(this.wizardData.id ? 'Intervention modifiée' : 'Intervention enregistrée');
    app.goTo('interventions');
    app.refreshAll();
  },

  nextStep() {
    if (this.wizardStep < 7) { this.wizardStep++; this.renderWizard(); }
  },

  prevStep() {
    if (this.wizardStep > 1) { this.wizardStep--; this.renderWizard(); }
  },

  async edit(id) {
    const i = await dbModule.get('interventions', id);
    if (!i) return;
    this.wizardData = { ...i };
    this.wizardStep = 1;
    app.goTo('intervention-wizard');
    this.renderWizard();
  },

  async duplicate(id) {
    const i = await dbModule.get('interventions', id);
    if (!i) return;
    delete i.id;
    i.date = Date.now();
    i.status = 'en-cours';
    i.photos = [];
    await dbModule.put('interventions', i);
    app.toast('Intervention dupliquée');
    app.refreshAll();
  },

  async delete(id) {
    if (!confirm('Supprimer cette intervention ?')) return;
    await dbModule.delete('interventions', id);
    app.toast('Intervention supprimée');
    app.goTo('interventions');
    app.refreshAll();
  }
};
