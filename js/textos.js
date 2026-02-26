// ═══════════════════════════════════════════════════════════
// MemoriLABNL — Generador de textos para Flickr y YouTube
// Módulo compartido: registrar.js y app.js
// ═══════════════════════════════════════════════════════════

var Textos = {

  // ── Generadores de texto ──

  // Convierte YYYY-MM-DD a DD/MM/YY
  _formatFecha: function(fecha) {
    if (!fecha) return '';
    var parts = fecha.split('-');
    if (parts.length !== 3) return fecha;
    return parts[2] + '/' + parts[1] + '/' + parts[0].slice(2);
  },

  flickrTitulo: function(fecha, identificacion) {
    return this._formatFecha(fecha) + '.' + (identificacion || '');
  },

  flickrDescripcion: function(asunto, autor) {
    var autorTexto = autor
      ? autor + ' / LABNL Lab Cultural Ciudadano'
      : 'LABNL Lab Cultural Ciudadano';
    return (asunto || '') +
      '\n\nCitar como:\n\nAutoría de imagen: ' + autorTexto +
      '\n\nDisponible bajo la licencia CC BY SA 4.0 en flickr.com/photos/labnl';
  },

  // ── Renderizar panel completo ──
  // container: elemento DOM donde se renderiza
  // record: { f, i, a, au } (fecha, identificacion, asunto, autoria[])

  renderTextos: function(container, record) {
    var fecha   = record.f || '';
    var id      = record.i || '';
    var asunto  = record.a || '';
    var autores = record.au || [];

    var flickrTit  = this.flickrTitulo(fecha, id);
    var primerAutor = autores.length > 0 ? autores[0] : '';
    var flickrDesc = this.flickrDescripcion(asunto, primerAutor);

    // Limpiar contenedor de forma segura
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    var radioName = 'flickrAutor_' + (container.id || Math.random().toString(36).slice(2));
    var panel = document.createElement('div');
    panel.className = 'textos-panel';

    // ── Sección Flickr ──
    var flickrSec = this._crearSeccion('Flickr');

    // Título Flickr
    flickrSec.appendChild(
      this._crearCampo('Título', flickrTit)
    );

    // Selector de autor
    var selectorField = this._crearSelectorAutores(autores, radioName);
    flickrSec.appendChild(selectorField);

    // Descripción Flickr (referenciada para actualizar en tiempo real)
    var flickrDescEl = document.createElement('div');
    flickrDescEl.className = 'textos-value textos-multiline';
    flickrDescEl.textContent = flickrDesc;
    flickrSec.appendChild(
      this._crearCampoConElemento('Descripción', flickrDescEl)
    );

    panel.appendChild(flickrSec);
    container.appendChild(panel);

    // Listener: cambio de autor → actualiza descripción Flickr
    var self = this;
    var radios = container.querySelectorAll('input[name="' + radioName + '"]');
    radios.forEach(function(radio) {
      radio.addEventListener('change', function() {
        var checked = container.querySelector('input[name="' + radioName + '"]:checked');
        var autorVal = checked ? checked.value : '';
        flickrDescEl.textContent = self.flickrDescripcion(asunto, autorVal);
      });
    });
  },

  // ── Helpers privados ──

  _crearSeccion: function(titulo) {
    var sec = document.createElement('div');
    sec.className = 'textos-section';

    var titleEl = document.createElement('div');
    titleEl.className = 'textos-section-title';
    titleEl.textContent = titulo;
    sec.appendChild(titleEl);

    return sec;
  },

  _crearCampo: function(label, valor, multilinea) {
    var valEl = document.createElement('div');
    valEl.className = 'textos-value' + (multilinea ? ' textos-multiline' : '');
    valEl.textContent = valor;
    return this._crearCampoConElemento(label, valEl);
  },

  _crearCampoConElemento: function(label, valEl) {
    var field = document.createElement('div');
    field.className = 'textos-field';

    var lbl = document.createElement('div');
    lbl.className = 'textos-label';
    lbl.textContent = label;

    var btn = document.createElement('button');
    btn.className = 'textos-copy';
    btn.textContent = 'Copiar';
    btn.addEventListener('click', function() {
      navigator.clipboard.writeText(valEl.textContent).then(function() {
        if (typeof showToast === 'function') showToast('Copiado');
      });
    });

    field.appendChild(lbl);
    field.appendChild(valEl);
    field.appendChild(btn);
    return field;
  },

  _crearSelectorAutores: function(autores, radioName) {
    var field = document.createElement('div');
    field.className = 'textos-field';

    var lbl = document.createElement('div');
    lbl.className = 'textos-label';
    lbl.textContent = 'Autoría para la descripción';
    field.appendChild(lbl);

    var grupo = document.createElement('div');
    grupo.className = 'textos-autores';

    var lista = autores.length > 0 ? autores : [''];
    lista.forEach(function(autor, idx) {
      var lbEl = document.createElement('label');
      lbEl.className = 'textos-autor-option';

      var radio = document.createElement('input');
      radio.type  = 'radio';
      radio.name  = radioName;
      radio.value = autor;
      if (idx === 0) radio.checked = true;

      lbEl.appendChild(radio);
      lbEl.appendChild(
        document.createTextNode(' ' + (autor || 'LABNL Lab Cultural Ciudadano'))
      );
      grupo.appendChild(lbEl);
    });

    field.appendChild(grupo);
    return field;
  }

};
