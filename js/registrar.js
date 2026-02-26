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
var WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwIPiGUKsT6riPWR-2WaPC7OMl8ziIfvaqBnpAbJ7euU_lDbBTqp9LtyK9o-BfOV8oMKg/exec';

var content      = document.getElementById('content');
var loadingMsg   = document.getElementById('loadingMsg');

// ── Estado del formulario ──
var catalogs        = null;   // datos del servidor
var selectedFondo   = null;   // 'LABNL Proyecto' | 'Antiguo Palacio Federal'
var autorTags       = [];
var dispositivoTags = [];
var palabrasTags    = [];

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
    })
    .catch(function(err) {
      console.error('Error loading catalogs:', err);
      showFallbackError();
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
  form.appendChild(makeField('Espacio', 'reg', makeEspacioSelect()));
  form.appendChild(makeField('Nivel', 'reg', makeNivelSelect()));
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

  var h1 = document.createElement('h1');
  h1.className = 'reg-title';
  h1.textContent = 'Nuevo Registro';

  var p = document.createElement('p');
  p.className = 'reg-subtitle';
  p.textContent = 'Captura una nueva ficha de clasificación · los campos marcados con * son obligatorios';

  div.appendChild(h1);
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

function makeEspacioSelect() {
  var sel = document.createElement('select');
  sel.id = 'regEspacio';
  sel.className = 'reg-select';

  var opt0 = document.createElement('option');
  opt0.value = '';
  opt0.textContent = 'Seleccionar...';
  sel.appendChild(opt0);

  (catalogs.espacios || []).forEach(function(e) {
    var opt = document.createElement('option');
    opt.value = e;
    opt.textContent = e;
    sel.appendChild(opt);
  });
  return sel;
}

function makeNivelSelect() {
  var sel = document.createElement('select');
  sel.id = 'regNivel';
  sel.className = 'reg-select';

  var opt0 = document.createElement('option');
  opt0.value = '';
  opt0.textContent = 'Seleccionar...';
  sel.appendChild(opt0);

  (catalogs.niveles || []).forEach(function(n) {
    var opt = document.createElement('option');
    opt.value = n;
    opt.textContent = n;
    sel.appendChild(opt);
  });
  return sel;
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
    espacio:        document.getElementById('regEspacio').value,
    nivel:          document.getElementById('regNivel').value,
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
  renderForm();
  window.scrollTo(0, 0);
}

// ═══ INIT ═══
loadCatalogs();
