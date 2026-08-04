export async function iniciarSelectorModoInforme({ hostSelector, onChange }) {
  const host = document.querySelector(hostSelector);
  if (!host) return;

  host.innerHTML = `
    <div class="selector-modo-informe">
      <label class="top-label" for="selectorModoInformeSelect">Informes</label>

      <select id="selectorModoInformeSelect" class="obligatorio">
        <option value="INICIA" selected>INICIA</option>
        <option value="FINALIZA">FINALIZA</option>
        <option value="INFORMES">INFORMES</option>
        <option value="CONTROL_MOVILES">CONTROL DE MÓVILES</option>
      </select>
    </div>
  `;

  const select = host.querySelector("#selectorModoInformeSelect");

  select.addEventListener("change", async () => {
    if (typeof onChange === "function") {
      await onChange(select.value);
    }
  });
}