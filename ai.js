const aiModule = {
  async init() {
    const clients = await dbModule.getAll('clients');
    const opts = clients.map(c => `<option value="${c.id}">${c.prenom} ${c.nom}</option>`).join('');
    const sel = document.getElementById('aiClientSelect');
    if (sel) sel.innerHTML = '<option value="">-- Client --</option>' + opts;
  },

  async loadClientDevices(clientId) {
    const sel = document.getElementById('aiDeviceSelect');
    if (!clientId) { sel.innerHTML = '<option value="">-- Appareil --</option>'; return; }
    const devices = await dbModule.getByIndex('devices', 'clientId', parseInt(clientId));
    const opts = devices.map(d => `<option value="${d.id}">${d.brand} ${d.model}</option>`).join('');
    sel.innerHTML = '<option value="">-- Appareil --</option>' + opts;
  },

  async ask() {
    const prompt = document.getElementById('aiPrompt').value.trim();
    if (!prompt) { app.toast('Veuillez décrire le problème'); return; }
    const deviceId = document.getElementById('aiDeviceSelect').value;
    const clientId = document.getElementById('aiClientSelect').value;
    const device = deviceId ? await dbModule.get('devices', parseInt(deviceId)) : null;
    const client = clientId ? await dbModule.get('clients', parseInt(clientId)) : null;

    document.getElementById('aiResponse').innerHTML = '<div class="empty-state">⏳ Analyse en cours...</div>';
    const response = await this.sendPrompt(prompt, device, client);
    document.getElementById('aiResponse').innerHTML = `<div class="ai-response">${response}</div>`;
  },

  async sendPrompt(userPrompt, device, client) {
    const provider = await dbModule.getSetting('aiProvider', '');
    const apiKey = await dbModule.getSetting('aiApiKey', '');
    const model = await dbModule.getSetting('aiModel', '');

    if (!provider || !apiKey) {
      return '<p style="color:var(--danger)"><strong>Configuration IA manquante</strong></p><p>Rendez-vous dans Paramètres → IA pour configurer votre clé API.</p>';
    }
    if (!navigator.onLine) {
      return '<p style="color:var(--danger)"><strong>Hors ligne</strong></p><p>L'IA nécessite une connexion Internet.</p>';
    }

    let systemPrompt = "Tu es un assistant technique expert en support informatique à domicile pour seniors. Tu réponds en français de manière claire, structurée et concise avec des étapes numérotées. Tu ne dois pas inventer de procédures complexes. Si tu n'es pas sûr, dis-le clairement en indiquant 'Information non vérifiée — rechercher dans la documentation officielle.'";
    let context = "";
    if (device) context += `Appareil: ${device.brand} ${device.model} (${device.os || 'OS inconnu'}). `;
    if (client) context += `Client: ${client.prenom} ${client.nom}. `;

    try {
      if (provider === 'openai') return await this.callOpenAI(apiKey, model || 'gpt-4o-mini', systemPrompt, context + userPrompt);
      if (provider === 'gemini') return await this.callGemini(apiKey, model || 'gemini-1.5-flash', systemPrompt, context + userPrompt);
      if (provider === 'mistral') return await this.callMistral(apiKey, model || 'mistral-small-latest', systemPrompt, context + userPrompt);
      return '<p style="color:var(--danger)">Fournisseur non supporté</p>';
    } catch (e) {
      return `<p style="color:var(--danger)"><strong>Erreur API</strong></p><p>${e.message}</p>`;
    }
  },

  async callOpenAI(key, model, system, prompt) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }], temperature: 0.3 })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Erreur OpenAI');
    return this.formatResponse(data.choices[0].message.content);
  },

  async callGemini(key, model, system, prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: system + '

' + prompt }] }] })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Erreur Gemini');
    return this.formatResponse(data.candidates[0].content.parts[0].text);
  },

  async callMistral(key, model, system, prompt) {
    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }], temperature: 0.3 })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Erreur Mistral');
    return this.formatResponse(data.choices[0].message.content);
  },

  formatResponse(text) {
    // Convert markdown-like to HTML
    let html = text
      .replace(/#{3}\s+(.*)/g, '<h4>$1</h4>')
      .replace(/#{2}\s+(.*)/g, '<h3>$1</h3>')
      .replace(/#{1}\s+(.*)/g, '<h2>$1</h2>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Handle numbered lists
    const lines = html.split('
');
    let inList = false;
    let result = [];
    for (const line of lines) {
      const match = line.match(/^\d+\.\s+(.*)/);
      if (match) {
        if (!inList) { result.push('<ol>'); inList = true; }
        result.push(`<li>${match[1]}</li>`);
      } else {
        if (inList) { result.push('</ol>'); inList = false; }
        result.push(line);
      }
    }
    if (inList) result.push('</ol>');
    html = result.join('<br>');
    return html;
  },

  async testConnection() {
    const provider = document.getElementById('aiProvider').value;
    const key = document.getElementById('aiApiKey').value.trim();
    const model = document.getElementById('aiModel').value.trim();
    if (!provider || !key) { app.toast('Renseignez le fournisseur et la clé API'); return; }
    await dbModule.setSetting('aiProvider', provider);
    await dbModule.setSetting('aiApiKey', key);
    await dbModule.setSetting('aiModel', model);
    app.toast('Test en cours...');
    try {
      const res = await this.sendPrompt("Dis simplement 'Connexion OK' en français.", null, null);
      if (res.toLowerCase().includes('ok')) app.toast('✅ Connexion réussie');
      else app.toast('⚠️ Réponse inattendue');
    } catch (e) {
      app.toast('❌ ' + e.message);
    }
  },

  clear() {
    document.getElementById('aiPrompt').value = '';
    document.getElementById('aiResponse').innerHTML = '';
  }
};
