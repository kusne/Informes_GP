/**
 * No cerrar ni bloquear la PWA al detectar que Informes GP también está
 * abierto en Chrome. La instalación y el navegador son accesos válidos.
 * La detección de actualizaciones se gestiona por separado.
 */
export function iniciarInstanciaUnicaInformesGP() {
  return Promise.resolve({
    activo: true,
    duplicada: false
  });
}
