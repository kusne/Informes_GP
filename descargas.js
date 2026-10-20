/* Descarga pública de modelos en blanco; ningún control de administración aquí. */
(() => {
  'use strict';
  const URL = 'https://hbnxvwrqxhurdteirsyl.supabase.co';
  const KEY = 'sb_publishable_GgrICSZSYl6Fc5D8SzT-aA_GLCB9J01';
  const BUCKET = 'bmzcn-actas';
  const TABLA = 'bmzcn_actas_documentos';
  const $ = id => document.getElementById(id);
  let documentos = [];
  let client;
  const formatos = { doc: 'WORD', docx: 'WORD', pdf: 'PDF' };
  function normalizar(valor) {
    return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
  function celdaTexto(tag, texto, clase) {
    const el = document.createElement(tag);
    el.textContent = texto;
    if (clase) el.className = clase;
    return el;
  }
  function renderizar() {
    const texto = normalizar($('buscar').value.trim());
    const filtrados = documentos.filter(doc => normalizar(
      [doc.nombre, doc.categoria, doc.descripcion].join(' ')
    ).includes(texto));
    // Si se publican Word y PDF del mismo modelo, se muestran juntos.
    const grupos = new Map();
    filtrados.forEach(doc => {
      const clave = normalizar(doc.nombre) + '|' + normalizar(doc.categoria);
      if (!grupos.has(clave)) grupos.set(clave, {
        nombre: doc.nombre, categoria: doc.categoria, descripcion: doc.descripcion, versiones: []
      });
      const grupo = grupos.get(clave);
      if (!grupo.descripcion && doc.descripcion) grupo.descripcion = doc.descripcion;
      grupo.versiones.push(doc);
    });
    $('contador').textContent = grupos.size + (grupos.size === 1 ? ' acta disponible' : ' actas disponibles');
    const lista = $('lista');
    lista.replaceChildren();
    grupos.forEach(grupo => {
      const item = celdaTexto('article', '', 'item');
      const fila = celdaTexto('div', '', 'documento');
      const info = celdaTexto('div', '', 'documento-info');
      info.append(celdaTexto('h2', grupo.nombre));
      const detalles = celdaTexto('div', '', 'detalles');
      detalles.append(celdaTexto('span', grupo.categoria));
      info.append(detalles);
      if (grupo.descripcion) info.append(celdaTexto('p', grupo.descripcion, 'desc'));

      // El ícono descarga el Word cuando existe; de lo contrario, el primer formato.
      const principal = grupo.versiones.find(doc =>
        ['doc', 'docx'].includes(String(doc.extension).toLowerCase())
      ) || grupo.versiones[0];
      const icono = celdaTexto('a', '', 'icono-descarga');
      icono.href = client.storage.from(BUCKET).getPublicUrl(principal.archivo_ruta, {
        download: principal.archivo_nombre
      }).data.publicUrl;
      icono.target = '_blank';
      icono.rel = 'noopener noreferrer';
      icono.title = 'Descargar ' + grupo.nombre;
      icono.setAttribute('aria-label', 'Descargar ' + grupo.nombre + ' en ' +
        String(formatos[principal.extension] || principal.extension).toUpperCase());

      const acciones = celdaTexto('div', '', 'descargas-actions');
      grupo.versiones.forEach(doc => {
        const formato = String(formatos[doc.extension] || doc.extension).toUpperCase();
        const a = celdaTexto('a', 'Descargar ' + formato, 'descargar');
        a.href = client.storage.from(BUCKET).getPublicUrl(doc.archivo_ruta, {
          download: doc.archivo_nombre
        }).data.publicUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.title = doc.archivo_nombre;
        acciones.append(a);
      });
      info.append(acciones);
      fila.append(icono, info);
      item.append(fila);
      lista.append(item);
    });
    $('estado').hidden = grupos.size > 0;
    $('estado').className = '';
    $('estado').textContent = documentos.length
      ? 'No se encontraron documentos con esa búsqueda.'
      : 'Todavía no hay actas disponibles para descargar.';
  }
  async function iniciar() {
    try {
      if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        throw Error('No se pudo cargar el servicio de documentos.');
      }
      client = window.supabase.createClient(URL, KEY, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
      });
      const { data, error } = await client.from(TABLA)
        .select('nombre,categoria,descripcion,extension,archivo_nombre,archivo_ruta,actualizado_en')
        .order('nombre', { ascending: true });
      if (error) throw error;
      documentos = data || [];
      renderizar();
    } catch (error) {
      $('estado').hidden = false;
      $('estado').className = 'error';
      $('estado').textContent = 'No fue posible cargar las actas. Verificá la conexión y volvé a intentar. (' + (error.message || error) + ')';
      $('contador').textContent = '';
    }
  }
  $('buscar').addEventListener('input', () => { if (client) renderizar(); });
  void iniciar();
})();