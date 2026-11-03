/* ===================================================================
   8PM Coffee Time — panel de carga
   Sin SCRIPT_URL funciona en "modo demostración": guarda en este navegador
   y la web (abierta en el mismo navegador) muestra los cambios.
   =================================================================== */
(function () {
  const C = window.OCHO;
  const { plata, esc, cargarDatos, postScript, leerLocal, guardarLocal, CLAVE_DEMO } = window.Ocho;
  const DEMO = !C.SCRIPT_URL;
  const CLAVE_DEMO_PANEL = "8pm2026";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  let D = null, clave = "", tab = "inicio", sucio = false, pedidos = [];

  /* ---------- Toast ---------- */
  let tt;
  function toast(t) { const el = $("#toast"); el.textContent = t; el.classList.add("on"); clearTimeout(tt); tt = setTimeout(() => el.classList.remove("on"), 2400); }

  /* ---------- Entrada ---------- */
  if (DEMO) $("#demoNota").hidden = false;
  $("#formClave").addEventListener("submit", async (e) => {
    e.preventDefault();
    const c = $("#clave").value.trim();
    $("#errClave").textContent = "";
    if (DEMO) {
      if (c !== CLAVE_DEMO_PANEL) { $("#errClave").textContent = "Clave incorrecta."; return; }
    } else {
      try {
        const r = await postScript({ accion: "verificarClave", clave: c });
        if (!r.success) { $("#errClave").textContent = r.message || "Clave incorrecta."; return; }
      } catch (err) { $("#errClave").textContent = "No hay conexión. Probá de nuevo."; return; }
    }
    clave = c;
    try { sessionStorage.setItem("ocho_clave", c); } catch (err) {}
    entrar();
  });
  try { const c = sessionStorage.getItem("ocho_clave"); if (c) { clave = c; entrar(); } } catch (e) {}

  async function entrar() {
    $("#entrada").hidden = true;
    $("#app").hidden = false;
    $("#modo").textContent = DEMO ? "Modo demostración" : "Conectado a la planilla";
    D = await cargarDatos();
    await traerPedidos();
    pintar();
  }
  $("#salir").addEventListener("click", () => {
    if (sucio && !confirm("Tenés cambios sin guardar. ¿Salir igual?")) return;
    try { sessionStorage.removeItem("ocho_clave"); } catch (e) {}
    location.reload();
  });

  /* ---------- Pestañas ---------- */
  $$("#tabs button").forEach((b) => b.addEventListener("click", () => {
    tab = b.dataset.t;
    $$("#tabs button").forEach((x) => x.classList.toggle("on", x === b));
    pintar(); scrollTo({ top: 0 });
  }));

  /* ---------- Lectura / escritura por "ruta" (ej: carta.0.items.3.p) ---------- */
  function obtener(ruta) { return ruta.split(".").reduce((o, k) => (o == null ? o : o[k]), D); }
  function poner(ruta, valor) {
    const ks = ruta.split("."), ult = ks.pop();
    const o = ks.reduce((o, k) => o[k], D);
    o[ult] = valor;
  }
  function marcarSucio() {
    sucio = true;
    $("#barra").classList.add("sucio");
    $("#estadoGuardar").textContent = "Cambios sin guardar";
    $("#guardar").disabled = false;
  }
  addEventListener("beforeunload", (e) => { if (sucio) { e.preventDefault(); e.returnValue = ""; } });

  const vista = $("#vista");
  vista.addEventListener("input", (e) => {
    const el = e.target, k = el.dataset.k;
    if (!k) return;
    let v = el.type === "checkbox" ? (el.dataset.inv ? !el.checked : el.checked) : el.value;
    if (el.dataset.num) v = Math.max(0, Math.round(Number(v) || 0));
    if (el.dataset.lista) v = el.value.split("\n").map((s) => s.trim()).filter(Boolean);
    poner(k, v);
    if (el.dataset.inv) el.closest(".fila")?.classList.toggle("oculta", !el.checked);
    marcarSucio();
  });
  vista.addEventListener("click", (e) => {
    const b = e.target.closest("[data-acc]");
    if (!b) return;
    const acc = b.dataset.acc, k = b.dataset.k;
    if (acc === "borrar") {
      const ks = k.split("."), i = +ks.pop(), lista = obtener(ks.join("."));
      const nombre = lista[i].n || lista[i].personas + " personas";
      if (!confirm(`¿Borrar “${nombre}”?`)) return;
      lista.splice(i, 1); marcarSucio(); pintar();
    } else if (acc === "agregar") {
      const lista = obtener(k);
      lista.push(JSON.parse(b.dataset.nuevo)); marcarSucio(); pintar();
      setTimeout(() => { const filas = $$(".fila", b.parentElement); const f = filas[filas.length - 1]; f && f.scrollIntoView({ block: "center" }); f && $("input", f).focus(); }, 50);
    } else if (acc === "subir") {
      const ks = k.split("."), i = +ks.pop(), lista = obtener(ks.join("."));
      if (i > 0) { [lista[i - 1], lista[i]] = [lista[i], lista[i - 1]]; marcarSucio(); pintar(); }
    } else if (acc === "foto") {
      elegirFoto(k, b.dataset.redonda === "1");
    } else if (acc === "nuevaCat") {
      D.carta.push({ cat: "Nueva categoría", items: [] }); marcarSucio(); pintar();
    } else if (acc === "borrarCat") {
      const i = +k; if (D.carta[i].items.length && !confirm(`¿Borrar la categoría “${D.carta[i].cat}” con todos sus productos?`)) return;
      D.carta.splice(i, 1); marcarSucio(); pintar();
    } else if (acc === "ajustar") {
      ajustarPrecios();
    } else if (acc === "recargarPedidos") {
      traerPedidos().then(pintar);
    }
  });

  /* ---------- Fotos: se achican en el celular antes de subir ---------- */
  let destinoFoto = null;
  function elegirFoto(ruta, redonda) { destinoFoto = { ruta, redonda }; $("#archivo").value = ""; $("#archivo").click(); }
  $("#archivo").addEventListener("change", async () => {
    const f = $("#archivo").files[0];
    if (!f || !destinoFoto) return;
    toast("Preparando la foto…");
    const max = DEMO ? 520 : 1200;
    const datos = await achicar(f, max, destinoFoto.redonda);
    try {
      let url = datos;
      if (!DEMO) {
        const r = await postScript({ accion: "subirFoto", clave, base64: datos.split(",")[1], mimeType: "image/jpeg", nombre: f.name });
        if (!r.success) throw new Error(r.message);
        url = r.url;
      }
      poner(destinoFoto.ruta, url); marcarSucio(); pintar(); toast("Foto cargada ✓ (falta guardar)");
    } catch (e) { toast("No se pudo subir la foto: " + e.message); }
  });
  function achicar(file, max, cuadrada) {
    return new Promise((ok, mal) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height, sx = 0, sy = 0, sw = w, sh = h;
        if (cuadrada) { const l = Math.min(w, h); sx = (w - l) / 2; sy = (h - l) / 2; sw = sh = l; w = h = l; }
        const k = Math.min(1, max / Math.max(w, h));
        const cv = document.createElement("canvas"); cv.width = Math.round(w * k); cv.height = Math.round(h * k);
        cv.getContext("2d").drawImage(img, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
        ok(cv.toDataURL("image/jpeg", .82)); URL.revokeObjectURL(img.src);
      };
      img.onerror = mal;
      img.src = URL.createObjectURL(file);
    });
  }

  /* ---------- Subir precios en bloque (inflación) ---------- */
  function ajustarPrecios() {
    const pct = Number($("#ajPct").value), donde = $("#ajDonde").value;
    if (!pct) { toast("Poné un porcentaje"); return; }
    const nombre = $("#ajDonde").selectedOptions[0].textContent.toLowerCase();
    if (!confirm(`¿Ajustar un ${pct}% los precios de: ${nombre}? (se redondean a $10)`)) return;
    const r = (n) => Math.round((n * (1 + pct / 100)) / 10) * 10;
    let n = 0;
    if (donde === "carta" || donde === "todo") D.carta.forEach((c) => c.items.forEach((it) => { it.p = r(it.p); n++; }));
    if (donde === "bocaditos" || donde === "todo") D.bocaditos.forEach((b) => { b.p = Math.round(b.p * (1 + pct / 100)); n++; });
    if (donde === "postres" || donde === "todo") D.postres.forEach((p) => { p.p18 = r(p.p18); p.p28 = r(p.p28); n++; });
    if (donde === "combos" || donde === "todo") D.combos.forEach((k) => { k.precio = r(k.precio); n++; });
    if (donde === "todo") { D.menuSemana.precioCompleto = r(D.menuSemana.precioCompleto); D.menuSemana.precioSolo = r(D.menuSemana.precioSolo); }
    marcarSucio(); pintar(); toast(`${n} precios actualizados (falta guardar)`);
  }

  /* ---------- Guardar ---------- */
  $("#guardar").addEventListener("click", async () => {
    const b = $("#guardar");
    b.disabled = true; b.textContent = "Guardando…";
    try {
      if (DEMO) {
        if (!guardarLocal(CLAVE_DEMO, D)) throw new Error("No hay espacio en el navegador (probá con fotos más chicas).");
      } else {
        const r = await postScript({ accion: "guardar", clave, datos: D });
        if (!r.success) throw new Error(r.message);
      }
      sucio = false;
      $("#barra").classList.remove("sucio");
      $("#estadoGuardar").textContent = "✓ Publicado " + new Date().toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit" });
      toast("¡Listo! Ya se ve en la web");
    } catch (e) {
      b.disabled = false; toast("No se pudo guardar: " + e.message);
    }
    b.textContent = "Guardar y publicar";
  });

  /* ---------- Pedidos ---------- */
  async function traerPedidos() {
    if (DEMO) pedidos = leerLocal("ocho_demo_pedidos") || [];
    else {
      try {
        const r = await (await fetch(C.SCRIPT_URL + "?accion=pedidos&clave=" + encodeURIComponent(clave))).json();
        pedidos = r.success ? r.pedidos : [];
      } catch (e) { pedidos = []; }
    }
    const hoy = new Date().toISOString().slice(0, 10);
    const nuevos = pedidos.filter((p) => String(p.creado || "").slice(0, 10) === hoy).length;
    $("#nPed").textContent = nuevos || "";
  }

  /* =================== VISTAS =================== */
  const campo = (titulo, html) => `<label class="campo"><span>${titulo}</span>${html}</label>`;
  const inp = (k, v, extra = "") => `<input data-k="${k}" value="${esc(v)}" ${extra}>`;
  const num = (k, v) => `<div class="precio"><input data-k="${k}" data-num="1" type="number" inputmode="numeric" min="0" value="${Number(v) || 0}"></div>`;
  const sw = (k, on, inv) => `<label class="sw"><input type="checkbox" data-k="${k}" ${inv ? 'data-inv="1"' : ""} ${on ? "checked" : ""}><i></i></label>`;
  const foto = (k, url, redonda) => `<button class="fila-foto ${redonda ? "redonda" : ""}" data-acc="foto" data-k="${k}" data-redonda="${redonda ? 1 : 0}" style="${url ? `background-image:url('${esc(url)}')` : ""}" title="Cambiar foto">${url ? "" : "+"}<span>✎</span></button>`;
  const acciones = (k) => `<div class="fila-acc"><button class="ico" data-acc="subir" data-k="${k}" title="Subir">↑</button><button class="ico borrar" data-acc="borrar" data-k="${k}" title="Borrar">🗑</button></div>`;

  function filaProducto(base, it, conFoto, redonda) {
    return `<div class="fila ${it.oculto ? "oculta" : ""}">
      ${conFoto ? foto(base + ".foto", it.foto, redonda) : `<button class="fila-foto" data-acc="foto" data-k="${base}.foto" style="${it.foto ? `background-image:url('${esc(it.foto)}')` : ""}" title="Agregar foto (opcional)">${it.foto ? "" : "📷"}</button>`}
      <div class="fila-txt">${inp(base + ".n", it.n, 'placeholder="Nombre"')}<textarea data-k="${base}.d" rows="1" placeholder="Descripción (opcional)">${esc(it.d || "")}</textarea></div>
      <div class="fila-precio">${num(base + ".p", it.p)}<div class="interruptor"><small>Visible</small>${sw(base + ".oculto", !it.oculto, true)}</div></div>
      ${acciones(base)}</div>`;
  }

  const V = {
    inicio() {
      const prods = D.carta.reduce((s, c) => s + c.items.length, 0);
      const hoy = new Date().toISOString().slice(0, 10);
      return `<h2>Hola <em>8PM</em> 👋</h2><p class="ayuda">Lo más usado del día a día. Tocá “Guardar y publicar” abajo para que se vea en la web.</p>
      <div class="resumen">
        <div><b>${prods}</b><span>productos en la carta</span></div>
        <div><b>${D.postres.length}</b><span>tortas en catálogo</span></div>
        <div><b>${pedidos.filter((p) => String(p.creado || "").slice(0, 10) === hoy).length}</b><span>pedidos web hoy</span></div>
      </div>
      <div class="tarjeta"><h3>Aviso en la web</h3>
        <div class="interruptor"><div><b>Mostrar un aviso arriba de todo</b><small>Ej: “Mañana cerramos por feriado” o “¡Nueva torta de pistacho!”</small></div>${sw("aviso.activo", D.aviso.activo)}</div>
        ${campo("Texto del aviso", inp("aviso.texto", D.aviso.texto, 'placeholder="Escribí el aviso"'))}</div>
      <div class="tarjeta"><h3>Hoy</h3>
        <div class="interruptor"><div><b>Hoy está cerrado</b><small>La web muestra “Cerrado” aunque sea horario de apertura. Acordate de apagarlo mañana.</small></div>${sw("cerradoHoy", D.cerradoHoy)}</div></div>
      <div class="tarjeta"><h3>Subir precios en bloque</h3>
        <div class="ajuste"><b>Ajustá todos los precios de una vez (por ejemplo, por inflación).</b>
          <input id="ajPct" type="number" inputmode="decimal" placeholder="%" value="5">
          <select id="ajDonde"><option value="carta">Carta</option><option value="bocaditos">Bocados de lunch</option><option value="combos">Combos</option><option value="postres">Tortas</option><option value="todo">Todo</option></select>
          <button class="btn-suave" data-acc="ajustar">Aplicar</button></div></div>`;
    },
    semana() {
      const m = D.menuSemana;
      return `<h2>Menú <em>semanal</em></h2><p class="ayuda">El plato de cada día. La web destaca solo el de hoy.</p>
      <div class="tarjeta"><div class="dos">${campo("Precio con postre y bebida", num("menuSemana.precioCompleto", m.precioCompleto))}${campo("Precio solo el plato", num("menuSemana.precioSolo", m.precioSolo))}</div></div>
      ${m.dias.map((d, i) => `<div class="tarjeta"><h3>${esc(d.dia)}</h3>${campo("Plato", inp(`menuSemana.dias.${i}.plato`, d.plato))}${campo("Descripción", `<textarea data-k="menuSemana.dias.${i}.desc" rows="3">${esc(d.desc)}</textarea>`)}</div>`).join("")}
      <div class="tarjeta"><h3>Vegetariano de la semana</h3>${campo("Opciones (separalas con ·)", inp("menuSemana.vegetariano", m.vegetariano))}</div>`;
    },
    carta() {
      return `<h2>La <em>carta</em></h2><p class="ayuda">Cambiá nombres, precios y descripciones. Apagá “Visible” para sacar algo un tiempo sin borrarlo.</p>
      ${D.carta.map((c, ci) => `<div class="grupo-cab"><input class="cat-nombre" data-k="carta.${ci}.cat" value="${esc(c.cat)}" aria-label="Nombre de la categoría"><button class="btn-suave" data-acc="borrarCat" data-k="${ci}">Borrar categoría</button></div>
        <div>${c.items.map((it, i) => filaProducto(`carta.${ci}.items.${i}`, it, false)).join("")}
        <button class="agregar" data-acc="agregar" data-k="carta.${ci}.items" data-nuevo='{"n":"","d":"","p":0}'>+ Agregar a ${esc(c.cat)}</button></div>`).join("")}
      <button class="btn" data-acc="nuevaCat" style="margin-top:20px">+ Nueva categoría</button>`;
    },
    lunch() {
      return `<h2>Bocados de <em>lunch</em></h2><p class="ayuda">Precio por unidad. En la web se piden de a 12 como mínimo por variedad.</p>
      <div>${D.bocaditos.map((b, i) => filaProducto(`bocaditos.${i}`, b, true)).join("")}
      <button class="agregar" data-acc="agregar" data-k="bocaditos" data-nuevo='{"n":"","d":"","p":0,"foto":""}'>+ Agregar bocado</button></div>`;
    },
    combos() {
      return `<h2><em>Combos</em> de lunch</h2><p class="ayuda">Un renglón por cosa que lleva el combo.</p>
      ${D.combos.map((k, i) => `<div class="tarjeta"><div class="dos">${campo("Personas", `<input data-k="combos.${i}.personas" data-num="1" type="number" value="${k.personas}">`)}${campo("Precio", num(`combos.${i}.precio`, k.precio))}</div>
        ${campo("Contiene (uno por renglón)", `<textarea data-k="combos.${i}.items" data-lista="1" rows="${k.items.length + 1}">${esc(k.items.join("\n"))}</textarea>`)}
        <button class="btn-suave" data-acc="borrar" data-k="combos.${i}">Borrar combo</button></div>`).join("")}
      <button class="agregar" data-acc="agregar" data-k="combos" data-nuevo='{"personas":0,"precio":0,"items":[]}'>+ Agregar combo</button>`;
    },
    postres() {
      return `<h2>Catálogo de <em>tortas</em></h2><p class="ayuda">Dos precios: 18 cm y 28 cm. Las fotos quedan mejor cuadradas, con la torta al centro.</p>
      <div>${D.postres.map((p, i) => {
        const b = `postres.${i}`;
        return `<div class="fila ${p.oculto ? "oculta" : ""}">${foto(b + ".foto", p.foto, true)}
          <div class="fila-txt">${inp(b + ".n", p.n)}<textarea data-k="${b}.d" rows="1">${esc(p.d)}</textarea></div>
          <div class="fila-precio">${num(b + ".p18", p.p18)}<small style="font-size:11px;opacity:.6">18 cm</small>${num(b + ".p28", p.p28)}<small style="font-size:11px;opacity:.6">28 cm</small>
          <div class="interruptor"><small>Visible</small>${sw(b + ".oculto", !p.oculto, true)}</div></div>${acciones(b)}</div>`;
      }).join("")}
      <button class="agregar" data-acc="agregar" data-k="postres" data-nuevo='{"n":"","d":"","p18":0,"p28":0,"foto":""}'>+ Agregar torta</button></div>`;
    },
    horarios() {
      const orden = [1, 2, 3, 4, 5, 6, 0];
      return `<h2><em>Horarios</em></h2><p class="ayuda">Dejá vacío para “Cerrado”. La web calcula sola si está abierto ahora.</p>
      <div class="tarjeta">${orden.map((i) => { const h = D.horarios[i]; return `<div class="hora"><b>${esc(h.dia)}</b>
        <input type="time" data-k="horarios.${i}.abre" value="${esc(h.abre)}" aria-label="Abre"><input type="time" data-k="horarios.${i}.cierra" value="${esc(h.cierra)}" aria-label="Cierra">
        <button class="ico" title="Cerrado" onclick="this.parentElement.querySelectorAll('input').forEach(x=>{x.value='';x.dispatchEvent(new Event('input',{bubbles:true}))})">✕</button></div>`; }).join("")}</div>`;
    },
    pedidos() {
      return `<h2>Pedidos <em>web</em></h2><p class="ayuda">Todo lo que la gente armó en la web y mandó por WhatsApp. Sirve para no perder ninguno y ver qué se pide más.</p>
      <button class="btn-suave" data-acc="recargarPedidos" style="margin-bottom:14px">↻ Actualizar</button>
      ${pedidos.length ? pedidos.map((p) => `<div class="pedido"><div class="pedido-cab"><div><b>${esc(p.nombre)}</b>${p.numero ? ` <small style="opacity:.55">${esc(p.numero)}</small>` : ""}${p.telefono ? `<br><a href="https://wa.me/598${esc(String(p.telefono).replace(/\D/g, "").replace(/^0/, ""))}" target="_blank" style="font-size:13px;font-weight:700;color:var(--salvia)">💬 ${esc(p.telefono)}</a>` : ""}<br>
        <span class="chip">${esc(p.entrega)}</span><span class="chip">${esc(p.fecha || "")} ${esc(p.hora || "")}</span></div><span class="tot">${plata(p.total)}</span></div>
        <pre>${esc(p.detalle)}${p.direccion ? "\n📍 " + esc(p.direccion) : ""}${p.nota ? "\n📝 " + esc(p.nota) : ""}</pre>
        <small style="opacity:.55">Recibido ${new Date(p.creado).toLocaleString("es-UY")}</small></div>`).join("")
        : `<div class="vacio">Todavía no entraron pedidos por la web.</div>`}`;
    }
  };

  function pintar() {
    vista.innerHTML = V[tab]();
    $$("textarea", vista).forEach((t) => { if (!t.dataset.lista) { t.style.height = "auto"; t.style.height = t.scrollHeight + 4 + "px"; } });
  }
})();
