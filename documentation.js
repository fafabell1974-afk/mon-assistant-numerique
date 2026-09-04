const documentationModule = {
  currentFilter: '',

  async render() {
    const list = document.getElementById('documentationList');
    let docs = await dbModule.getAll('documentation');
    const search = document.getElementById('docSearch')?.value?.toLowerCase() || '';

    if (this.currentFilter) docs = docs.filter(d => d.category === this.currentFilter);
    if (search) docs = docs.filter(d => (d.title + ' ' + d.source).toLowerCase().includes(search));

    list.innerHTML = docs.length
      ? docs.map(d => `
        <div class="doc-item">
          <a href="${d.url}" target="_blank" rel="noopener">${d.title}</a>
          <div class="doc-source">Source: ${d.source} ${d.category ? '• ' + d.category : ''}</div>
        </div>
      `).join('')
      : '<div class="empty-state">Aucune documentation</div>';
  },

  search(val) { this.render(); },
  filter(cat) { this.currentFilter = cat; this.render(); }
};
