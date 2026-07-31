export function renderContadorOperativos(hostSelector, cantidad) {
  const host = document.querySelector(hostSelector);
  if (!host) return;

  const numero = Number.isFinite(Number(cantidad)) ? Number(cantidad) : 0;

  host.innerHTML = `
    <span id="contadorOperativosValor" class="contador-operativos-wsp" title="Cantidad de operativos disponibles">
      ${numero}
    </span>
  `;
}
