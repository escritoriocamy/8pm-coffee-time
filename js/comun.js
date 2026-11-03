/* ===================================================================
   8PM Coffee Time — funciones compartidas por la web y el panel
   =================================================================== */
(function () {
  const C = window.OCHO;
  const CLAVE_DEMO = "ocho_demo_datos";
  const CLAVE_CACHE = "ocho_cache_datos";

  function leerLocal(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function guardarLocal(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }

  /* Trae la carta: planilla (si hay SCRIPT_URL) → si falla, la última copia buena → data/carta.json.
     En modo demostración, lo que se guardó desde el panel en este navegador pisa al archivo. */
  async function cargarDatos() {
    if (C.SCRIPT_URL) {
      try {
        const r = await fetch(C.SCRIPT_URL + "?accion=datos", { cache: "no-store" });
        const j = await r.json();
        if (j.success && j.datos && j.datos.carta) { guardarLocal(CLAVE_CACHE, j.datos); return j.datos; }
      } catch (e) {}
      const cache = leerLocal(CLAVE_CACHE);
      if (cache) return cache;
    } else {
      const demo = leerLocal(CLAVE_DEMO);
      if (demo && demo.carta) {
        (demo.postres || []).forEach((p) => { if (p.p18 == null) { p.p18 = p.p16; delete p.p16; } });
        return demo;
      }
    }
    const r = await fetch("data/carta.json", { cache: "no-store" });
    return r.json();
  }

  function plata(n) {
    return "$" + Math.round(Number(n) || 0).toLocaleString("es-UY");
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function slug(s) {
    return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  /* Hora de Montevideo, sin depender de la zona horaria del visitante */
  function ahoraUY() {
    const p = new Intl.DateTimeFormat("en-US", { timeZone: "America/Montevideo", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
    const g = (t) => (p.find((x) => x.type === t) || {}).value;
    const dia = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(g("weekday"));
    return { dia, minutos: (Number(g("hour")) % 24) * 60 + Number(g("minute")) };
  }
  const aMin = (h) => { const [a, b] = String(h || "").split(":").map(Number); return isNaN(a) ? null : a * 60 + (b || 0); };

  /* { abierto, texto } para el cartelito de "Abierto ahora" */
  function estadoLocal(datos) {
    const hs = datos.horarios || [];
    const { dia, minutos } = ahoraUY();
    const hoy = hs[dia] || {};
    const a = aMin(hoy.abre), c = aMin(hoy.cierra);
    if (!datos.cerradoHoy && a != null && c != null && minutos >= a && minutos < c) {
      const falta = c - minutos;
      return { abierto: true, texto: falta <= 45 ? `Abierto · cierra en ${falta} min` : `Abierto ahora · hasta las ${hoy.cierra}` };
    }
    if (!datos.cerradoHoy && a != null && minutos < a) return { abierto: false, texto: `Cerrado · abre hoy a las ${hoy.abre}` };
    for (let i = 1; i <= 7; i++) {
      const d = hs[(dia + i) % 7] || {};
      if (aMin(d.abre) != null) return { abierto: false, texto: `Cerrado · abre ${i === 1 ? "mañana" : d.dia.toLowerCase()} ${d.abre}` };
    }
    return { abierto: false, texto: "Cerrado" };
  }

  function waLink(texto) {
    return "https://wa.me/" + C.WHATSAPP + (texto ? "?text=" + encodeURIComponent(texto) : "");
  }

  async function postScript(body) {
    const r = await fetch(C.SCRIPT_URL, { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "text/plain;charset=utf-8" } });
    return r.json();
  }

  window.Ocho = { cargarDatos, plata, esc, slug, ahoraUY, estadoLocal, waLink, postScript, leerLocal, guardarLocal, CLAVE_DEMO };
})();
