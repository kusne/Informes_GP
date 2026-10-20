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
    $('contador').textContent = filtrados.length + (filtrados.length === 1 ? ' documento disponible' : ' documentos disponibles');
    const lista = $('lista');
    lista.replaceChildren();
    filtrados.forEach(doc => {
      const item = celdaTexto('article', '', 'item');
      const info = document.createElement('div');
      info.append(celdaTexto('h2', doc.nombre));
      const detalles = celdaTexto('div', '', 'detalles');
      detalles.append(
        celdaTexto('span', doc.categoria),
        celdaTexto('span', String(formatos[doc.extension] || doc.extension).toUpperCase(), 'formato')
      );
      if (doc.actualizado_en) {
        detalles.append(celdaTexto('span', 'Actualizada: ' + new Date(doc.actualizado_en).toLocaleDateString('es-AR')));
      }
      info.append(detalles);
      if (doc.descripcion) info.append(celdaTexto('p', doc.descripcion, 'desc'));
      const a = celdaTexto('a', '↓ Descargar ' + String(formatos[doc.extension] || doc.extension).toUpperCase(), 'descargar');
      a.href = client.storage.from(BUCKET).getPublicUrl(doc.archivo_ruta, {
        download: doc.archivo_nombre
      }).data.publicUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      item.append(info, a);
      lista.append(item);
    });
    $('estado').hidden = filtrados.length > 0;
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