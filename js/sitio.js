/* ===================================================================
   8PM Coffee Time — la web (menú de hoy, carta, lunch, postres, pedido)
   =================================================================== */
(function () {
  const { plata, esc, slug, ahoraUY, estadoLocal, waLink } = window.Ocho;
  const C = window.OCHO;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const MIN_BOC = 12, PASO_BOC = 6, BOC_X_PERSONA = 12;

  let D = null;
  let pedido = Ocho.leerLocal("ocho_pedido") || [];
  let tam = "16";

  /* ---------- Bienvenida (una vez por visita) ---------- */
  const splash = $("#splash");
  let yaVio = false;
  try { yaVio = sessionStorage.getItem("ocho_splash") === "1"; sessionStorage.setItem("ocho_splash", "1"); } catch (e) {}
  if (yaVio || matchMedia("(prefers-reduced-motion: reduce)").matches) splash.remove();
  else setTimeout(() => { splash.classList.add("fuera"); setTimeout(() => splash.remove(), 1000); }, 2300);

  /* ---------- Enlaces fijos ---------- */
  $("#waFlot").href = waLink("¡Hola 8PM! Quería hacer una consulta.");
  $("#waVis").href = waLink("¡Hola 8PM! Quería hacer una consulta.");
  $("#mapaVis").href = C.MAPA;
  $("#igPie").href = C.INSTAGRAM;
  $("#telPie").href = "tel:+" + C.WHATSAPP;
  $("#anio").textContent = new Date().getFullYear();
  setTimeout(() => { $("#mapa").src = C.MAPA_EMBED; }, 1200);

  /* ---------- Cabecera ---------- */
  const cab = $("#cab"), nav = $("#nav"), hamb = $("#hamb");
  addEventListener("scroll", () => cab.classList.toggle("sombra", scrollY > 10), { passive: true });
  hamb.addEventListener("click", () => { nav.classList.toggle("on"); hamb.classList.toggle("on"); });
  $$("a", nav).forEach((a) => a.addEventListener("click", () => { nav.classList.remove("on"); hamb.classList.remove("on"); }));
  const secciones = $$("main section[id]");
  const espia = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) $$("a", nav).forEach((a) => a.classList.toggle("activo", a.getAttribute("href") === "#" + e.target.id));
  }), { rootMargin: "-45% 0px -50% 0px" });
  secciones.forEach((s) => espia.observe(s));

  /* ---------- Fotos del hero: se van turnando adelante ---------- */
  const figs = $$("#heroFotos figure");
  let fi = 2;
  figs[fi].classList.add("frente");
  setInterval(() => { figs[fi].classList.remove("frente"); fi = (fi + 1) % figs.length; figs[fi].classList.add("frente"); }, 3200);

  /* ---------- Toast ---------- */
  let tt;
  function toast(t) { const el = $("#toast"); el.textContent = t; el.classList.add("on"); clearTimeout(tt); tt = setTimeout(() => el.classList.remove("on"), 2200); }

  /* =================== MENÚ DE HOY =================== */
  function pintarHoy() {
    const m = D.menuSemana;
    const { dia } = ahoraUY();
    const hoyIdx = dia >= 1 && dia <= 5 ? dia - 1 : -1;
    const semana = $("#semana");
    semana.innerHTML = m.dias.map((d, i) => `<li data-i="${i}" class="${i === hoyIdx ? "es-hoy" : ""} ${hoyIdx > -1 && i < hoyIdx ? "pasado" : ""}">
        <b>${esc(d.dia)}</b><span>${esc(d.plato)}</span></li>`).join("");
    function mostrar(i) {
      const d = m.dias[i];
      const etiqueta = i === hoyIdx ? "Hoy · " + d.dia : hoyIdx === -1 && i === 0 ? "El lunes vuelve" : d.dia;
      $("#hoyCard").innerHTML = `<span class="hoy-dia">${i === hoyIdx ? "● " : ""}${esc(etiqueta)}</span>
        <h3>${esc(d.plato)}</h3><p>${esc(d.desc)}</p>
        <div class="hoy-precios">
          <button class="precio-op" data-op="completo"><b>${plata(m.precioCompleto)}</b><span>con postre y bebida</span><small>+ Agregar al pedido</small></button>
          <button class="precio-op" data-op="solo"><b>${plata(m.precioSolo)}</b><span>solo el plato</span><small>+ Agregar al pedido</small></button>
        </div>`;
      $$("#hoyCard .precio-op").forEach((b) => b.addEventListener("click", () => {
        const completo = b.dataset.op === "completo";
        agregar({ id: `m:${slug(d.dia)}:${b.dataset.op}`, nombre: `Menú del ${d.dia.toLowerCase()}: ${d.plato}`, detalle: completo ? "Con postre y bebida" : "Solo el plato",
          precio: completo ? m.precioCompleto : m.precioSolo, cant: 1, paso: 1, min: 1 });
      }));
      $$("li", semana).forEach((li) => li.classList.toggle("visto", +li.dataset.i === i && i !== hoyIdx));
    }
    $$("li", semana).forEach((li) => li.addEventListener("click", () => mostrar(+li.dataset.i)));
    mostrar(hoyIdx === -1 ? 0 : hoyIdx);
    $("#veggie").innerHTML = m.vegetariano ? `<b>🌱 Opción vegetariana de la semana:</b> ${esc(m.vegetariano)}` : "";
  }

  /* =================== CARTA =================== */
  let catActiva = null;
  function pintarCarta() {
    if (!catActiva) catActiva = (D.carta[0] || {}).cat || "Todo";
    const cats = ["Todo"].concat(D.carta.map((c) => c.cat));
    $("#cats").innerHTML = cats.map((c) => `<button class="${c === catActiva ? "on" : ""}" data-c="${esc(c)}">${esc(c)}</button>`).join("");
    $$("#cats button").forEach((b) => b.addEventListener("click", () => { catActiva = b.dataset.c; pintarCarta(); }));
    const q = slug($("#buscar").value).replace(/-/g, " ");
    const html = D.carta.filter((c) => catActiva === "Todo" || c.cat === catActiva).map((c) => {
      const items = c.items.filter((it) => it.oculto !== true && (!q || slug(it.n + " " + it.d).replace(/-/g, " ").includes(q)));
      if (!items.length) return "";
      return `<div class="cat-bloque"><h3>${esc(c.cat)} <small>${items.length}</small></h3>${items.map((it) => {
        const id = "c:" + slug(c.cat + "-" + it.n);
        return `<div class="plato">${it.foto ? `<img class="plato-foto" src="${esc(it.foto)}" alt="" loading="lazy">` : "<span></span>"}
          <div class="plato-txt"><b>${esc(it.n)}</b>${it.d ? `<p>${esc(it.d)}</p>` : ""}</div>
          <div class="plato-der"><span>${plata(it.p)}</span><button class="mas" data-id="${id}" data-n="${esc(it.n)}" data-p="${it.p}" aria-label="Agregar ${esc(it.n)}">+</button></div></div>`;
      }).join("")}</div>`;
    }).join("");
    $("#cartaLista").innerHTML = html || `<p class="sin-res">No encontramos “${esc($("#buscar").value)}”. Probá con otra palabra o escribinos por WhatsApp.</p>`;
    $$("#cartaLista .mas").forEach((b) => b.addEventListener("click", () => {
      agregar({ id: b.dataset.id, nombre: b.dataset.n, precio: +b.dataset.p, cant: 1, paso: 1, min: 1 });
      b.classList.add("ok"); b.textContent = "✓"; setTimeout(() => { b.classList.remove("ok"); b.textContent = "+"; }, 1100);
    }));
  }
  $("#buscar").addEventListener("input", () => { catActiva = "Todo"; pintarCarta(); });

  /* =================== LUNCH =================== */
  function pintarCombos() {
    $("#combos").innerHTML = D.combos.map((k) => `<article class="combo" data-p="${k.personas}">
        <span class="combo-badge">Ideal para tu grupo</span>
        <div class="combo-n">${k.personas}<small>personas</small></div>
        <ul>${k.items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
        <div class="combo-pie"><div><b>${plata(k.precio)}</b><em>${plata(k.precio / k.personas)} por persona</em></div>
        <button class="btn-chico" data-p="${k.personas}">Lo quiero</button></div></article>`).join("");
    $$("#combos .btn-chico").forEach((b) => b.addEventListener("click", () => {
      const k = D.combos.find((x) => x.personas === +b.dataset.p);
      agregar({ id: "k:" + k.personas, nombre: `Combo lunch ${k.personas} personas`, detalle: k.items.join(", "), precio: k.precio, cant: 1, paso: 1, min: 1, encargo: true });
    }));
    recomendar();
  }
  function recomendar() {
    const n = +$("#pers").value;
    $("#persOut").textContent = n;
    const lista = D.combos.slice().sort((a, b) => a.personas - b.personas);
    const k = lista.find((x) => x.personas >= n) || lista[lista.length - 1];
    $$("#combos .combo").forEach((el) => el.classList.toggle("rec", +el.dataset.p === k.personas));
    const bocados = n * BOC_X_PERSONA;
    $("#persRec").innerHTML = `Para <b>${n} personas</b> te recomendamos el <b>combo de ${k.personas}</b> (${plata(k.precio)}), o armá tu bandeja con unos <b>${bocados} bocados</b>.`;
    const el = $(`#combos .combo[data-p="${k.personas}"]`);
    const cont = $("#combos");
    if (el && cont.scrollWidth > cont.clientWidth) cont.scrollTo({ left: el.offsetLeft - cont.offsetLeft - 8, behavior: "smooth" });
  }
  $("#pers").addEventListener("input", recomendar);

  function pintarBocaditos() {
    $("#bocs").innerHTML = D.bocaditos.filter((b) => b.oculto !== true).map((b) => {
      const id = "b:" + slug(b.n);
      return `<article class="boc" data-id="${id}">
        <span class="boc-cant"></span>
        <img src="${esc(b.foto || "img/empanadas.jpg")}" alt="${esc(b.n)}" loading="lazy">
        <div class="boc-txt"><b>${esc(b.n)}</b><p>${esc(b.d)}</p></div>
        <div class="boc-pie"><span>${plata(b.p)}<small>c/u</small></span>
          <div class="paso"><button data-a="-1" aria-label="Menos">−</button><output>0</output><button data-a="1" aria-label="Más">+</button></div></div></article>`;
    }).join("");
    $$("#bocs .boc").forEach((el) => {
      const b = D.bocaditos.find((x) => "b:" + slug(x.n) === el.dataset.id);
      $$(".paso button", el).forEach((btn) => btn.addEventListener("click", () => {
        const linea = pedido.find((l) => l.id === el.dataset.id);
        const actual = linea ? linea.cant : 0;
        let nuevo = btn.dataset.a === "1" ? (actual === 0 ? MIN_BOC : actual + PASO_BOC) : (actual <= MIN_BOC ? 0 : actual - PASO_BOC);
        if (!linea && nuevo) pedido.push({ id: el.dataset.id, nombre: b.n, detalle: "Bocado de lunch", precio: b.p, cant: nuevo, paso: PASO_BOC, min: MIN_BOC, encargo: true });
        else if (linea) { if (nuevo) linea.cant = nuevo; else pedido = pedido.filter((l) => l !== linea); }
        if (btn.dataset.a === "1" && actual === 0) toast(`${b.n}: arrancamos con 12 (es el mínimo por variedad)`);
        guardar();
      }));
    });
    sincronizarBocaditos();
  }
  function sincronizarBocaditos() {
    let unid = 0, tot = 0;
    $$("#bocs .boc").forEach((el) => {
      const l = pedido.find((x) => x.id === el.dataset.id);
      const n = l ? l.cant : 0;
      el.classList.toggle("elegido", n > 0);
      $("output", el).textContent = n;
      $(".boc-cant", el).textContent = n + " u.";
      if (l) { unid += n; tot += n * l.precio; }
    });
    const pers = Math.floor(unid / BOC_X_PERSONA);
    $("#bUnid").textContent = unid;
    $("#bPers").textContent = pers;
    $("#bTot").textContent = plata(tot);
    const meta = +$("#pers").value * BOC_X_PERSONA;
    $("#bBar").style.width = Math.min(100, (unid / meta) * 100) + "%";
    $("#bTip").textContent = unid >= meta ? `¡Listo! Te alcanza para tus ${$("#pers").value} personas.` : `Te faltan ~${meta - unid} bocados para ${$("#pers").value} personas.`;
  }

  /* =================== POSTRES =================== */
  function pintarPostres() {
    $("#tortas").innerHTML = D.postres.filter((p) => p.oculto !== true).map((p) => `<article class="torta">
        <div class="torta-img"><img src="${esc(p.foto)}" alt="${esc(p.n)}" loading="lazy">
          <span class="torta-precio">${plata(p["p" + tam])}<small>${tam} cm</small></span></div>
        <h4>${esc(p.n)}</h4><p>${esc(p.d)}</p>
        <button class="btn-chico" data-n="${esc(p.n)}">Encargar</button></article>`).join("");
    $$("#tortas .btn-chico").forEach((b) => b.addEventListener("click", () => {
      const p = D.postres.find((x) => x.n === b.dataset.n);
      agregar({ id: `p:${slug(p.n)}:${tam}`, nombre: p.n, detalle: `${tam} cm · encargo con 3 días de anticipación`, precio: p["p" + tam], cant: 1, paso: 1, min: 1, encargo: true, postre: true });
    }));
  }
  const bola = $(".tam-bola");
  function moverBola() { const on = $(".tam button.on"); bola.style.width = on.offsetWidth + "px"; bola.style.transform = `translateX(${on.offsetLeft - 5}px)`; }
  $$(".tam button").forEach((b) => b.addEventListener("click", () => {
    tam = b.dataset.t;
    $$(".tam button").forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-checked", x === b); });
    moverBola();
    $$(".torta-precio").forEach((el, i) => {
      el.classList.remove("cambia"); void el.offsetWidth; el.classList.add("cambia");
      const vis = D.postres.filter((p) => p.oculto !== true);
      setTimeout(() => { el.innerHTML = `${plata(vis[i]["p" + tam])}<small>${tam} cm</small>`; }, 220);
    });
  }));
  addEventListener("resize", moverBola);

  /* =================== HORARIOS / ESTADO =================== */
  function pintarHorarios() {
    const { dia } = ahoraUY();
    const orden = [1, 2, 3, 4, 5, 6, 0];
    $("#horas").innerHTML = orden.map((i) => {
      const h = D.horarios[i];
      return `<li class="${i === dia ? "es-hoy" : ""}"><span>${esc(h.dia)}</span><b>${h.abre ? `${h.abre} a ${h.cierra}` : "Cerrado"}</b></li>`;
    }).join("");
    const pintarEstado = () => { const e = estadoLocal(D); const el = $("#estado"); el.classList.toggle("abierto", e.abierto); $("b", el).textContent = e.texto; };
    pintarEstado(); setInterval(pintarEstado, 60000);
    if (D.aviso && D.aviso.activo && D.aviso.texto) { const a = $("#aviso"); a.textContent = D.aviso.texto; a.hidden = false; }
  }

  /* =================== PEDIDO =================== */
  function guardar() { Ocho.guardarLocal("ocho_pedido", pedido); pintarPedido(); sincronizarBocaditos(); }
  function agregar(item) {
    const l = pedido.find((x) => x.id === item.id);
    if (l) l.cant += item.paso || 1; else pedido.push(item);
    guardar();
    toast("Agregado: " + item.nombre);
    const b = $("#abrirPedido"); b.classList.remove("salta"); void b.offsetWidth; b.classList.add("salta");
  }
  const total = () => pedido.reduce((s, l) => s + l.precio * l.cant, 0);

  function pintarPedido() {
    $("#cuenta").textContent = pedido.length;
    $("#total").textContent = plata(total());
    const lista = $("#lista");
    if (!pedido.length) {
      lista.innerHTML = `<div class="vacio"><b>Todavía está vacío</b>Sumá cosas de la carta, el menú de hoy, bocados para tu lunch o una torta.</div>`;
    } else {
      lista.innerHTML = pedido.map((l, i) => `<div class="linea"><b>${esc(l.nombre)}</b>
          <small>${l.detalle ? esc(l.detalle.length > 90 ? l.detalle.slice(0, 90) + "…" : l.detalle) : plata(l.precio) + " c/u"}</small>
          <span class="linea-p">${plata(l.precio * l.cant)}</span>
          <div class="paso"><button data-i="${i}" data-a="-1" aria-label="Menos">−</button><output>${l.cant}</output><button data-i="${i}" data-a="1" aria-label="Más">+</button></div></div>`).join("");
      $$("button", lista).forEach((b) => b.addEventListener("click", () => {
        const l = pedido[+b.dataset.i];
        const paso = l.paso || 1, min = l.min || 1;
        if (b.dataset.a === "1") l.cant += paso;
        else if (l.cant - paso < min) pedido.splice(+b.dataset.i, 1);
        else l.cant -= paso;
        guardar();
      }));
    }
    const hayPostre = pedido.some((l) => l.postre), hayEncargo = pedido.some((l) => l.encargo);
    const f = $("#formPedido").fecha;
    const min = new Date(); min.setDate(min.getDate() + (hayPostre ? 3 : 0));
    f.min = min.toISOString().slice(0, 10);
    if (!f.value || f.value < f.min) f.value = f.min;
    $("#notaFecha").textContent = hayPostre ? "Las tortas se encargan con 3 días de anticipación y 50% de seña."
      : hayEncargo ? "El lunch se confirma con 50% de seña. Cuanto antes nos avises, mejor." : "";
  }

  const cajon = $("#cajon"), velo = $("#velo");
  function abrir(on) { cajon.classList.toggle("on", on); velo.classList.toggle("on", on); cajon.setAttribute("aria-hidden", !on); document.body.style.overflow = on ? "hidden" : ""; }
  $("#abrirPedido").addEventListener("click", () => abrir(true));
  $("#cerrarPedido").addEventListener("click", () => abrir(false));
  velo.addEventListener("click", () => abrir(false));
  addEventListener("keydown", (e) => { if (e.key === "Escape") abrir(false); });

  const form = $("#formPedido");
  $$("input[name=entrega]", form).forEach((r) => r.addEventListener("change", () => {
    const envio = form.entrega.value.startsWith("Envío");
    form.direccion.hidden = !envio; form.direccion.required = envio;
  }));
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!pedido.length) { toast("Tu pedido está vacío"); return; }
    const f = Object.fromEntries(new FormData(form));
    const fecha = f.fecha ? new Date(f.fecha + "T12:00").toLocaleDateString("es-UY", { weekday: "long", day: "numeric", month: "long" }) : "";
    const lineas = pedido.map((l) => `• ${l.cant} × ${l.nombre}${l.detalle && !l.id.startsWith("k:") ? ` (${l.detalle})` : ""} — ${plata(l.precio * l.cant)}`);
    const texto = [`¡Hola 8PM! Soy ${f.nombre}, quiero hacer este pedido:`, "", ...lineas, "", `*Total estimado: ${plata(total())}*`,
      `${f.entrega}${f.direccion ? ": " + f.direccion : ""}`, `Para el ${fecha}${f.hora ? " a las " + f.hora : ""}`, f.nota ? "Nota: " + f.nota : ""].filter((x) => x !== null).join("\n").trim();
    registrarPedido({ nombre: f.nombre, entrega: f.entrega, direccion: f.direccion || "", fecha: f.fecha, hora: f.hora, nota: f.nota || "", detalle: lineas.join("\n"), total: total() });
    window.open(waLink(texto), "_blank");
    toast("¡Listo! Te abrimos WhatsApp para enviarlo");
  });

  /* Deja registro del pedido para el panel (planilla, o este navegador en modo demostración) */
  function registrarPedido(p) {
    if (C.SCRIPT_URL) { Ocho.postScript({ accion: "pedido", pedido: p }).catch(() => {}); return; }
    const l = Ocho.leerLocal("ocho_demo_pedidos") || [];
    l.unshift(Object.assign({ creado: new Date().toISOString() }, p));
    Ocho.guardarLocal("ocho_demo_pedidos", l.slice(0, 100));
  }

  /* ---------- Aparición al hacer scroll ---------- */
  function revelar() {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("visto"); io.unobserve(e.target); } }), { threshold: .12 });
    $$(".sec-cab, .hoy-card, .semana li, .combo, .boc, .torta, .info-grid div, .vis-foto, .cat-bloque").forEach((el, i) => {
      el.classList.add("revela"); el.style.transitionDelay = (i % 6) * 60 + "ms"; io.observe(el);
    });
  }

  /* ---------- Arranque ---------- */
  Ocho.cargarDatos().then((datos) => {
    D = datos;
    pintarHoy(); pintarCarta(); pintarCombos(); pintarBocaditos(); pintarPostres(); pintarHorarios(); pintarPedido();
    moverBola(); revelar();
  }).catch(() => toast("No pudimos cargar la carta. Probá recargar la página."));
})();
