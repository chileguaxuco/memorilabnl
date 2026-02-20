// ═══════════════════════════════════════════════════════════
// MemoriLABNL — App Principal v2
// Pestañas: Explorar / Proyectos / Palabras clave
// + Flickr API + Búsqueda global
// ═══════════════════════════════════════════════════════════

// Auth check
if (!checkAuth()) throw new Error('Not authenticated');

const $ = id => document.getElementById(id);
const content = $('content');
const PER_PAGE = 50;

// ── State ──
let currentView = 'home';       // home | fondo | seccion | serie | detail | search | tag-results | proyecto-results
let currentTab = 'explorar';    // explorar | proyectos | palabras
let currentFondo = null;
let currentSeccion = null;
let currentSerie = null;
let currentPage = 1;
let filteredRecords = [];
let searchQuery = '';
let currentRecord = null;
let previousView = null;
let selectedYear = null;
let selectedTag = null;
let selectedProyecto = null;

// ── Flickr ──
const FLICKR_KEY = '9e5769711a36148a393a80310afe4cc4';
const FLICKR_USER_URL = 'https://www.flickr.com/photos/labnl/';
let flickrUserId = null;
let flickrAlbums = null; // cache

// ═══ window.DATA LOADING ═══

let dataLoadError = false;

async function initializeData() {
  // Normalizar: const DATA de data.js no vive en window
  if (typeof DATA !== 'undefined' && !window.DATA) window.DATA = DATA;

  console.log('📦 Iniciando app con datos estáticos...');

  // Load static data immediately - use window.DATA from data.js
  if (window.DATA && window.DATA.labnl && window.DATA.apf) {
    console.log(`✓ ${window.DATA.stats.total} registros cargados`);

    // Update UI and start app
    updateProjectCount();
    navigate('home');

    // Try to update from Google Sheets in background (optional)
    tryLoadFromSheets();
  } else {
    content.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;">
        <div style="font-size:48px;margin-bottom:16px;">❌</div>
        <div style="font-size:18px;font-weight:500;color:#f44336;">Error al cargar datos</div>
        <div style="color:#666;margin-bottom:16px;">No se encontraron datos</div>
        <button onclick="location.reload()" style="padding:12px 24px;background:#2196F3;color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:500;">
          Reintentar
        </button>
      </div>
    `;
  }
}

async function tryLoadFromSheets() {
  try {
    console.log('🔄 Intentando actualizar desde Google Sheets...');

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 5000)
    );

    const sheetsData = await Promise.race([loadFromSheets(), timeoutPromise]);

    if (sheetsData && sheetsData.labnl && sheetsData.apf) {
      window.DATA = sheetsData;
      console.log(`✓ Datos actualizados: ${window.DATA.stats.total} registros desde Google Sheets`);
      updateProjectCount();
      showToast('✓ Datos actualizados desde Google Sheets');
    }
  } catch (error) {
    console.log('ℹ️ Google Sheets no disponible, usando datos estáticos');
  }
}

function updateProjectCount() {
  if (!window.DATA) return;
  const allRecords = [...window.DATA.labnl, ...window.DATA.apf];
  const proySet = new Set();
  allRecords.forEach(r => { if(r.p) proySet.add(r.p); });
  const badge = document.getElementById('proyectosCount');
  if (badge && proySet.size > 0) {
    badge.textContent = proySet.size;
  }
}

// ═══ UTILITIES ═══

function formatDate(d) {
  if (!d) return '';
  const parts = d.split('-');
  if (parts.length !== 3) return d;
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${parseInt(parts[2])} ${months[parseInt(parts[1])-1]} ${parts[0]}`;
}

function formatIcons(formatos) {
  const icons = { 'Fotografía':'📷', 'Video':'🎬', 'Audio':'🎙', 'Transmisión':'📡',
                  'Grabación virtual':'💻', 'Documento digital':'📄',
                  'Documentación física':'📋', 'Digitalización':'🖨', 'Publicación digital':'🌐' };
  return formatos.map(f => icons[f] || '📎').join(' ');
}

function escapeHtml(s) {
  if (!s) return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function escapeAttr(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function showToast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => showToast('Ruta copiada'));
}

function getAllRecords(fondo) {
  if (!window.DATA) return [];
  if (fondo === 'LABNL') return window.DATA.labnl || [];
  if (fondo === 'APF') return window.DATA.apf || [];
  return [...(window.DATA.labnl || []), ...(window.DATA.apf || [])];
}

function goBack() {
  if (previousView === 'search') {
    currentView = 'search';
    render();
  } else if (previousView === 'tag-results') {
    currentView = 'home';
    currentTab = 'palabras';
    render();
  } else if (previousView === 'proyecto-results') {
    currentView = 'home';
    currentTab = 'proyectos';
    render();
  } else if (currentSerie) {
    currentView = 'serie';
    render();
  } else if (currentSeccion) {
    currentView = 'seccion';
    render();
  } else {
    currentView = 'home';
    render();
  }
  window.scrollTo(0, 0);
}

// ═══ TABS ═══

function switchTab(tab) {
  currentTab = tab;
  currentView = 'home';
  currentPage = 1;
  searchQuery = '';
  $('searchInput').value = '';

  // Update tab UI
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.tab[data-tab="${tab}"]`).classList.add('active');

  render();
  window.scrollTo(0, 0);
}

function showTabs() { $('tabsBar').style.display = ''; }
function hideTabs() { $('tabsBar').style.display = 'none'; }

// ═══ NAVIGATION ═══

function navigate(view, params = {}) {
  currentView = view;
  currentFondo = params.fondo || currentFondo;
  currentSeccion = params.seccion || null;
  currentSerie = params.serie || null;
  currentPage = 1;
  searchQuery = '';
  $('searchInput').value = '';
  render();
  window.scrollTo(0, 0);
}

function render() {
  // Show/hide tabs based on view
  const isSubView = ['fondo','seccion','serie','detail','search','tag-results','proyecto-results'].includes(currentView);
  if (isSubView) { hideTabs(); } else { showTabs(); }

  switch(currentView) {
    case 'home':
      if (currentTab === 'explorar') renderExplorar();
      else if (currentTab === 'proyectos') renderProyectos();
      else if (currentTab === 'palabras') renderPalabrasClave();
      break;
    case 'fondo': renderFondo(); break;
    case 'seccion': renderSeccion(); break;
    case 'serie': renderSerie(); break;
    case 'detail': renderDetailView(currentRecord, currentFondo); break;
    case 'search': renderSearch(); break;
    case 'tag-results': renderTagResults(); break;
    case 'proyecto-results': renderProyectoResults(); break;
  }
}

// ═══ TAB 1: EXPLORAR ═══

function renderExplorar() {
  // Safety check
  if (!window.DATA || !window.DATA.labnl) {
    content.innerHTML = '<div style="padding:40px;text-align:center;color:#999;">Cargando datos...</div>';
    return;
  }

  const recentLab = window.DATA.labnl.slice(-8).reverse();

  // Secciones LABNL
  const secCounts = {};
  window.DATA.labnl.forEach(r => { if(r.sc) secCounts[r.sc] = (secCounts[r.sc]||0)+1; });
  const secciones = Object.entries(secCounts).sort((a,b) => b[1]-a[1]).map(([name]) => name);

  filteredRecords = recentLab;

  content.innerHTML = `
    <div class="section-label">Fondos</div>
    <div class="card-grid" style="margin-bottom:40px">
      <div class="card" onclick="navigate('fondo',{fondo:'LABNL'})">
        <div class="card-title">LABNL Proyecto</div>
        <div class="card-subtitle">Laboratorio ciudadano</div>
      </div>
      <div class="card" onclick="navigate('fondo',{fondo:'APF'})">
        <div class="card-title">Antiguo Palacio Federal</div>
        <div class="card-subtitle">Rehabilitación del edificio</div>
      </div>
    </div>

    <div class="section-label">Secciones LABNL</div>
    <div class="card-grid" style="margin-bottom:40px">
      ${secciones.map(s => `
        <div class="card" data-action="seccion" data-fondo="LABNL" data-name="${escapeAttr(s)}">
          <div class="card-title">${escapeHtml(s)}</div>
        </div>
      `).join('')}
    </div>

    <div class="section-label">Registros recientes</div>
    ${recentLab.length > 0 ? `
      <div class="record-list">
        ${recentLab.map((r,i) => renderRecordRow(r, i, 'LABNL')).join('')}
      </div>
    ` : `
      <div style="padding:40px;text-align:center;color:#999;">
        <div style="font-size:32px;margin-bottom:8px;">📅</div>
        <div>No hay registros recientes con fecha</div>
      </div>
    `}

  `;
}

// ═══ TAB 2: PROYECTOS POR AÑO ═══

function renderProyectos() {
  // Get all years from both fondos
  const allRecords = [...window.DATA.labnl, ...window.DATA.apf];
  const yearSet = new Set();
  allRecords.forEach(r => { if(r.f) yearSet.add(r.f.slice(0,4)); });
  const years = [...yearSet].sort().reverse();

  // Default to most recent year
  if (!selectedYear || !yearSet.has(selectedYear)) {
    selectedYear = years[0];
  }

  // Get projects for selected year
  const yearRecords = allRecords.filter(r => r.f && r.f.startsWith(selectedYear));
  const proyMap = {};
  yearRecords.forEach(r => {
    if (!r.p) return;
    if (!proyMap[r.p]) { proyMap[r.p] = { name: r.p, seccion: r.sc, count: 0 }; }
    proyMap[r.p].count++;
  });
  const proyectos = Object.values(proyMap).sort((a,b) => a.name.localeCompare(b.name, 'es'));

  content.innerHTML = `
    <div class="section-label">Selecciona un año</div>
    <div class="year-bar">
      ${years.map(y => `
        <button class="year-btn${y===selectedYear?' active':''}" onclick="selectYear('${y}')">${y}</button>
      `).join('')}
    </div>

    <div class="section-label">Proyectos en ${selectedYear}</div>
    ${proyectos.length > 0 ? `
    <div class="card-grid">
      ${proyectos.map(p => `
        <div class="proyecto-card" data-action="proyecto" data-name="${escapeAttr(p.name)}" data-year="${selectedYear}">
          <div class="proyecto-name">${escapeHtml(p.name)}</div>
          <div class="proyecto-seccion">${escapeHtml(p.seccion)}</div>
        </div>
      `).join('')}
    </div>
    ` : `
    <div class="empty-state">
      <div class="empty-state-icon">📂</div>
      <div class="empty-state-text">No hay proyectos registrados en ${selectedYear}</div>
    </div>
    `}
  `;
}

function selectYear(y) {
  selectedYear = y;
  renderProyectos();
  // Scroll only the content area, not the tabs
}

// ═══ TAB 3: PALABRAS CLAVE ═══

function renderPalabrasClave() {
  // Count all keywords
  const allRecords = [...window.DATA.labnl, ...window.DATA.apf];
  const kwCount = {};
  allRecords.forEach(r => {
    if (!r.pc) return;
    r.pc.forEach(kw => {
      if (kw) kwCount[kw] = (kwCount[kw]||0) + 1;
    });
  });

  // Sort by frequency, take top 80
  const sorted = Object.entries(kwCount).sort((a,b) => b[1]-a[1]);
  const top = sorted.slice(0, 80);

  if (top.length === 0) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔑</div>
        <div class="empty-state-text">No hay palabras clave en los registros</div>
      </div>
    `;
    return;
  }

  // Calculate size buckets (1-5)
  const maxCount = top[0][1];
  const minCount = top[top.length - 1][1];
  function getSize(count) {
    if (maxCount === minCount) return 3;
    const ratio = (count - minCount) / (maxCount - minCount);
    if (ratio > 0.8) return 5;
    if (ratio > 0.6) return 4;
    if (ratio > 0.35) return 3;
    if (ratio > 0.15) return 2;
    return 1;
  }

  // Shuffle for visual variety (but keep frequency-based sizing)
  const shuffled = [...top].sort(() => Math.random() - 0.5);

  content.innerHTML = `
    <div class="section-label">Explora por palabras clave</div>
    <div class="tag-cloud">
      ${shuffled.map(([kw, count]) => `
        <span class="cloud-tag size-${getSize(count)}" data-action="tag" data-tag="${escapeAttr(kw)}"
              title="${count} registros">${escapeHtml(kw)}</span>
      `).join('')}
    </div>
  `;
}

// ═══ TAG RESULTS ═══

function renderTagResults() {
  const allRecords = [...window.DATA.labnl.map(r=>({...r,_fondo:'LABNL'})), ...window.DATA.apf.map(r=>({...r,_fondo:'APF'}))];
  const results = allRecords.filter(r => r.pc && r.pc.includes(selectedTag))
    .sort((a,b) => (b.f||'').localeCompare(a.f||''));

  filteredRecords = results;
  const totalPages = Math.ceil(results.length / PER_PAGE);
  const pageRecords = results.slice((currentPage-1)*PER_PAGE, currentPage*PER_PAGE);

  content.innerHTML = `
    <div class="breadcrumb">
      <a onclick="currentView='home';currentTab='palabras';render()">Palabras clave</a>
      <span class="sep">/</span>
      <span class="current">${escapeHtml(selectedTag)}</span>
    </div>

    <div class="section-label" style="margin-top:16px">${results.length} registros con "${escapeHtml(selectedTag)}"</div>

    <div class="record-list">
      ${pageRecords.map((r,i) => `
        <div class="record-row" data-action="detail-search" data-idx="${(currentPage-1)*PER_PAGE+i}">
          <div class="record-date">${formatDate(r.f)}</div>
          <div>
            <div class="record-title">${escapeHtml(r.i || r.p || 'Sin título')}</div>
            <div class="record-desc">${escapeHtml(r.sc)} · ${escapeHtml(r.sr)}</div>
          </div>
          <div class="record-tags">
            <span class="tag tag-accent">${r._fondo}</span>
            ${r.fm.slice(0,1).map(f => `<span class="tag">${formatIcons([f])}</span>`).join('')}
          </div>
        </div>
      `).join('')}
    </div>

    ${results.length === 0 ? `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <div class="empty-state-text">No se encontraron registros con "${escapeHtml(selectedTag)}"</div>
      </div>
    ` : ''}

    ${totalPages > 1 ? renderPagination(totalPages) : ''}
  `;
}

// ═══ PROYECTO RESULTS ═══

function renderProyectoResults() {
  const allRecords = [...window.DATA.labnl.map(r=>({...r,_fondo:'LABNL'})), ...window.DATA.apf.map(r=>({...r,_fondo:'APF'}))];
  const results = allRecords.filter(r =>
    r.p === selectedProyecto && r.f && r.f.startsWith(selectedYear)
  ).sort((a,b) => (b.f||'').localeCompare(a.f||''));

  filteredRecords = results;
  const totalPages = Math.ceil(results.length / PER_PAGE);
  const pageRecords = results.slice((currentPage-1)*PER_PAGE, currentPage*PER_PAGE);

  content.innerHTML = `
    <div class="breadcrumb">
      <a onclick="currentView='home';currentTab='proyectos';render()">Proyectos</a>
      <span class="sep">/</span>
      <a onclick="currentView='home';currentTab='proyectos';render()">${selectedYear}</a>
      <span class="sep">/</span>
      <span class="current">${escapeHtml(selectedProyecto)}</span>
    </div>

    <div class="section-label" style="margin-top:16px">${results.length} registros</div>

    <div class="record-list">
      ${pageRecords.map((r,i) => `
        <div class="record-row" data-action="detail-search" data-idx="${(currentPage-1)*PER_PAGE+i}">
          <div class="record-date">${formatDate(r.f)}</div>
          <div>
            <div class="record-title">${escapeHtml(r.i || r.p || 'Sin título')}</div>
            <div class="record-desc">${escapeHtml(r.sc)} · ${escapeHtml(r.sr)}</div>
          </div>
          <div class="record-tags">
            ${r.fm.slice(0,2).map(f => `<span class="tag">${formatIcons([f])} ${f}</span>`).join('')}
          </div>
        </div>
      `).join('')}
    </div>

    ${results.length === 0 ? `
      <div class="empty-state">
        <div class="empty-state-icon">📂</div>
        <div class="empty-state-text">No hay registros para este proyecto en ${selectedYear}</div>
      </div>
    ` : ''}

    ${totalPages > 1 ? renderPagination(totalPages) : ''}
  `;
}

// ═══ FONDO ═══

function renderFondo() {
  const records = getAllRecords(currentFondo);
  const fondoName = currentFondo === 'LABNL' ? 'LABNL Proyecto' : 'Antiguo Palacio Federal';

  const secCounts = {};
  records.forEach(r => { if(r.sc) secCounts[r.sc] = (secCounts[r.sc]||0)+1; });
  const secciones = Object.entries(secCounts).sort((a,b) => b[1]-a[1]).map(([name]) => name);

  content.innerHTML = `
    <div class="breadcrumb">
      <a onclick="navigate('home')">MemoriLABNL</a>
      <span class="sep">/</span>
      <span class="current">${fondoName}</span>
    </div>

    <div class="section-label">Secciones</div>
    <div class="card-grid">
      ${secciones.map(s => `
        <div class="card" data-action="seccion" data-fondo="${currentFondo}" data-name="${escapeAttr(s)}">
          <div class="card-title">${escapeHtml(s)}</div>
        </div>
      `).join('')}
    </div>
  `;
}

// ═══ SECCION ═══

function renderSeccion() {
  const records = getAllRecords(currentFondo).filter(r => r.sc === currentSeccion);
  const fondoName = currentFondo === 'LABNL' ? 'LABNL Proyecto' : 'Antiguo Palacio Federal';

  const serieCounts = {};
  records.forEach(r => { if(r.sr) serieCounts[r.sr] = (serieCounts[r.sr]||0)+1; });
  const series = Object.entries(serieCounts).sort((a,b) => b[1]-a[1]).map(([name]) => name);

  content.innerHTML = `
    <div class="breadcrumb">
      <a onclick="navigate('home')">MemoriLABNL</a>
      <span class="sep">/</span>
      <a onclick="navigate('fondo',{fondo:'${currentFondo}'})">${fondoName}</a>
      <span class="sep">/</span>
      <span class="current">${escapeHtml(currentSeccion)}</span>
    </div>

    <div class="section-label">Series</div>
    <div class="card-grid">
      ${series.map(s => `
        <div class="card" data-action="serie" data-name="${escapeAttr(s)}">
          <div class="card-title">${escapeHtml(s)}</div>
        </div>
      `).join('')}
    </div>
  `;
}

// ═══ SERIE ═══

function renderSerie() {
  const allRecords = getAllRecords(currentFondo)
    .filter(r => r.sc === currentSeccion && r.sr === currentSerie)
    .sort((a,b) => (b.f||'').localeCompare(a.f||''));

  filteredRecords = applyFilters(allRecords);
  const fondoName = currentFondo === 'LABNL' ? 'LABNL Proyecto' : 'Antiguo Palacio Federal';
  const totalPages = Math.ceil(filteredRecords.length / PER_PAGE);
  const pageRecords = filteredRecords.slice((currentPage-1)*PER_PAGE, currentPage*PER_PAGE);

  const formatos = new Set();
  allRecords.forEach(r => { r.fm.forEach(f => formatos.add(f)); });

  content.innerHTML = `
    <div class="breadcrumb">
      <a onclick="navigate('home')">MemoriLABNL</a>
      <span class="sep">/</span>
      <a onclick="navigate('fondo',{fondo:'${currentFondo}'})">${fondoName}</a>
      <span class="sep">/</span>
      <a onclick="navigate('seccion',{fondo:'${currentFondo}',seccion:decodeURIComponent('${encodeURIComponent(currentSeccion)}')})">${escapeHtml(currentSeccion)}</a>
      <span class="sep">/</span>
      <span class="current">${escapeHtml(currentSerie)}</span>
    </div>

    <div class="section-label">${filteredRecords.length} registros</div>

    <div class="filters" id="filtersBar">
      <select class="filter-select" id="filterFormato" onchange="currentPage=1;render()">
        <option value="">Formato</option>
        ${[...formatos].sort().map(f => `<option value="${f}">${f}</option>`).join('')}
      </select>
      <select class="filter-select" id="filterYear" onchange="currentPage=1;render()">
        <option value="">Año</option>
        ${getYearRange(allRecords).map(y => `<option value="${y}">${y}</option>`).join('')}
      </select>
      <button class="filter-clear" onclick="clearFilters()">Limpiar filtros</button>
    </div>

    <div class="record-list">
      ${pageRecords.map((r,i) => renderRecordRow(r, (currentPage-1)*PER_PAGE + i, currentFondo)).join('')}
    </div>

    ${totalPages > 1 ? renderPagination(totalPages) : ''}
  `;
}

function applyFilters(records) {
  let result = records;
  const fmt = document.getElementById('filterFormato')?.value;
  const year = document.getElementById('filterYear')?.value;
  if (fmt) result = result.filter(r => r.fm.includes(fmt));
  if (year) result = result.filter(r => r.f && r.f.startsWith(year));
  return result;
}

function getYearRange(records) {
  const years = new Set();
  records.forEach(r => { if(r.f) years.add(r.f.slice(0,4)); });
  return [...years].sort().reverse();
}

function clearFilters() {
  document.querySelectorAll('.filter-select').forEach(s => s.value = '');
  currentPage = 1;
  render();
}

// ═══ RECORD ROW ═══

function renderRecordRow(r, absIdx, fondo) {
  return `
    <div class="record-row" data-action="detail" data-idx="${absIdx}" data-fondo="${fondo}">
      <div class="record-date">${formatDate(r.f)}</div>
      <div>
        <div class="record-title">${escapeHtml(r.i || r.p || 'Sin título')}</div>
        <div class="record-desc">${escapeHtml((r.a||'').substring(0, 100))}</div>
      </div>
      <div class="record-tags">
        ${r.fm.slice(0,2).map(f => `<span class="tag">${formatIcons([f])} ${f}</span>`).join('')}
      </div>
    </div>
  `;
}

// ═══ DETAIL ═══

function showDetail(absIdx, fondo) {
  const r = filteredRecords[absIdx];
  if (!r) return;
  previousView = currentView;
  currentRecord = r;
  currentFondo = fondo || currentFondo;
  currentView = 'detail';
  renderDetailView(r, currentFondo);
  window.scrollTo(0, 0);
}

function renderDetailView(r, fondo) {
  if (!r) return;
  const fondoName = fondo === 'LABNL' ? 'LABNL Proyecto' : fondo === 'APF' ? 'Antiguo Palacio Federal' : fondo;

  content.innerHTML = `
    <button class="back-btn" onclick="goBack()">← Volver</button>

    <div class="detail-header">
      <div class="detail-title">${escapeHtml(r.i || r.p || 'Sin título')}</div>
      <div class="detail-date">${formatDate(r.f)} · ${escapeHtml(r.sc)} · ${escapeHtml(r.sr)}</div>
      ${r.p ? `<div style="margin-top:4px;font-size:0.85rem;color:var(--text-secondary)">Proyecto: ${escapeHtml(r.p)}</div>` : ''}
    </div>

    ${r.a ? `
    <div class="detail-section">
      <div class="detail-section-title">Asunto</div>
      <div class="detail-text">${escapeHtml(r.a)}</div>
    </div>` : ''}

    <div class="detail-section">
      <div class="detail-section-title">Metadatos</div>
      <div class="detail-meta">
        ${r.e ? `<div class="meta-item"><div><div class="meta-label">Espacio</div><div class="meta-value">${escapeHtml(r.e)}${r.n ? ' · Nivel '+escapeHtml(r.n) : ''}</div></div></div>` : ''}
        ${r.fm.length ? `<div class="meta-item"><div><div class="meta-label">Formato</div><div class="meta-value">${r.fm.map(escapeHtml).join(', ')}</div></div></div>` : ''}
        ${r.au.length ? `<div class="meta-item"><div><div class="meta-label">Autoría</div><div class="meta-value">${r.au.map(escapeHtml).join(', ')}</div></div></div>` : ''}
        ${r.d ? `<div class="meta-item"><div><div class="meta-label">Dispositivo</div><div class="meta-value">${escapeHtml(r.d)}</div></div></div>` : ''}
        ${r.pc && r.pc.length ? `<div class="meta-item"><div><div class="meta-label">Palabras clave</div><div class="meta-value">${r.pc.map(p => `<span class="tag" style="margin:2px 4px 2px 0;display:inline-block;cursor:pointer" onclick="event.stopPropagation();selectedTag='${escapeAttr(p)}';previousView='detail';currentView='tag-results';currentPage=1;render();window.scrollTo(0,0)">${escapeHtml(p)}</span>`).join('')}</div></div></div>` : ''}
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">Ubicación en disco</div>
      <div class="disk-box">
        ${r.r ? `<div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px">💾 ${escapeHtml(r.r)}</div>` : ''}
        <div class="disk-path">${escapeHtml(r.ru)}</div>
        <div class="disk-btns">
          <button class="btn-sm" onclick="copyToClipboard('${(r.ru||'').replace(/'/g,"\\'")}')">📋 Copiar ruta</button>
          <a class="btn-sm" href="file:///${(r.ru||'').replace(/ /g,'%20')}" target="_blank">📂 Abrir carpeta</a>
        </div>
      </div>
    </div>

    ${r.en ? `
    <div class="detail-section">
      <div class="detail-section-title">Enlaces</div>
      ${r.en.split('\n').filter(l=>l.trim()).map(link => {
        const url = link.trim().match(/https?:\/\/[^\s]+/);
        return url ? `<a class="btn-link" href="${url[0]}" target="_blank">${url[0].includes('drive.google') ? '📁 Google Drive' : url[0].includes('flickr') ? '📸 Flickr' : '🔗 Enlace'} ↗</a><br>` : `<span style="font-size:0.85rem;color:var(--text-secondary)">${escapeHtml(link)}</span><br>`;
      }).join('')}
    </div>` : ''}

    <div class="detail-section" id="flickrSection">
      <div style="color:var(--text-muted);font-size:0.8rem">Cargando fotos de Flickr...</div>
    </div>
  `;

  // Load Flickr photos
  loadFlickrPhotos(r);
}

// ═══ FLICKR API ═══

async function flickrCall(method, params = {}) {
  const url = new URL('https://api.flickr.com/services/rest/');
  url.searchParams.set('method', method);
  url.searchParams.set('api_key', FLICKR_KEY);
  url.searchParams.set('format', 'json');
  url.searchParams.set('nojsoncallback', '1');
  for (const [k,v] of Object.entries(params)) url.searchParams.set(k, v);
  try {
    const res = await fetch(url);
    return await res.json();
  } catch(e) {
    console.warn('Flickr API error:', e);
    return null;
  }
}

async function getFlickrUserId() {
  if (flickrUserId) return flickrUserId;
  const data = await flickrCall('flickr.urls.lookupUser', { url: FLICKR_USER_URL });
  if (data && data.stat === 'ok') {
    flickrUserId = data.user.id;
    return flickrUserId;
  }
  return null;
}

async function getFlickrAlbums() {
  if (flickrAlbums) return flickrAlbums;
  const userId = await getFlickrUserId();
  if (!userId) return [];
  const data = await flickrCall('flickr.photosets.getList', { user_id: userId, per_page: '500' });
  if (data && data.stat === 'ok') {
    flickrAlbums = data.photosets.photoset.map(ps => ({
      id: ps.id,
      title: ps.title._content,
      photos: ps.photos
    }));
    return flickrAlbums;
  }
  return [];
}

async function loadFlickrPhotos(record) {
  const section = $('flickrSection');
  if (!section) return;

  try {
    const userId = await getFlickrUserId();
    if (!userId) {
      section.innerHTML = '';
      return;
    }

    // Search for photos matching this record by text
    const searchText = record.i || record.p || '';
    if (!searchText) {
      section.innerHTML = '';
      return;
    }

    const data = await flickrCall('flickr.photos.search', {
      user_id: userId,
      text: searchText,
      per_page: '12',
      extras: 'url_q,url_m,url_l'
    });

    if (!data || data.stat !== 'ok' || !data.photos.photo.length) {
      section.innerHTML = '';
      return;
    }

    const photos = data.photos.photo;
    section.innerHTML = `
      <div class="detail-section-title">Fotografías en Flickr</div>
      <div class="flickr-grid">
        ${photos.map(p => {
          const thumbUrl = p.url_q || `https://live.staticflickr.com/${p.server}/${p.id}_${p.secret}_q.jpg`;
          const fullUrl = p.url_l || p.url_m || `https://live.staticflickr.com/${p.server}/${p.id}_${p.secret}_b.jpg`;
          const flickrPage = `https://www.flickr.com/photos/${userId}/${p.id}`;
          return `<a href="${flickrPage}" target="_blank" title="${escapeAttr(p.title)}"><img class="flickr-thumb" src="${thumbUrl}" alt="${escapeAttr(p.title)}" loading="lazy"></a>`;
        }).join('')}
      </div>
    `;
  } catch(e) {
    console.warn('Flickr load error:', e);
    section.innerHTML = '';
  }
}

// ═══ SEARCH ═══

function onSearchInput() {
  clearTimeout(onSearchInput._timer);
  onSearchInput._timer = setTimeout(() => {
    const q = $('searchInput').value.trim();
    if (q.length >= 2) {
      searchQuery = q;
      currentView = 'search';
      currentPage = 1;
      render();
    }
  }, 300);
}

function doSearch() {
  const q = $('searchInput').value.trim();
  if (q.length >= 1) {
    searchQuery = q;
    currentView = 'search';
    currentPage = 1;
    render();
  }
}

function renderSearch() {
  const q = searchQuery.toLowerCase();
  const all = [...window.DATA.labnl.map(r=>({...r,_fondo:'LABNL'})), ...window.DATA.apf.map(r=>({...r,_fondo:'APF'}))];

  const results = all.filter(r => {
    return (r.i && r.i.toLowerCase().includes(q)) ||
           (r.p && r.p.toLowerCase().includes(q)) ||
           (r.a && r.a.toLowerCase().includes(q)) ||
           (r.au && r.au.some(a => a.toLowerCase().includes(q))) ||
           (r.pc && r.pc.some(p => p.toLowerCase().includes(q))) ||
           (r.sc && r.sc.toLowerCase().includes(q)) ||
           (r.sr && r.sr.toLowerCase().includes(q)) ||
           (r.e && r.e.toLowerCase().includes(q));
  }).sort((a,b) => (b.f||'').localeCompare(a.f||''));

  filteredRecords = results;
  const totalPages = Math.ceil(results.length / PER_PAGE);
  const pageRecords = results.slice((currentPage-1)*PER_PAGE, currentPage*PER_PAGE);

  content.innerHTML = `
    <div class="breadcrumb">
      <a onclick="navigate('home')">MemoriLABNL</a>
      <span class="sep">/</span>
      <span class="current">Búsqueda: "${escapeHtml(searchQuery)}"</span>
    </div>

    <div class="section-label" style="margin-top:16px">${results.length} resultados para "${escapeHtml(searchQuery)}"</div>

    <div class="record-list">
      ${pageRecords.map((r,i) => `
        <div class="record-row" data-action="detail-search" data-idx="${(currentPage-1)*PER_PAGE+i}">
          <div class="record-date">${formatDate(r.f)}</div>
          <div>
            <div class="record-title">${escapeHtml(r.i || r.p || 'Sin título')}</div>
            <div class="record-desc">${escapeHtml(r.sc)} · ${escapeHtml(r.sr)} ${r.p ? '· '+escapeHtml(r.p) : ''}</div>
          </div>
          <div class="record-tags">
            <span class="tag tag-accent">${r._fondo}</span>
            ${r.fm.slice(0,1).map(f => `<span class="tag">${formatIcons([f])}</span>`).join('')}
          </div>
        </div>
      `).join('')}
    </div>

    ${results.length === 0 ? `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <div class="empty-state-text">No se encontraron resultados para "${escapeHtml(searchQuery)}"</div>
      </div>
    ` : ''}

    ${totalPages > 1 ? renderPagination(totalPages) : ''}
  `;
}

// ═══ PAGINATION ═══

function renderPagination(totalPages) {
  let html = '<div class="pagination">';
  if (currentPage > 1) html += `<button class="page-btn" onclick="goPage(${currentPage-1})">←</button>`;
  const start = Math.max(1, currentPage - 3);
  const end = Math.min(totalPages, currentPage + 3);
  if (start > 1) html += `<button class="page-btn" onclick="goPage(1)">1</button><span style="padding:8px">…</span>`;
  for (let i = start; i <= end; i++) {
    html += `<button class="page-btn${i===currentPage?' active':''}" onclick="goPage(${i})">${i}</button>`;
  }
  if (end < totalPages) html += `<span style="padding:8px">…</span><button class="page-btn" onclick="goPage(${totalPages})">${totalPages}</button>`;
  if (currentPage < totalPages) html += `<button class="page-btn" onclick="goPage(${currentPage+1})">→</button>`;
  html += '</div>';
  return html;
}

function goPage(page) {
  currentPage = page;
  render();
  window.scrollTo(0, 0);
}

// ═══ EVENT DELEGATION ═══

content.addEventListener('click', function(e) {
  const el = e.target.closest('[data-action]');
  if (!el) return;

  const action = el.dataset.action;

  if (action === 'seccion') {
    navigate('seccion', { fondo: el.dataset.fondo, seccion: el.dataset.name });
  } else if (action === 'serie') {
    currentSerie = el.dataset.name;
    currentView = 'serie';
    currentPage = 1;
    render();
    window.scrollTo(0, 0);
  } else if (action === 'detail') {
    showDetail(parseInt(el.dataset.idx), el.dataset.fondo);
  } else if (action === 'detail-search') {
    // Used by search, tag-results, proyecto-results
    const r = filteredRecords[parseInt(el.dataset.idx)];
    if (!r) return;
    previousView = currentView;
    currentRecord = r;
    currentView = 'detail';
    renderDetailView(r, r._fondo || currentFondo || 'LABNL');
    window.scrollTo(0, 0);
  } else if (action === 'tag') {
    selectedTag = el.dataset.tag;
    previousView = 'tag-results';
    currentView = 'tag-results';
    currentPage = 1;
    render();
    window.scrollTo(0, 0);
  } else if (action === 'proyecto') {
    selectedProyecto = el.dataset.name;
    selectedYear = el.dataset.year;
    previousView = 'proyecto-results';
    currentView = 'proyecto-results';
    currentPage = 1;
    render();
    window.scrollTo(0, 0);
  }
});

// ═══ INIT ═══
initializeData().catch(err => {
  console.error('💥 Error fatal:', err);
  content.innerHTML = `
    <div style="padding:40px;text-align:center;">
      <div style="font-size:48px;margin-bottom:16px;">💥</div>
      <div style="font-size:18px;color:#f44336;">Error crítico al inicializar</div>
      <div style="color:#666;margin:16px 0;">${err.message}</div>
      <button onclick="location.reload()" style="padding:12px 24px;background:#2196F3;color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:500;">
        Reintentar
      </button>
    </div>
  `;
});
