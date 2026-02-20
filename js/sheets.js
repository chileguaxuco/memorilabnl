// ═══════════════════════════════════════════════════════════
// MemoriLABNL — Conexión en vivo con Google Sheets
// Lee datos directamente de la hoja de cálculo pública
// ═══════════════════════════════════════════════════════════

const SHEET_ID = '1i80BnweQbHPSYy7ozC1VuGlMFeoDOmUEh4jwsX00gEk';
const SHEETS = {
  labnl: 'LABNL Proyecto',
  apf: 'Antiguo Palacio Federal'
};

// Parsea fecha de Google Viz API: "Date(2025,11,30)" → "2025-12-30"
function parseGoogleDate(val) {
  if (!val) return '';
  // String: "Date(YYYY,M,D)"
  if (typeof val === 'string' && val.startsWith('Date(')) {
    const m = val.match(/Date\((\d+),(\d+),(\d+)/);
    if (m) {
      const y = m[1];
      const mo = String(parseInt(m[2]) + 1).padStart(2, '0'); // months are 0-indexed
      const d = m[3].padStart(2, '0');
      return `${y}-${mo}-${d}`;
    }
  }
  // Formatted date "dd/mm/yy" or "dd.mm.yy"
  if (typeof val === 'string') {
    const m = val.match(/^(\d{1,2})[\/\.](\d{1,2})[\/\.](\d{2,4})$/);
    if (m) {
      let y = m[3].length === 2 ? '20' + m[3] : m[3];
      return `${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
    }
  }
  return String(val);
}

// Parsea formatos: "Fotografía, Video" → ["Fotografía", "Video"]
function parseList(val) {
  if (!val) return [];
  return String(val).split(/[,\/]/).map(s => s.trim()).filter(Boolean);
}

// Parsea palabras clave: "REUNIONES/MEDIADORES" → ["REUNIONES", "MEDIADORES"]
function parseKeywords(val) {
  if (!val) return [];
  return String(val).split(/[\/,]/).map(s => s.trim()).filter(Boolean);
}

// Abreviaciones para generar IDs de carpeta
const ABREV_SEC = {
  "LAB":"LAB","Proyectos Ciudadanos":"PC","Comunidades Prácticas de Aprendizaje":"CPA",
  "Coordinación LAB":"CLAB","Diálogos y encuentros":"DE","Exposiciones":"EXP",
  "MIC":"MIC","Sesiones de prototipado":"SP","Sesiones abiertas":"SA",
  "Aprender haciendo":"AH","Vinculación":"VIN","Residencias":"RES",
  "Maratones":"MAR","Prototipado":"PROTO","APF":"APF",
  "Comunidades de Práctica y Aprendizaje":"CPA"
};
const ABREV_SER = {
  "Sesiones de Trabajo_Laboratorios":"SELAB","Sesiones de Trabajo_Coordinación":"SECOORD",
  "DocSpace":"DOCS","Inauguraciones_Presentaciones":"INAUG","Contenido_Publicaciones":"CONT",
  "Registro":"REG","Visitas_Recorridos":"VIS","Sesiones de proyecto":"SEPROY",
  "Sesiones de Vinculación":"SEVINC","Sesiones abiertas":"SEAB","Celebraciones":"CELEB",
  "Prototipo":"PROTO","Entrevistas":"ENTR","Talleres":"TALL","Evaluaciones":"EVAL",
  "Diálogos abiertos":"DIAL","Sesiones de Mentoría":"SEMEN","Validación":"VALID",
  "Mapeo":"MAP","Conciertos":"CONC","Festivales":"FEST","Proyecciones":"PROY",
  "Performance":"PERF","Mercados y Bazares":"MERC","Mediación":"MED",
  "Investigación":"INV","Capacitaciones":"CAP","Convocatorias":"CONV",
  "Exposiciones":"EXP","Eventos auto-gestivos":"AUTO","Montajes":"MONT",
  "Actividades en espacios":"ACTESP","Viernes de LABNL":"VIER",
  "Elección de proyectos":"ELEC","Conservación":"CONS"
};

function genCarpetaId(fecha, seccion, serie, id) {
  if (!fecha || !seccion) return '';
  const parts = fecha.split('-');
  if (parts.length !== 3) return '';
  const yy = parts[0].slice(2);
  const mm = parts[1];
  const dd = parts[2];
  const sc = ABREV_SEC[seccion] || seccion.slice(0,4).toUpperCase();
  const sr = ABREV_SER[serie] || (serie || '').replace(/[^a-zA-Z]/g,'').slice(0,6).toUpperCase();
  return `${yy}.${mm}.${dd}.${sc}.${sr}.${id || 'Sin_titulo'}`;
}

function genRuta(fondo, seccion, serie, carpetaId) {
  const fondoPath = fondo === 'LABNL' ? 'LABNL' : 'Antiguo Palacio Federal';
  return `MemoriLABNL/${fondoPath}/${seccion}/${serie}/${carpetaId}`;
}

// Fetch data from a single sheet using Google Visualization API
async function fetchSheet(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url);
  const text = await res.text();

  // Strip Google callback wrapper: google.visualization.Query.setResponse({...})
  const jsonStr = text.replace(/^[^(]*\(/, '').replace(/\);?\s*$/, '');
  const json = JSON.parse(jsonStr);

  if (json.status !== 'ok' || !json.table) return [];

  const cols = json.table.cols;
  const rows = json.table.rows;

  return { cols, rows };
}

// Process LABNL sheet rows into records
function processLABNL(rows) {
  return rows.map(row => {
    const c = row.c || [];
    const val = i => (c[i] && c[i].v != null) ? c[i].v : '';
    const fVal = i => (c[i] && c[i].f) ? c[i].f : '';

    const fecha = parseGoogleDate(val(0));
    const id = String(val(1));
    const seccion = String(val(2));
    const serie = String(val(3));
    const proyecto = String(val(4));
    const asunto = String(val(5));
    const espacio = String(val(6));
    const nivel = String(val(7));
    const formatos = parseList(val(8));
    const autoria = parseList(val(9));
    const dispositivo = String(val(10));
    const resguardo = String(val(11));
    const enlaces = String(val(12));
    const palabras = parseKeywords(val(13));
    const ci = genCarpetaId(fecha, seccion, serie, id);

    return {
      f: fecha, i: id, sc: seccion, sr: serie, p: proyecto,
      a: asunto, e: espacio, n: nivel, fm: formatos, au: autoria,
      d: dispositivo, r: resguardo, en: enlaces, pc: palabras,
      ci: ci, ru: genRuta('LABNL', seccion, serie, ci)
    };
  }).filter(r => r.i || r.p || r.a); // Skip empty rows
}

// Process APF sheet rows into records
function processAPF(rows) {
  return rows.map(row => {
    const c = row.c || [];
    const val = i => (c[i] && c[i].v != null) ? c[i].v : '';

    const fecha = parseGoogleDate(val(0));
    const id = String(val(1));
    const seccion = String(val(2));
    const serie = String(val(3));
    const proyecto = String(val(4));
    const asunto = String(val(5));
    const espacio = String(val(6));
    const nivel = String(val(7));
    const formatos = parseList(val(8));
    const resguardo = String(val(9));
    const dispositivo = String(val(10));
    const autoria = parseList(val(11));
    const enlaces = String(val(12));
    const palabras = parseKeywords(val(13));
    const ci = genCarpetaId(fecha, seccion, serie, id);

    return {
      f: fecha, i: id, sc: seccion, sr: serie, p: proyecto,
      a: asunto, e: espacio, n: nivel, fm: formatos, au: autoria,
      d: dispositivo, r: resguardo, en: enlaces, pc: palabras,
      ci: ci, ru: genRuta('APF', seccion, serie, ci)
    };
  }).filter(r => r.i || r.p || r.a);
}

// Build taxonomy from records
function buildTaxonomia(labnlRecords, apfRecords) {
  const tax = { LABNL: {}, APF: {} };
  labnlRecords.forEach(r => {
    if (!r.sc) return;
    if (!tax.LABNL[r.sc]) tax.LABNL[r.sc] = new Set();
    if (r.sr) tax.LABNL[r.sc].add(r.sr);
  });
  apfRecords.forEach(r => {
    if (!r.sc) return;
    if (!tax.APF[r.sc]) tax.APF[r.sc] = new Set();
    if (r.sr) tax.APF[r.sc].add(r.sr);
  });
  // Convert sets to arrays
  for (const fondo of ['LABNL', 'APF']) {
    for (const sec in tax[fondo]) {
      tax[fondo][sec] = [...tax[fondo][sec]].sort();
    }
  }
  return tax;
}

// Main: load all data from Google Sheets
async function loadFromSheets() {
  console.log('MemoriLABNL: Cargando datos de Google Sheets...');
  const t0 = Date.now();

  const [labnlData, apfData] = await Promise.all([
    fetchSheet(SHEETS.labnl),
    fetchSheet(SHEETS.apf)
  ]);

  // Skip header row (index 0)
  const labnlRecords = processLABNL(labnlData.rows.slice(1));
  const apfRecords = processAPF(apfData.rows.slice(1));
  const taxonomia = buildTaxonomia(labnlRecords, apfRecords);

  const data = {
    labnl: labnlRecords,
    apf: apfRecords,
    taxonomia: taxonomia,
    stats: {
      total: labnlRecords.length + apfRecords.length,
      labnl: labnlRecords.length,
      apf: apfRecords.length
    }
  };

  console.log(`MemoriLABNL: ${data.stats.total} registros cargados en ${Date.now()-t0}ms`);
  return data;
}
