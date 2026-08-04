export function iniciarObservacionesInicio({ textarea, onChange } = {}) {
  if (!textarea) return;

  const notificar = () => {
    if (typeof onChange === "function") {
      onChange(String(textarea.value || "").trim());
    }
  };

  textarea.addEventListener("input", notificar);
  textarea.addEventListener("change", notificar);
}
