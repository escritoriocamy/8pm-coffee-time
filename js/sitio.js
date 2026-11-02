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
          <div class="plato-der"><span>${plata(it.p)}</span><button class="mas" data-id="${id}" data-n="${esc(it.n)}" data-p="${it.p}" data-f="${esc(it.foto || "")}" aria-label="Agregar ${esc(it.n)}">+</button></div></div>`;
      }).join("")}</div>`;
    }).join("");
    $("#cartaLista").innerHTML = html || `<p class="sin-res">No encontramos “${esc($("#buscar").value)}”. Probá con otra palabra o escribinos por WhatsApp.</p>`;
    $$("#cartaLista .mas").forEach((b) => b.addEventListener("click", () => {
      agregar({ id: b.dataset.id, nombre: b.dataset.n, precio: +b.dataset.p, foto: b.dataset.f, cant: 1, paso: 1, min: 1 });
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
        if (!linea && nuevo) pedido.push({ id: el.dataset.id, nombre: b.n, detalle: "Bocado de lunch", precio: b.p, foto: b.foto, cant: nuevo, paso: PASO_BOC, min: MIN_BOC, encargo: true });
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
      agregar({ id: `p:${slug(p.n)}:${tam}`, nombre: p.n, foto: p.foto, detalle: `${tam} cm · encargo con 3 días de anticipación`, precio: p["p" + tam], cant: 1, paso: 1, min: 1, encargo: true, postre: true });
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
  const GRUPOS = [["m", "Menú del día", "🍽️"], ["c", "De la carta", "☕"], ["k", "Combos de lunch", "🥪"], ["b", "Bocados de lunch", "🥟"], ["p", "Tortas por encargo", "🎂"]];
  let ultimoAgregado = null, ultimoPedido = null;

  function guardar() { Ocho.guardarLocal("ocho_pedido", pedido); pintarPedido(); sincronizarBocaditos(); }
  function agregar(item) {
    const l = pedido.find((x) => x.id === item.id);
    if (l) l.cant += item.paso || 1; else pedido.push(item);
    ultimoAgregado = item.id;
    guardar();
    toast("Agregado: " + item.nombre);
    const b = $("#abrirPedido"); b.classList.remove("salta"); void b.offsetWidth; b.classList.add("salta");
  }
  const total = () => pedido.reduce((s, l) => s + l.precio * l.cant, 0);
  const unidades = () => pedido.reduce((s, l) => s + (l.id.startsWith("b:") ? 1 : l.cant), 0);

  /* El total "corre" hasta el número nuevo */
  let totalMostrado = 0, rafTotal;
  function animarTotal(destino) {
    cancelAnimationFrame(rafTotal);
    const desde = totalMostrado, t0 = performance.now();
    const paso = (t) => {
      const k = Math.min(1, (t - t0) / 450), v = desde + (destino - desde) * (1 - Math.pow(1 - k, 3));
      $("#total").textContent = plata(v); totalMostrado = v;
      if (k < 1) rafTotal = requestAnimationFrame(paso);
    };
    rafTotal = requestAnimationFrame(paso);
  }

  function pintarPedido() {
    const n = unidades();
    $("#cuenta").textContent = n;
    const sub = $("#cjSub");
    const txt = pedido.length ? `${n} ${n === 1 ? "producto" : "productos"}` : "Vacío por ahora";
    if (sub.textContent !== txt) { sub.textContent = txt; sub.classList.remove("bump"); void sub.offsetWidth; sub.classList.add("bump"); }
    animarTotal(total());
    const hayEncargo = pedido.some((l) => l.encargo), hayPostre = pedido.some((l) => l.postre);
    $("#cjSena").textContent = hayEncargo ? `Seña 50%: ${plata(total() / 2)}` : "";
    if (paso === 0) $("#cjSig").disabled = !pedido.length;

    const lista = $("#lista");
    if (!pedido.length) {
      lista.innerHTML = `<div class="vacio">
        <svg viewBox="0 0 120 120" aria-hidden="true"><path class="humo" d="M48 34c-6-8 6-12 0-20"/><path class="humo" d="M60 34c-6-8 6-12 0-20"/><path class="humo" d="M72 34c-6-8 6-12 0-20"/>
          <path d="M30 44h60v30a24 24 0 0 1-24 24h-12a24 24 0 0 1-24-24V44Z" fill="#9DB592"/><path d="M90 52h6a10 10 0 0 1 0 20h-7" fill="none" stroke="#9DB592" stroke-width="6"/>
          <rect x="22" y="100" width="76" height="6" rx="3" fill="#DCE6D5"/><text x="60" y="78" text-anchor="middle" font-family="Anton" font-size="18" fill="#1F2B1B">8PM</text></svg>
        <b>Todavía está vacío</b><p>Sumá algo de la carta, el menú de hoy, bocados para tu lunch o una torta.</p>
        <div class="vacio-atajos"><a href="#hoy">🍽️ Menú de hoy</a><a href="#carta">☕ Carta</a><a href="#lunch">🥪 Lunch</a><a href="#postres">🎂 Tortas</a></div></div>`;
      $$(".vacio-atajos a", lista).forEach((a) => a.addEventListener("click", () => abrir(false)));
    } else {
      lista.innerHTML = GRUPOS.map(([t, titulo, ico]) => {
        const ls = pedido.map((l, i) => [l, i]).filter(([l]) => l.id.startsWith(t + ":"));
        if (!ls.length) return "";
        return `<p class="cj-grupo">${titulo}</p>` + ls.map(([l, i]) => {
          const min = l.min || 1, ultimo = l.cant - (l.paso || 1) < min;
          const foto = l.foto ? `<img class="cj-foto ${t === "p" ? "redonda" : ""}" src="${esc(l.foto)}" alt="">` : `<span class="cj-foto">${ico}</span>`;
          const det = t === "b" ? `${l.cant} unidades · ${plata(l.precio)} c/u` : t === "k" ? "Combo armado" : l.detalle || plata(l.precio) + " c/u";
          return `<div class="cj-item ${l.id === ultimoAgregado ? "nuevo" : ""}" data-i="${i}">${foto}
            <div class="cj-info"><b>${esc(l.nombre)}</b><small>${esc(det)}</small><strong>${plata(l.precio * l.cant)}</strong></div>
            <div class="cj-paso"><button data-a="1" aria-label="Sumar">+</button><output>${t === "b" ? l.cant : l.cant}</output>
            <button data-a="-1" class="${ultimo ? "tacho" : ""}" aria-label="${ultimo ? "Quitar" : "Restar"}">${ultimo ? "🗑" : "−"}</button></div></div>`;
        }).join("");
      }).join("");
      ultimoAgregado = null;
      $$(".cj-item", lista).forEach((el) => $$("button", el).forEach((b) => b.addEventListener("click", () => {
        const i = +el.dataset.i, l = pedido[i];
        const p = l.paso || 1, min = l.min || 1;
        if (b.dataset.a === "1") l.cant += p;
        else if (l.cant - p < min) {
          el.classList.add("sale");
          setTimeout(() => { pedido.splice(pedido.indexOf(l), 1); guardar(); }, 320);
          return;
        } else l.cant -= p;
        guardar();
        const o = $(`.cj-item[data-i="${i}"] output`); if (o) o.classList.add("pop");
      })));
    }
    pintarSugerencia();
    /* fecha mínima: tortas con 3 días */
    const f = form.fecha;
    const min = new Date(); min.setDate(min.getDate() + (hayPostre ? 3 : 0));
    f.min = fechaISO(min);
    if (!f.value || f.value < f.min) f.value = f.min;
    pintarDias();
    const aviso = $("#notaFecha");
    aviso.textContent = hayPostre ? "🎂 Las tortas se encargan con 3 días de anticipación y se confirman con 50% de seña."
      : hayEncargo ? "🥪 El lunch se confirma con 50% de seña. Cuanto antes nos avises, mejor." : "";
    aviso.hidden = !aviso.textContent;
  }

  /* Si no lleva nada para tomar, sugiere un café */
  function pintarSugerencia() {
    const caja = $("#cjSuge");
    const cafe = ((D && D.carta) || []).find((c) => /cafeter/i.test(c.cat));
    const sug = cafe && cafe.items.find((it) => /capuch/i.test(it.n) && !it.oculto);
    const tieneBebida = pedido.some((l) => l.id.startsWith("c:" + slug(cafe ? cafe.cat : "")) || l.id.includes(":completo"));
    if (!pedido.length || !sug || tieneBebida) { caja.hidden = true; return; }
    caja.hidden = false;
    caja.innerHTML = `<span>☕</span><p><b>¿Le sumás un ${esc(sug.n.toLowerCase())}?</b>Recién hecho, ${plata(sug.p)}</p><button>+ Sumar</button>`;
    $("button", caja).addEventListener("click", () => agregar({ id: "c:" + slug(cafe.cat + "-" + sug.n), nombre: sug.n, precio: sug.p, cant: 1, paso: 1, min: 1 }));
  }

  /* Botones de días: hoy, mañana y los próximos */
  const fechaISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  function pintarDias() {
    const caja = $("#cjDias"), f = form.fecha;
    const hoy = new Date(); let html = "";
    for (let i = 0; i < 8; i++) {
      const d = new Date(hoy); d.setDate(hoy.getDate() + i);
      const iso = fechaISO(d), cerrado = !(D && D.horarios[d.getDay()] && D.horarios[d.getDay()].abre);
      const nombre = i === 0 ? "Hoy" : i === 1 ? "Mañana" : d.toLocaleDateString("es-UY", { weekday: "short" }).replace(".", "");
      html += `<button type="button" data-f="${iso}" class="${iso === f.value ? "on" : ""}" ${iso < f.min || cerrado ? "disabled" : ""}><small>${nombre}</small><b>${d.getDate()}</b></button>`;
    }
    caja.innerHTML = html;
    $$("button", caja).forEach((b) => b.addEventListener("click", () => { f.value = b.dataset.f; pintarDias(); }));
  }

  /* ---------- Pasos del cajón ---------- */
  const cajon = $("#cajon"), velo = $("#velo"), form = $("#formPedido");
  let paso = 0;
  const ICO_WA = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.4-.7-2.8-1.1-4.6-4-4.8-4.2-.1-.2-1.1-1.5-1.1-2.9 0-1.4.7-2 1-2.3.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.7-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.2 1.3Z"/></svg>`;
  function irA(n) {
    paso = n;
    cajon.dataset.paso = n;
    $$(".cj-pasos li").forEach((li, i) => { li.classList.toggle("on", i === n); li.classList.toggle("hecho", i < n); });
    const sig = $("#cjSig");
    if (n === 0) { sig.className = "cj-sig"; sig.innerHTML = "Continuar <span>→</span>"; sig.disabled = !pedido.length; }
    if (n === 1) { sig.className = "cj-sig wa"; sig.innerHTML = ICO_WA + "Enviar por WhatsApp"; sig.disabled = false; setTimeout(() => form.nombre.focus({ preventScroll: true }), 450); }
    $$(".cj-v")[n].scrollTop = 0;
  }
  $("#cjSig").addEventListener("click", () => { if (paso === 0) irA(1); else if (paso === 1) enviar(); });
  $$("[data-ir]").forEach((b) => b.addEventListener("click", () => irA(+b.dataset.ir)));
  $("#cjOtro").addEventListener("click", () => irA(0));

  function abrir(on) {
    cajon.classList.toggle("on", on); velo.classList.toggle("on", on); cajon.setAttribute("aria-hidden", !on);
    document.body.style.overflow = on ? "hidden" : "";
    if (on && paso === 2) irA(0);
  }
  $("#abrirPedido").addEventListener("click", () => abrir(true));
  $("#cerrarPedido").addEventListener("click", () => abrir(false));
  velo.addEventListener("click", () => abrir(false));
  addEventListener("keydown", (e) => { if (e.key === "Escape") abrir(false); });

  $$("input[name=entrega]", form).forEach((r) => r.addEventListener("change", () => {
    $("#cjDir").hidden = !form.entrega.value.startsWith("Envío");
  }));
  form.addEventListener("submit", (e) => { e.preventDefault(); enviar(); });
  form.fecha.addEventListener("change", pintarDias);

  function marcarError(input) {
    const c = input.closest(".cj-campo"); c.classList.remove("error"); void c.offsetWidth; c.classList.add("error");
    input.focus(); setTimeout(() => c.classList.remove("error"), 1500);
  }

  function enviar() {
    if (!pedido.length) { irA(0); return; }
    const f = Object.fromEntries(new FormData(form));
    if (!f.nombre.trim()) { marcarError(form.nombre); toast("Decinos tu nombre"); return; }
    const envio = f.entrega.startsWith("Envío");
    if (envio && !f.direccion.trim()) { marcarError(form.direccion); toast("Falta la dirección"); return; }
    const ahora = new Date();
    const numero = `8PM-${String(ahora.getMonth() + 1).padStart(2, "0")}${String(ahora.getDate()).padStart(2, "0")}-${String(Math.floor(Math.random() * 900) + 100)}`;
    const fecha = f.fecha ? new Date(f.fecha + "T12:00").toLocaleDateString("es-UY", { weekday: "long", day: "numeric", month: "long" }) : "";
    const tot = total(), hayEncargo = pedido.some((l) => l.encargo);
    const lineas = pedido.map((l) => `• ${l.cant} × ${l.nombre}${l.detalle && !l.id.startsWith("k:") && !l.id.startsWith("b:") ? ` (${l.detalle})` : ""} — ${plata(l.precio * l.cant)}`);
    const texto = [`¡Hola 8PM! Soy ${f.nombre.trim()}, quiero hacer este pedido (N° ${numero}):`, "", ...lineas, "", `*Total estimado: ${plata(tot)}*`,
      hayEncargo ? `Seña 50%: ${plata(tot / 2)}` : null, "", `${f.entrega}${envio ? ": " + f.direccion : ""}`, `Para el ${fecha}${f.hora ? " a las " + f.hora : ""}`,
      f.telefono ? "Mi celular: " + f.telefono : null, f.nota ? "Nota: " + f.nota : null].filter((x) => x !== null).join("\n");
    const url = waLink(texto);
    window.open(url, "_blank");

    ultimoPedido = { numero, emitido: ahora, cliente: f.nombre.trim(), telefono: f.telefono || "", entrega: f.entrega, direccion: envio ? f.direccion : "",
      fecha, hora: f.hora, nota: f.nota || "", items: pedido.map((l) => Object.assign({}, l)), total: tot, sena: hayEncargo ? tot / 2 : 0 };
    registrarPedido({ numero, nombre: ultimoPedido.cliente, telefono: ultimoPedido.telefono, entrega: f.entrega, direccion: ultimoPedido.direccion,
      fecha: f.fecha, hora: f.hora, nota: ultimoPedido.nota, detalle: lineas.join("\n"), total: tot });

    $("#cjNum").textContent = "Pedido N° " + numero;
    $("#cjSenaTxt").textContent = hayEncargo ? ` y pasarte los datos para la seña de ${plata(tot / 2)}` : "";
    $("#cjWaOtra").href = url;
    irA(2);
    pedido = []; guardar();
    descargarComprobante();
  }
  $("#cjPdf").addEventListener("click", descargarComprobante);

  /* ---------- Comprobante en PDF con el diseño de 8PM ---------- */
  let cargaPdf;
  function libPdf() {
    if (window.html2pdf) return Promise.resolve();
    return cargaPdf || (cargaPdf = new Promise((ok, mal) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
      s.onload = ok; s.onerror = () => { cargaPdf = null; mal(); };
      document.head.appendChild(s);
    }));
  }
  async function descargarComprobante() {
    const p = ultimoPedido;
    if (!p) return;
    const btn = $("#cjPdf");
    btn.classList.add("cargando"); btn.lastChild.textContent = "Armando el comprobante…";
    const comp = $("#comp");
    const em = p.emitido.toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit", year: "numeric" });
    const hs = p.emitido.toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit", hour12: false });
    comp.innerHTML = `
      <div class="comp-cab"><img src="img/logo.png" alt=""><div><div class="k">Comprobante de pedido</div><h1>Pedido <em>${esc(p.numero)}</em></h1></div>
        <div class="fecha">Emitido<b>${em}</b>${hs} hs</div></div>
      <div class="comp-datos">
        <div><span>Cliente</span><b>${esc(p.cliente)}</b><small>${esc(p.telefono)}</small></div>
        <div><span>Entrega</span><b>${esc(p.entrega)}</b><small>${esc(p.direccion || "Porongos 2930")}</small></div>
        <div><span>Para el</span><b>${esc(p.fecha)}</b><small>${p.hora ? esc(p.hora) + " hs" : ""}</small></div>
        <div><span>Estado</span><b>A confirmar</b><small>por WhatsApp</small></div>
      </div>
      <table class="comp-tabla"><thead><tr><th>Producto</th><th class="n">Cant.</th><th class="n">Precio</th><th class="n">Subtotal</th></tr></thead><tbody>
        ${p.items.map((l) => `<tr><td><b>${esc(l.nombre)}</b>${l.detalle && !l.id.startsWith("b:") ? `<small>${esc(l.detalle.length > 110 ? l.detalle.slice(0, 110) + "…" : l.detalle)}</small>` : ""}</td>
          <td class="n">${l.cant}</td><td class="n">${plata(l.precio)}</td><td class="n"><b>${plata(l.precio * l.cant)}</b></td></tr>`).join("")}
      </tbody></table>
      <div class="comp-tots">
        <div class="comp-cond"><b>Para tener en cuenta</b>${p.nota ? `Nota: ${esc(p.nota)}<br><br>` : ""}
          ${p.sena ? "Los encargos de lunch y tortas se confirman con una seña del 50% (transferencia o tarjeta). " : ""}Precios de mostrador; si necesitás factura con RUT se agrega el 22% de IVA. Este comprobante no es una factura fiscal.</div>
        <div class="comp-caja-tot">
          <div><span>Subtotal</span><span>${plata(p.total)}</span></div>
          ${p.sena ? `<div class="sena"><span>Seña 50% para confirmar</span><b>${plata(p.sena)}</b></div><div><span>Saldo al recibir</span><span>${plata(p.total - p.sena)}</span></div>` : ""}
          <div class="grande"><span>Total</span><b>${plata(p.total)}</b></div>
        </div>
      </div>
      <div class="comp-pie"><p class="gracias">Gracias por <em>elegirnos</em></p><p>Porongos 2930, Montevideo<br>WhatsApp ${esc(C.TELEFONO)} · @8pmcoffeetime</p></div>`;
    try {
      await libPdf();
      await document.fonts.ready;
      await Promise.all([...comp.querySelectorAll("img")].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; })));
      await html2pdf().set({ margin: 0, filename: `Pedido-${p.numero}.pdf`, image: { type: "jpeg", quality: .95 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#F5F1E8" }, jsPDF: { unit: "px", format: [794, 1123], orientation: "portrait", hotfixes: ["px_scaling"] } }).from(comp).save();
      toast("Comprobante descargado ✓");
    } catch (e) {
      toast("No pudimos armar el PDF. Probá de nuevo.");
    }
    btn.classList.remove("cargando"); btn.lastChild.textContent = "Descargar comprobante (PDF)";
  }

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
