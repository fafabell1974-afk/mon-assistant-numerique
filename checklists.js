const checklistsModule = {
  async render() {
    const list = document.getElementById('checklistsList');
    const items = await dbModule.getAll('checklists');
    list.innerHTML = items.length
      ? items.map(c => `
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <h3 style="font-size:1rem">${c.title}</h3>
            <div class="btn-row">
              <button class="btn btn-sm btn-secondary" onclick="checklistsModule.edit(${c.id})">✏️</button>
              <button class="btn btn-sm btn-danger" onclick="checklistsModule.delete(${c.id})">🗑️</button>
            </div>
          </div>
          ${c.items.map((item, idx) => `
            <div class="checklist-item ${item.checked ? 'checked' : ''}">
              <input type="checkbox" ${item.checked ? 'checked' : ''} onchange="checklistsModule.toggle(${c.id}, ${idx})">
              <span>${item.text}</span>
            </div>
          `).join('')}
        </div>
      `).join('')
      : '<div class="empty-state">Aucune checklist</div>';
  },

  async toggle(id, idx) {
    const cl = await dbModule.get('checklists', id);
    if (cl) {
      cl.items[idx].checked = !cl.items[idx].checked;
      await dbModule.put('checklists', cl);
      this.render();
    }
  },

  async create() {
    const title = prompt('Nom de la checklist:');
    if (!title) return;
    await dbModule.put('checklists', {
      title, items: [{ text: 'Nouvel élément', checked: false }],
      createdAt: Date.now()
    });
    app.toast('Checklist créée');
    this.render();
  },

  async edit(id) {
    const cl = await dbModule.get('checklists', id);
    if (!cl) return;
    const newTitle = prompt('Modifier le titre:', cl.title);
    if (newTitle === null) return;
    cl.title = newTitle;

    // Simple editor via prompt for each item
    let editing = true;
    while (editing) {
      const itemsStr = cl.items.map((it, i) => `${i + 1}. ${it.text}`).join('\n');
      const newItem = prompt(`Checklist: ${cl.title}\n\n${itemsStr}\n\nAjouter un élément (laisser vide pour terminer):`);
      if (newItem === null) { editing = false; continue; }
      if (newItem.trim()) {
        cl.items.push({ text: newItem.trim(), checked: false });
      } else {
        editing = false;
      }
    }

    // Option to remove
    const toRemove = prompt('Numéro de l'élément à supprimer (laisser vide pour aucun):');
    if (toRemove && !isNaN(toRemove)) {
      const idx = parseInt(toRemove) - 1;
      if (idx >= 0 && idx < cl.items.length) cl.items.splice(idx, 1);
    }

    await dbModule.put('checklists', cl);
    app.toast('Checklist modifiée');
    this.render();
  },

  async delete(id) {
    if (!confirm('Supprimer cette checklist ?')) return;
    await dbModule.delete('checklists', id);
    app.toast('Checklist supprimée');
    this.render();
  }
};
