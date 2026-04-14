// ═══════════════════════════════════════════════════════════
// MemoriLABNL — Formulario de Registro Web
// ═══════════════════════════════════════════════════════════

// ── Auth checks ──
if (!checkAuth()) throw new Error('Not authenticated');
if (sessionStorage.getItem('memorilabnl_doc') !== 'true') {
  window.location = 'selector.html';
  throw new Error('No doc access');
}

// ── Configuración ──
// Reemplaza con tu URL de Web App después de desplegar Codigo.gs
var WEB_APP_URL = 'https://script.google.com/macros/s/AKfycby9nIiREgEKziKxAgZKifT99Vz8467aV-MDUeHzpO4gl7tbMlCMrKenTzm42ati64EjbA/exec';

var content      = document.getElementById('content');
var loadingMsg   = document.getElementById('loadingMsg');

// ── Estado del formulario ──
var catalogs        = null;   // datos del servidor
var selectedFondo   = null;   // 'LABNL Proyecto' | 'Antiguo Palacio Federal'
var autorTags       = [];
var dispositivoTags = [];
var palabrasTags    = [];
var espacioEntries  = [];   // [{espacio: string, nivel: string}]

// ── Toast ──
function showToast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 2000);
}

// ═══ CARGA DE CATÁLOGOS ═══

function loadCatalogs() {
  fetch(WEB_APP_URL)
    .then(function(res) { return res.json(); })
    .then(function(data) {
      catalogs = data;
      renderForm();
      tryUpdateDataFromSheets();
    })
    .catch(function(err) {
      console.error('Error loading catalogs:', err);
      showFallbackError();
    });
}

function tryUpdateDataFromSheets() {
  if (typeof loadFromSheets !== 'function') return;
  var timeout = new Promise(function(_, reject) {
    setTimeout(function() { reject(new Error('Timeout')); }, 8000);
  });
  Promise.race([loadFromSheets(), timeout])
    .then(function(sheetsData) {
      if (sheetsData && sheetsData.labnl) {
        window.DATA = sheetsData;
        console.log('✓ Datos de búsqueda actualizados desde Google Sheets (' + sheetsData.stats.total + ' registros)');
      }
    })
    .catch(function() {
      // Sin conexión — data.js sigue disponible para búsqueda
    });
}

function showFallbackError() {
  while (content.firstChild) content.removeChild(content.firstChild);

  var wrap = document.createElement('div');
  wrap.style.cssText = 'text-align:center;padding:60px 20px;';

  var icon = document.createElement('div');
  icon.style.cssText = 'font-size:2rem;margin-bottom:12px;';
  icon.textContent = '⚠️';

  var msg = document.createElement('div');
  msg.style.cssText = 'font-size:0.95rem;color:#6b7280;margin-bottom:8px;';
  msg.textContent = 'No se pudo conectar con Google Sheets.';

  var hint = document.createElement('div');
  hint.style.cssText = 'font-size:0.8rem;color:#9ca3af;margin-bottom:20px;';
  hint.textContent = 'Verifica que WEB_APP_URL esté configurado en registrar.js';

  var btn = document.createElement('button');
  btn.className = 'reg-btn-primary';
  btn.textContent = 'Reintentar';
  btn.addEventListener('click', loadCatalogs);

  wrap.appendChild(icon);
  wrap.appendChild(msg);
  wrap.appendChild(hint);
  wrap.appendChild(btn);
  content.appendChild(wrap);
}

// ═══ RENDER DEL FORMULARIO ═══

function renderForm() {
  while (content.firstChild) content.removeChild(content.firstChild);

  var form = document.createElement('div');
  form.className = 'reg-form';
  form.id = 'regForm';

  form.appendChild(makeTitle());
  form.appendChild(makeFondoField());
  form.appendChild(makeField('Fecha', 'reg', makeFechaInput(), true));
  form.appendChild(makeField('Identificación', 'reg', makeTextInput('regId', 'Nombre del evento o actividad'), true));
  form.appendChild(makeField('Sección', 'reg', makeSeccionSelect(), true));
  form.appendChild(makeField('Serie', 'reg', makeSerieSelect(), true));
  form.appendChild(makeField('Asunto', 'reg', makeTextarea('regAsunto', 'Descripción del evento o actividad'), true));
  form.appendChild(makeFormatoField());
  form.appendChild(makeResguardoField());
  form.appendChild(makeField('Nombre del proyecto', 'reg', makeAcInput('regProyecto', catalogs.proyectos || [], 'Escribe para buscar...')));
  form.appendChild(makeEspacioField());
  form.appendChild(makeAutoriaField());
  form.appendChild(makeDispositivoField());
  form.appendChild(makeField('Enlaces', 'reg', makeTextarea('regEnlaces', 'URLs (una por línea)', 2)));
  form.appendChild(makePalabrasField());
  form.appendChild(makeActions());

  content.appendChild(form);

  // Inicializar checkboxes
  initFormatoCheckboxes();
  initResguardoCheckboxes();

}

// ── Constructores de campos ──

function makeTitle() {
  var div = document.createElement('div');
  div.style.marginBottom = '32px';

  var topRow = document.createElement('div');
  topRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap';

  var h1 = document.createElement('h1');
  h1.className = 'reg-title';
  h1.textContent = 'Nuevo Registro';

  var copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'copy-btn';
  copyBtn.textContent = 'Copiar de registro anterior';
  copyBtn.addEventListener('click', showCopyOverlay);

  topRow.appendChild(h1);
  topRow.appendChild(copyBtn);

  var p = document.createElement('p');
  p.className = 'reg-subtitle';
  p.textContent = 'Captura una nueva ficha de clasificación · los campos marcados con * son obligatorios';

  div.appendChild(topRow);
  div.appendChild(p);
  return div;
}

function makeField(labelText, prefix, inputEl, required) {
  var wrap = document.createElement('div');
  wrap.className = 'reg-field';

  var lbl = document.createElement('label');
  lbl.className = 'reg-label';
  lbl.textContent = labelText;
  if (required) {
    var star = document.createElement('span');
    star.className = 'req';
    star.textContent = ' *';
    lbl.appendChild(star);
  }

  wrap.appendChild(lbl);
  wrap.appendChild(inputEl);
  return wrap;
}

function makeFondoField() {
  var wrap = document.createElement('div');
  wrap.className = 'reg-field';

  var lbl = document.createElement('label');
  lbl.className = 'reg-label';
  lbl.textContent = 'Fondo ';
  var star = document.createElement('span');
  star.className = 'req';
  star.textContent = '*';
  lbl.appendChild(star);
  wrap.appendChild(lbl);

  var grid = document.createElement('div');
  grid.className = 'reg-fondo-grid';

  Object.keys(catalogs.taxonomia).forEach(function(fondo) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'reg-fondo-btn';
    btn.textContent = fondo;
    btn.dataset.fondo = fondo;
    btn.addEventListener('click', function() { selectFondo(btn); });
    grid.appendChild(btn);
  });

  wrap.appendChild(grid);
  return wrap;
}

function makeFechaInput() {
  var input = document.createElement('input');
  input.type = 'date';
  input.id = 'regFecha';
  input.className = 'reg-input';
  var hoy = new Date();
  var yy  = hoy.getFullYear();
  var mm  = String(hoy.getMonth() + 1).padStart(2, '0');
  var dd  = String(hoy.getDate()).padStart(2, '0');
  input.value = yy + '-' + mm + '-' + dd;
  return input;
}

function makeTextInput(id, placeholder) {
  var input = document.createElement('input');
  input.type = 'text';
  input.id = id;
  input.className = 'reg-input';
  input.placeholder = placeholder || '';
  return input;
}

function makeTextarea(id, placeholder, rows) {
  var ta = document.createElement('textarea');
  ta.id = id;
  ta.className = 'reg-textarea reg-input';
  ta.placeholder = placeholder || '';
  ta.rows = rows || 3;
  return ta;
}

function makeSeccionSelect() {
  var sel = document.createElement('select');
  sel.id = 'regSeccion';
  sel.className = 'reg-select';
  sel.disabled = true;
  var opt = document.createElement('option');
  opt.value = '';
  opt.textContent = 'Selecciona un fondo primero';
  sel.appendChild(opt);
  sel.addEventListener('change', onSeccionChange);
  return sel;
}

function makeSerieSelect() {
  var sel = document.createElement('select');
  sel.id = 'regSerie';
  sel.className = 'reg-select';
  sel.disabled = true;
  var opt = document.createElement('option');
  opt.value = '';
  opt.textContent = 'Selecciona una sección primero';
  sel.appendChild(opt);
  return sel;
}

function makeResguardoField() {
  var wrap = document.createElement('div');
  wrap.className = 'reg-field';

  var lbl = document.createElement('label');
  lbl.className = 'reg-label';
  lbl.textContent = 'Resguardo ';
  var star = document.createElement('span');
  star.className = 'req';
  star.textContent = '*';
  lbl.appendChild(star);

  var group = document.createElement('div');
  group.className = 'reg-checks';
  group.id = 'regResguardos';

  wrap.appendChild(lbl);
  wrap.appendChild(group);
  return wrap;
}

function initResguardoCheckboxes() {
  var group = document.getElementById('regResguardos');
  if (!group) return;
  (catalogs.resguardos || []).forEach(function(r) {
    var lbl = document.createElement('label');
    lbl.className = 'reg-check-lbl';
    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = r;
    cb.addEventListener('change', function() {
      lbl.classList.toggle('checked', cb.checked);
    });
    lbl.appendChild(cb);
    lbl.appendChild(document.createTextNode(' ' + r));
    group.appendChild(lbl);
  });
}

function makeEspacioField() {
  var wrap = document.createElement('div');
  wrap.className = 'reg-field';

  var lbl = document.createElement('label');
  lbl.className = 'reg-label';
  lbl.textContent = 'Espacio / Nivel';
  wrap.appendChild(lbl);

  var acWrap = document.createElement('div');
  acWrap.className = 'reg-ac';

  var tagsWrap = document.createElement('div');
  tagsWrap.className = 'reg-tags-wrap';
  tagsWrap.id = 'espacioTagsWrap';

  var input = document.createElement('input');
  input.type = 'text';
  input.id = 'espacioInput';
  input.className = 'reg-tag-input';
  input.placeholder = 'Escribe espacio y presiona Enter...';
  input.setAttribute('autocomplete', 'off');
  tagsWrap.appendChild(input);
  tagsWrap.addEventListener('click', function() { input.focus(); });

  var list = document.createElement('div');
  list.className = 'reg-ac-list';
  list.id = 'espacioList';

  function addFromInput(val) {
    var nivel = (catalogs.espaciosMap && catalogs.espaciosMap[val]) || '';
    addEspacioEntry(val, nivel);
    input.value = '';
    list.classList.remove('open');
  }

  input.addEventListener('input', function() {
    showAcSuggestions(input, catalogs.espacios || [], list, function(match) {
      addFromInput(match);
    });
  });
  input.addEventListener('focus', function() {
    if (input.value.trim().length > 0) {
      showAcSuggestions(input, catalogs.espacios || [], list, function(match) {
        addFromInput(match);
      });
    }
  });
  input.addEventListener('blur', function() {
    setTimeout(function() { list.classList.remove('open'); }, 200);
  });
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      var val = input.value.trim();
      if (val) addFromInput(val);
    }
  });

  acWrap.appendChild(tagsWrap);
  acWrap.appendChild(list);
  wrap.appendChild(acWrap);
  return wrap;
}

function makeAcInput(id, items, placeholder) {
  var wrap = document.createElement('div');
  wrap.className = 'reg-ac';

  var input = document.createElement('input');
  input.type = 'text';
  input.id = id;
  input.className = 'reg-input';
  input.placeholder = placeholder || '';
  input.setAttribute('autocomplete', 'off');

  var list = document.createElement('div');
  list.className = 'reg-ac-list';
  list.id = id + 'List';

  input.addEventListener('input', function() {
    showAcSuggestions(input, items, list);
  });
  input.addEventListener('focus', function() {
    if (input.value.trim().length > 0) showAcSuggestions(input, items, list);
  });
  input.addEventListener('blur', function() {
    setTimeout(function() { list.classList.remove('open'); }, 200);
  });

  wrap.appendChild(input);
  wrap.appendChild(list);
  return wrap;
}

function makeFormatoField() {
  var wrap = document.createElement('div');
  wrap.className = 'reg-field';

  var lbl = document.createElement('label');
  lbl.className = 'reg-label';
  lbl.textContent = 'Formato ';
  var star = document.createElement('span');
  star.className = 'req';
  star.textContent = '*';
  lbl.appendChild(star);

  var group = document.createElement('div');
  group.className = 'reg-checks';
  group.id = 'regFormatos';

  wrap.appendChild(lbl);
  wrap.appendChild(group);
  return wrap;
}

function initFormatoCheckboxes() {
  var group = document.getElementById('regFormatos');
  if (!group) return;

  (catalogs.formatos || []).forEach(function(f) {
    var lbl = document.createElement('label');
    lbl.className = 'reg-check-lbl';

    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = f;
    cb.addEventListener('change', function() {
      lbl.classList.toggle('checked', cb.checked);
    });

    lbl.appendChild(cb);
    lbl.appendChild(document.createTextNode(' ' + f));
    group.appendChild(lbl);
  });
}

function makeAutoriaField() {
  var wrap = document.createElement('div');
  wrap.className = 'reg-field';

  var lbl = document.createElement('label');
  lbl.className = 'reg-label';
  lbl.textContent = 'Autoría';
  wrap.appendChild(lbl);

  var acWrap = document.createElement('div');
  acWrap.className = 'reg-ac';

  var tagsWrap = document.createElement('div');
  tagsWrap.className = 'reg-tags-wrap';
  tagsWrap.id = 'autorTagsWrap';

  var input = document.createElement('input');
  input.type = 'text';
  input.id = 'autorInput';
  input.className = 'reg-tag-input';
  input.placeholder = 'Escribe nombre y presiona Enter...';
  input.setAttribute('autocomplete', 'off');
  tagsWrap.appendChild(input);
  tagsWrap.addEventListener('click', function() { input.focus(); });

  var list = document.createElement('div');
  list.className = 'reg-ac-list';
  list.id = 'autorList';

  input.addEventListener('input', function() {
    showAcSuggestions(input, catalogs.autores || [], list, function(match) {
      addAutorTag(match); input.value = ''; list.classList.remove('open');
    });
  });
  input.addEventListener('focus', function() {
    if (input.value.trim().length > 0) showAcSuggestions(input, catalogs.autores || [], list, function(match) {
      addAutorTag(match); input.value = ''; list.classList.remove('open');
    });
  });
  input.addEventListener('blur', function() {
    setTimeout(function() { list.classList.remove('open'); }, 200);
  });
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      var val = input.value.trim();
      if (val) { addAutorTag(val); input.value = ''; list.classList.remove('open'); }
    }
  });

  acWrap.appendChild(tagsWrap);
  acWrap.appendChild(list);
  wrap.appendChild(acWrap);
  return wrap;
}

function makeDispositivoField() {
  var wrap = document.createElement('div');
  wrap.className = 'reg-field';

  var lbl = document.createElement('label');
  lbl.className = 'reg-label';
  lbl.textContent = 'Dispositivo';
  wrap.appendChild(lbl);

  var acWrap = document.createElement('div');
  acWrap.className = 'reg-ac';

  var tagsWrap = document.createElement('div');
  tagsWrap.className = 'reg-tags-wrap';
  tagsWrap.id = 'dispositivoTagsWrap';

  var input = document.createElement('input');
  input.type = 'text';
  input.id = 'dispositivoInput';
  input.className = 'reg-tag-input';
  input.placeholder = 'Escribe dispositivo y presiona Enter...';
  input.setAttribute('autocomplete', 'off');
  tagsWrap.appendChild(input);
  tagsWrap.addEventListener('click', function() { input.focus(); });

  var list = document.createElement('div');
  list.className = 'reg-ac-list';
  list.id = 'dispositivoList';

  input.addEventListener('input', function() {
    showAcSuggestions(input, catalogs.dispositivos || [], list, function(match) {
      addDispositivoTag(match); input.value = ''; list.classList.remove('open');
    });
  });
  input.addEventListener('focus', function() {
    if (input.value.trim().length > 0) showAcSuggestions(input, catalogs.dispositivos || [], list, function(match) {
      addDispositivoTag(match); input.value = ''; list.classList.remove('open');
    });
  });
  input.addEventListener('blur', function() {
    setTimeout(function() { list.classList.remove('open'); }, 200);
  });
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      var val = input.value.trim();
      if (val) { addDispositivoTag(val); input.value = ''; list.classList.remove('open'); }
    }
  });

  acWrap.appendChild(tagsWrap);
  acWrap.appendChild(list);
  wrap.appendChild(acWrap);
  return wrap;
}

function makePalabrasField() {
  var wrap = document.createElement('div');
  wrap.className = 'reg-field';

  var lbl = document.createElement('label');
  lbl.className = 'reg-label';
  lbl.textContent = 'Palabras clave';
  wrap.appendChild(lbl);

  var acWrap = document.createElement('div');
  acWrap.className = 'reg-ac';

  var tagsWrap = document.createElement('div');
  tagsWrap.className = 'reg-tags-wrap';
  tagsWrap.id = 'palabrasTagsWrap';

  var input = document.createElement('input');
  input.type = 'text';
  input.id = 'palabrasInput';
  input.className = 'reg-tag-input';
  input.placeholder = 'Escribe y presiona Enter...';
  input.setAttribute('autocomplete', 'off');
  tagsWrap.appendChild(input);
  tagsWrap.addEventListener('click', function() { input.focus(); });

  var list = document.createElement('div');
  list.className = 'reg-ac-list';
  list.id = 'palabrasList';

  input.addEventListener('input', function() {
    showAcSuggestions(input, catalogs.palabras || [], list, function(match) {
      addPalabraTag(match); input.value = ''; list.classList.remove('open');
    });
  });
  input.addEventListener('blur', function() {
    setTimeout(function() { list.classList.remove('open'); }, 200);
  });
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      var val = input.value.trim().toUpperCase();
      if (val) { addPalabraTag(val); input.value = ''; list.classList.remove('open'); }
    }
  });

  acWrap.appendChild(tagsWrap);
  acWrap.appendChild(list);
  wrap.appendChild(acWrap);
  return wrap;
}

function makeActions() {
  var div = document.createElement('div');
  div.className = 'reg-actions';

  var btnGuardar = document.createElement('button');
  btnGuardar.id = 'btnGuardar';
  btnGuardar.className = 'reg-btn-primary';
  btnGuardar.textContent = 'Guardar registro';
  btnGuardar.addEventListener('click', submitForm);

  var btnLimpiar = document.createElement('button');
  btnLimpiar.className = 'reg-btn-secondary';
  btnLimpiar.textContent = 'Limpiar';
  btnLimpiar.addEventListener('click', resetForm);

  div.appendChild(btnGuardar);
  div.appendChild(btnLimpiar);
  return div;
}

// ═══ CASCADA FONDO → SECCIÓN → SERIE ═══

function selectFondo(btn) {
  document.querySelectorAll('.reg-fondo-btn').forEach(function(b) {
    b.classList.remove('active');
  });
  btn.classList.add('active');
  selectedFondo = btn.dataset.fondo;

  var secSel = document.getElementById('regSeccion');
  while (secSel.firstChild) secSel.removeChild(secSel.firstChild);

  var opt0 = document.createElement('option');
  opt0.value = '';
  opt0.textContent = 'Seleccionar sección...';
  secSel.appendChild(opt0);

  var secciones = Object.keys((catalogs.taxonomia[selectedFondo] || {}));
  secciones.forEach(function(s) {
    var opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    secSel.appendChild(opt);
  });
  secSel.disabled = false;

  // Reset serie
  resetSerieSelect();
}

function onSeccionChange() {
  var seccion = document.getElementById('regSeccion').value;
  resetSerieSelect();
  if (!seccion || !selectedFondo) return;

  var series = (catalogs.taxonomia[selectedFondo] || {})[seccion] || [];
  var serSel = document.getElementById('regSerie');

  var opt0 = document.createElement('option');
  opt0.value = '';
  opt0.textContent = 'Seleccionar serie...';
  serSel.appendChild(opt0);

  series.forEach(function(s) {
    var opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    serSel.appendChild(opt);
  });
  serSel.disabled = false;
}

function resetSerieSelect() {
  var serSel = document.getElementById('regSerie');
  while (serSel.firstChild) serSel.removeChild(serSel.firstChild);

  var opt0 = document.createElement('option');
  opt0.value = '';
  opt0.textContent = 'Selecciona una sección primero';
  serSel.appendChild(opt0);
  serSel.disabled = true;
}

// ═══ AUTOCOMPLETADO ═══

// onSelect(match): callback al elegir sugerencia. Si no se pasa, asigna al input.
function showAcSuggestions(input, items, listEl, onSelect) {
  var q = input.value.toLowerCase().trim();
  if (q.length < 1) { listEl.classList.remove('open'); return; }

  var matches = items.filter(function(item) {
    return item.toLowerCase().includes(q);
  }).slice(0, 12);

  while (listEl.firstChild) listEl.removeChild(listEl.firstChild);

  if (matches.length === 0) { listEl.classList.remove('open'); return; }

  matches.forEach(function(match) {
    var item = document.createElement('div');
    item.className = 'reg-ac-item';
    item.textContent = match;
    item.addEventListener('mousedown', function(e) {
      e.preventDefault();
      if (onSelect) {
        onSelect(match);
      } else {
        input.value = match;
      }
      listEl.classList.remove('open');
    });
    listEl.appendChild(item);
  });

  listEl.classList.add('open');
}

// ═══ TAGS ═══

function addAutorTag(val) {
  if (autorTags.indexOf(val) !== -1) return;
  autorTags.push(val);
  renderAutorTags();
}

function removeAutorTag(idx) {
  autorTags.splice(idx, 1);
  renderAutorTags();
}

function renderAutorTags() {
  var wrap = document.getElementById('autorTagsWrap');
  var input = document.getElementById('autorInput');
  if (!wrap || !input) return;

  wrap.querySelectorAll('.reg-tag').forEach(function(t) { wrap.removeChild(t); });

  autorTags.forEach(function(tag, idx) {
    var tagEl = document.createElement('span');
    tagEl.className = 'reg-tag';

    var txt = document.createTextNode(tag + ' ');
    var x = document.createElement('span');
    x.className = 'reg-tag-x';
    x.textContent = '×';
    x.addEventListener('click', function() { removeAutorTag(idx); });

    tagEl.appendChild(txt);
    tagEl.appendChild(x);
    wrap.insertBefore(tagEl, input);
  });
}

function addDispositivoTag(val) {
  if (dispositivoTags.indexOf(val) !== -1) return;
  dispositivoTags.push(val);
  renderDispositivoTags();
}

function removeDispositivoTag(idx) {
  dispositivoTags.splice(idx, 1);
  renderDispositivoTags();
}

function renderDispositivoTags() {
  var wrap = document.getElementById('dispositivoTagsWrap');
  var input = document.getElementById('dispositivoInput');
  if (!wrap || !input) return;

  wrap.querySelectorAll('.reg-tag').forEach(function(t) { wrap.removeChild(t); });

  dispositivoTags.forEach(function(tag, idx) {
    var tagEl = document.createElement('span');
    tagEl.className = 'reg-tag';
    var txt = document.createTextNode(tag + ' ');
    var x = document.createElement('span');
    x.className = 'reg-tag-x';
    x.textContent = '×';
    x.addEventListener('click', function() { removeDispositivoTag(idx); });
    tagEl.appendChild(txt);
    tagEl.appendChild(x);
    wrap.insertBefore(tagEl, input);
  });
}

function addEspacioEntry(espacio, nivel) {
  for (var i = 0; i < espacioEntries.length; i++) {
    if (espacioEntries[i].espacio === espacio) return;
  }
  espacioEntries.push({ espacio: espacio, nivel: nivel });
  renderEspacioTags();
}

function removeEspacioEntry(idx) {
  espacioEntries.splice(idx, 1);
  renderEspacioTags();
}

function renderEspacioTags() {
  var wrap = document.getElementById('espacioTagsWrap');
  var input = document.getElementById('espacioInput');
  if (!wrap || !input) return;

  wrap.querySelectorAll('.reg-tag').forEach(function(t) { wrap.removeChild(t); });

  espacioEntries.forEach(function(entry, idx) {
    var tagEl = document.createElement('span');
    tagEl.className = 'reg-tag';

    var labelText = entry.espacio + (entry.nivel ? ' (' + entry.nivel + ')' : '');
    var txt = document.createTextNode(labelText + ' ');
    var x = document.createElement('span');
    x.className = 'reg-tag-x';
    x.textContent = '×';
    x.addEventListener('click', (function(i) {
      return function() { removeEspacioEntry(i); };
    })(idx));

    tagEl.appendChild(txt);
    tagEl.appendChild(x);
    wrap.insertBefore(tagEl, input);
  });
}

function addPalabraTag(val) {
  if (palabrasTags.indexOf(val) !== -1) return;
  palabrasTags.push(val);
  renderPalabrasTags();
}

function removePalabraTag(idx) {
  palabrasTags.splice(idx, 1);
  renderPalabrasTags();
}

function renderPalabrasTags() {
  var wrap = document.getElementById('palabrasTagsWrap');
  var input = document.getElementById('palabrasInput');
  if (!wrap || !input) return;

  wrap.querySelectorAll('.reg-tag').forEach(function(t) { wrap.removeChild(t); });

  palabrasTags.forEach(function(tag, idx) {
    var tagEl = document.createElement('span');
    tagEl.className = 'reg-tag';

    var txt = document.createTextNode(tag + ' ');
    var x = document.createElement('span');
    x.className = 'reg-tag-x';
    x.textContent = '×';
    x.addEventListener('click', function() { removePalabraTag(idx); });

    tagEl.appendChild(txt);
    tagEl.appendChild(x);
    wrap.insertBefore(tagEl, input);
  });
}

// ═══ VALIDACIÓN ═══

function validateForm() {
  var errors = [];
  if (!selectedFondo)                                              errors.push('Selecciona un fondo');
  if (!document.getElementById('regFecha').value)                 errors.push('La fecha es obligatoria');
  if (!document.getElementById('regId').value.trim())             errors.push('La identificación es obligatoria');
  if (!document.getElementById('regSeccion').value)               errors.push('La sección es obligatoria');
  if (!document.getElementById('regSerie').value)                 errors.push('La serie es obligatoria');
  if (!document.getElementById('regAsunto').value.trim())         errors.push('El asunto es obligatorio');
  if (document.querySelectorAll('#regResguardos input:checked').length === 0) errors.push('Selecciona al menos un resguardo');

  var fmts = document.querySelectorAll('#regFormatos input:checked');
  if (fmts.length === 0) errors.push('Selecciona al menos un formato');

  return errors;
}

// ═══ SUBMIT ═══

function submitForm() {
  var errors = validateForm();
  if (errors.length > 0) {
    showToast(errors[0]);
    return;
  }

  var btn = document.getElementById('btnGuardar');
  btn.disabled = true;
  btn.textContent = 'Guardando...';

  var formatos = Array.from(document.querySelectorAll('#regFormatos input:checked'))
    .map(function(c) { return c.value; });

  // data: conserva tipos nativos (arrays) para la pantalla de confirmación
  var data = {
    fondo:          selectedFondo,
    fecha:          document.getElementById('regFecha').value,
    identificacion: document.getElementById('regId').value.trim(),
    seccion:        document.getElementById('regSeccion').value,
    serie:          document.getElementById('regSerie').value,
    proyecto:       document.getElementById('regProyecto').value.trim(),
    asunto:         document.getElementById('regAsunto').value.trim(),
    espacio:        espacioEntries.map(function(e) { return e.espacio; }).join('\n'),
    nivel:          espacioEntries.map(function(e) { return e.nivel; }).join('\n'),
    formatos:       formatos,
    autoria:        autorTags.slice(),
    dispositivo:    dispositivoTags.slice(),
    resguardo:      Array.from(document.querySelectorAll('#regResguardos input:checked')).map(function(c) { return c.value; }),
    enlaces:        document.getElementById('regEnlaces').value.trim(),
    palabrasClave:  palabrasTags.join('/')
  };

  // payload: formato que espera insertarRegistro en Codigo.gs
  var payload = {
    fondo:          data.fondo,
    fecha:          data.fecha,
    identificacion: data.identificacion,
    seccion:        data.seccion,
    serie:          data.serie,
    proyecto:       data.proyecto,
    asunto:         data.asunto,
    espacio:        data.espacio,
    nivel:          data.nivel,
    formatos:       formatos.join('\n'),
    autoria:        autorTags.join('\n'),
    dispositivo:    dispositivoTags.join('\n'),
    resguardo:      data.resguardo.join('\n'),
    enlaces:        data.enlaces,
    palabrasClave:  data.palabrasClave
  };

  fetch(WEB_APP_URL, {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  .then(function(res) { return res.json(); })
  .then(function(result) {
    if (result.ok) {
      renderConfirmacion(data, result);
    } else {
      showToast('Error: ' + (result.error || 'Error desconocido'));
      btn.disabled = false;
      btn.textContent = 'Guardar registro';
    }
  })
  .catch(function(err) {
    showToast('Error de conexión: ' + err.message);
    btn.disabled = false;
    btn.textContent = 'Guardar registro';
  });
}

// ═══ CONFIRMACIÓN ═══

function renderConfirmacion(data, result) {
  while (content.firstChild) content.removeChild(content.firstChild);

  var wrap = document.createElement('div');
  wrap.className = 'reg-confirm';

  // Título OK
  var okTitle = document.createElement('div');
  okTitle.className = 'reg-confirm-ok';
  okTitle.textContent = '✓ Registro guardado';
  wrap.appendChild(okTitle);

  // ID de carpeta
  wrap.appendChild(makeConfirmField('ID de carpeta', result.carpetaId, true));

  // Ruta
  wrap.appendChild(makeConfirmField('Ruta de carpeta', result.ruta, true));

  // Resumen
  var resumen = document.createElement('div');
  resumen.className = 'reg-confirm-field';
  var rLbl = document.createElement('div');
  rLbl.className = 'reg-confirm-label';
  rLbl.textContent = 'Resumen';
  var rVal = document.createElement('div');
  rVal.style.cssText = 'font-size:0.9rem;line-height:1.6;';
  var linea1 = document.createElement('strong');
  linea1.textContent = data.identificacion;
  rVal.appendChild(linea1);
  rVal.appendChild(document.createElement('br'));
  rVal.appendChild(document.createTextNode(
    data.fecha + ' · ' + data.seccion + ' · ' + data.serie
  ));
  rVal.appendChild(document.createElement('br'));
  rVal.appendChild(document.createTextNode(data.formatos.join(', ')));
  resumen.appendChild(rLbl);
  resumen.appendChild(rVal);
  wrap.appendChild(resumen);

  // Textos Flickr/YouTube
  var textosContainer = document.createElement('div');
  textosContainer.id = 'textosConfirm';
  wrap.appendChild(textosContainer);

  var record = { f: data.fecha, i: data.identificacion, a: data.asunto, au: data.autoria };
  Textos.renderTextos(textosContainer, record);

  // Acciones
  var actions = document.createElement('div');
  actions.className = 'reg-actions';

  var btnNuevo = document.createElement('button');
  btnNuevo.className = 'reg-btn-primary';
  btnNuevo.textContent = 'Registrar otro';
  btnNuevo.addEventListener('click', resetForm);

  var btnMenu = document.createElement('a');
  btnMenu.className = 'reg-btn-secondary';
  btnMenu.href = 'selector.html';
  btnMenu.style.textDecoration = 'none';
  btnMenu.style.textAlign = 'center';
  btnMenu.textContent = 'Volver al menú';

  actions.appendChild(btnNuevo);
  actions.appendChild(btnMenu);
  wrap.appendChild(actions);

  content.appendChild(wrap);
  window.scrollTo(0, 0);
}

function makeConfirmField(label, valor, conCopiar) {
  var wrap = document.createElement('div');
  wrap.className = 'reg-confirm-field';

  var lbl = document.createElement('div');
  lbl.className = 'reg-confirm-label';
  lbl.textContent = label;

  var val = document.createElement('div');
  val.className = 'reg-path';
  val.textContent = valor;

  wrap.appendChild(lbl);
  wrap.appendChild(val);

  if (conCopiar) {
    var btn = document.createElement('button');
    btn.className = 'textos-copy';
    btn.textContent = 'Copiar';
    btn.addEventListener('click', function() {
      navigator.clipboard.writeText(val.textContent).then(function() {
        showToast('Copiado');
      });
    });
    wrap.appendChild(btn);
  }
  return wrap;
}

// ═══ RESET ═══

function resetForm() {
  selectedFondo   = null;
  autorTags       = [];
  dispositivoTags = [];
  palabrasTags    = [];
  espacioEntries  = [];
  renderForm();
  window.scrollTo(0, 0);
}

// ═══ COPIAR DE REGISTRO ANTERIOR ═══

function getCopyRecords() {
  var d = window.DATA || (typeof DATA !== 'undefined' ? DATA : null);
  if (!d) return [];
  var records = [];
  (d.labnl || []).forEach(function(r) {
    records.push({ record: r, fondo: 'LABNL Proyecto' });
  });
  (d.apf || []).forEach(function(r) {
    records.push({ record: r, fondo: 'Antiguo Palacio Federal' });
  });
  return records;
}

function setCopyResultsMsg(resultsEl, msg) {
  while (resultsEl.firstChild) resultsEl.removeChild(resultsEl.firstChild);
  var el = document.createElement('div');
  el.className = 'copy-empty';
  el.textContent = msg;
  resultsEl.appendChild(el);
}

function showCopyOverlay() {
  var existing = document.getElementById('copyOverlay');
  if (existing) {
    existing.classList.add('active');
    var input = document.getElementById('copySearch');
    input.value = '';
    setCopyResultsMsg(document.getElementById('copyResults'), 'Escribe para buscar entre los registros existentes');
    setTimeout(function() { input.focus(); }, 50);
    return;
  }

  var overlay = document.createElement('div');
  overlay.className = 'copy-overlay';
  overlay.id = 'copyOverlay';

  var box = document.createElement('div');
  box.className = 'copy-box';

  var header = document.createElement('div');
  header.className = 'copy-header';
  var title = document.createElement('div');
  title.className = 'copy-title';
  title.textContent = 'Copiar de registro anterior';
  var closeBtn = document.createElement('button');
  closeBtn.className = 'copy-close';
  closeBtn.textContent = '\u00d7';
  closeBtn.addEventListener('click', hideCopyOverlay);
  header.appendChild(title);
  header.appendChild(closeBtn);

  var search = document.createElement('input');
  search.type = 'text';
  search.className = 'copy-search';
  search.id = 'copySearch';
  search.placeholder = 'Buscar por nombre, proyecto, asunto...';
  search.setAttribute('autocomplete', 'off');
  search.addEventListener('input', function() { searchCopyRecords(search.value); });

  var results = document.createElement('div');
  results.className = 'copy-results';
  results.id = 'copyResults';
  var emptyMsg = document.createElement('div');
  emptyMsg.className = 'copy-empty';
  emptyMsg.textContent = 'Escribe para buscar entre los registros existentes';
  results.appendChild(emptyMsg);

  box.appendChild(header);
  box.appendChild(search);
  box.appendChild(results);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) hideCopyOverlay();
  });

  overlay.classList.add('active');
  setTimeout(function() { search.focus(); }, 50);
}

function hideCopyOverlay() {
  var overlay = document.getElementById('copyOverlay');
  if (overlay) overlay.classList.remove('active');
}

function searchCopyRecords(query) {
  var resultsEl = document.getElementById('copyResults');
  var q = query.toLowerCase().trim();

  if (q.length < 2) {
    setCopyResultsMsg(resultsEl, 'Escribe al menos 2 caracteres para buscar');
    return;
  }

  var all = getCopyRecords();
  var matches = all.filter(function(item) {
    var r = item.record;
    return (r.i && r.i.toLowerCase().indexOf(q) !== -1) ||
           (r.p && r.p.toLowerCase().indexOf(q) !== -1) ||
           (r.a && r.a.toLowerCase().indexOf(q) !== -1) ||
           (r.f && r.f.indexOf(q) !== -1) ||
           (r.sc && r.sc.toLowerCase().indexOf(q) !== -1);
  });

  matches.sort(function(a, b) { return (b.record.f || '').localeCompare(a.record.f || ''); });
  matches = matches.slice(0, 20);

  while (resultsEl.firstChild) resultsEl.removeChild(resultsEl.firstChild);

  if (matches.length === 0) {
    setCopyResultsMsg(resultsEl, 'No se encontraron registros');
    return;
  }

  matches.forEach(function(item) {
    var r = item.record;
    var el = document.createElement('div');
    el.className = 'copy-item';

    var titleDiv = document.createElement('div');
    titleDiv.className = 'copy-item-title';
    titleDiv.textContent = r.i || r.p || 'Sin t\u00edtulo';

    var metaDiv = document.createElement('div');
    metaDiv.className = 'copy-item-meta';
    var metaParts = [r.f || '', r.sc || '', r.sr || ''];
    if (r.p) metaParts.push(r.p);
    metaDiv.textContent = metaParts.join(' \u00b7 ');

    el.appendChild(titleDiv);
    el.appendChild(metaDiv);

    el.addEventListener('click', function() {
      fillFormFromRecord(item.record, item.fondo);
      hideCopyOverlay();
      showToast('Datos copiados');
    });

    resultsEl.appendChild(el);
  });
}

function fillFormFromRecord(r, fondoName) {
  // 1. Select fondo (triggers sección dropdown population)
  var fondoBtns = document.querySelectorAll('.reg-fondo-btn');
  for (var i = 0; i < fondoBtns.length; i++) {
    if (fondoBtns[i].dataset.fondo === fondoName) {
      selectFondo(fondoBtns[i]);
      break;
    }
  }

  // 2. Set sección and trigger serie population
  var secSel = document.getElementById('regSeccion');
  if (r.sc && secSel) {
    secSel.value = r.sc;
    onSeccionChange();
  }

  // 3. Set serie
  var serSel = document.getElementById('regSerie');
  if (r.sr && serSel) serSel.value = r.sr;

  // 4. Text fields
  if (r.f) document.getElementById('regFecha').value = r.f;
  if (r.i) document.getElementById('regId').value = r.i;
  if (r.a) document.getElementById('regAsunto').value = r.a;
  if (r.p) document.getElementById('regProyecto').value = r.p;

  // Espacios: parsear valores multi-línea
  if (r.e) {
    espacioEntries = [];
    var espacios = String(r.e).split('\n');
    var niveles  = r.n ? String(r.n).split('\n') : [];
    espacios.forEach(function(esp, idx) {
      esp = esp.trim();
      if (esp) addEspacioEntry(esp, (niveles[idx] || '').trim());
    });
  }

  if (r.en) document.getElementById('regEnlaces').value = r.en;

  // 5. Formato checkboxes
  if (r.fm && r.fm.length) {
    document.querySelectorAll('#regFormatos input[type="checkbox"]').forEach(function(cb) {
      var shouldCheck = r.fm.indexOf(cb.value) !== -1;
      cb.checked = shouldCheck;
      cb.parentElement.classList.toggle('checked', shouldCheck);
    });
  }

  // 6. Resguardo checkboxes
  if (r.r) {
    var resguardos = typeof r.r === 'string' ? r.r.split('\n') : [r.r];
    document.querySelectorAll('#regResguardos input[type="checkbox"]').forEach(function(cb) {
      var shouldCheck = resguardos.indexOf(cb.value) !== -1;
      cb.checked = shouldCheck;
      cb.parentElement.classList.toggle('checked', shouldCheck);
    });
  }

  // 7. Autoría tags
  autorTags = [];
  if (r.au && r.au.length) {
    r.au.forEach(function(a) { if (a) autorTags.push(a); });
    renderAutorTags();
  }

  // 8. Dispositivo tags
  dispositivoTags = [];
  if (r.d) {
    var devs = typeof r.d === 'string' ? r.d.split('\n') : [r.d];
    devs.forEach(function(dv) { if (dv.trim()) dispositivoTags.push(dv.trim()); });
    renderDispositivoTags();
  }

  // 9. Palabras clave tags
  palabrasTags = [];
  if (r.pc && r.pc.length) {
    r.pc.forEach(function(p) { if (p) palabrasTags.push(p); });
    renderPalabrasTags();
  }

  window.scrollTo(0, 0);
}

// ═══ INIT ═══
loadCatalogs();
