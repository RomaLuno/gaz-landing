/* Общий скрипт сайта. Цена и скидки подставляются при сборке (site.json), здесь их нет. */

/* ==== Метки источника: utm и реферер живут до конца визита, уходят с заявкой ==== */
(function(){
  const KEYS = ["utm_source","utm_medium","utm_campaign","utm_content","utm_term","yclid"];
  let src = {};
  try { src = JSON.parse(sessionStorage.getItem("src") || "{}"); } catch(e) {}
  const qs = new URLSearchParams(location.search);
  if (KEYS.some(k => qs.get(k))) { src = {}; KEYS.forEach(k => { if (qs.get(k)) src[k] = qs.get(k); }); }
  if (!src.ref) src.ref = document.referrer || "прямой заход";
  if (!src.landing) src.landing = location.pathname;
  try { sessionStorage.setItem("src", JSON.stringify(src)); } catch(e) {}
  window.LEAD_SRC = src;
})();

/* ==== Кейсы: увеличение ==== */
(function(){
  const d = document.getElementById("zoom"), im = document.getElementById("zoom-img");
  if (!d) return;
  document.querySelectorAll(".case-open").forEach(b => b.addEventListener("click", () => {
    im.src = b.dataset.src; im.alt = b.querySelector("img").alt;
    if (d.showModal) d.showModal();
  }));
  d.addEventListener("click", e => { if (e.target === d) d.close(); });
})();

/* ==== Проверка участка ==== */
(function(){
  const root = document.getElementById("quiz"), data = document.getElementById("quiz-data");
  if (!root || !data) return;
  const Q = JSON.parse(data.textContent);
  const keys = ["geo","legal","distance","refusal"];
  let ans = [];
  const el = (t, c, txt) => { const n = document.createElement(t); if (c) n.className = c; if (txt != null) n.textContent = txt; return n; };
  function progress(i){
    const p = el("div","q-progress");
    for (let k=0;k<Q.q.length;k++){ const s = el("span"); if (k<i) s.className="on"; p.append(s); }
    return p;
  }
  function ask(i){
    root.innerHTML = "";
    const q = Q.q[i];
    const card = el("div","q-card");
    card.append(el("span","q-num",`Вопрос ${i+1} из ${Q.q.length}`), el("p","q-text",q.q));
    const opts = el("div","opts");
    const add = (label, v) => { const b = el("button","opt",label); b.type="button"; b.id=`q${i}-${v}`; b.onclick=()=>answer(i,v); opts.append(b); };
    add(q.yes,"yes"); add(q.no,"no"); if (q.unsure) add(q.unsure,"unsure");
    card.append(opts);
    root.append(progress(i), card);
  }
  function answer(i, v){
    ans[i] = v;
    if (v === "no" && i < 3) return result("no", keys[i]);
    if (i < Q.q.length - 1) return ask(i+1);
    if (ans[3] === "no") return result("noref");
    if (ans[2] === "unsure") return result("maybe");
    result("ok");
  }
  function result(kind, reason){
    root.innerHTML = "";
    const r = el("div","result"); r.dataset.kind = kind;
    let title, text;
    if (kind === "no") { title = Q.no[0]; text = (Q.reasons[reason] || "") + " " + Q.no[1]; }
    else if (kind === "noref") { title = Q.noref_title || Q.maybe[0]; text = Q.noref; }
    else { title = Q[kind][0]; text = Q[kind][1]; }
    r.append(el("h3",null,title), el("p",null,text.trim()));
    const acts = el("div","r-acts");
    if (kind === "ok" || kind === "maybe" || kind === "noref") {
      const a = el("a","btn btn-pipe","Оставить заявку"); a.href = "#form"; acts.append(a);
      const b = document.getElementById("q-badge");
      const msg = kind === "ok" ? "Проверка участка: подходит по всем пунктам" : "Проверка участка: расстояние до газопровода уточним";
      if (b) { b.textContent = msg; b.hidden = false; }
      document.querySelectorAll('input[name="quiz"]').forEach(i => i.value = msg);
    }
    const again = el("button","linkbtn","Пройти заново"); again.type="button"; again.onclick=()=>{ans=[];ask(0)};
    acts.append(again); r.append(acts);
    root.append(progress(Q.q.length), r);
  }
  ask(0);
})();

/* ==== Формы: на странице и во всплывающем окне. Адрес приёма — data-endpoint (site.json) ==== */
function wireForm(formId, p){
  const f = document.getElementById(formId);
  if (!f) return;
  const tgRadio = document.getElementById(p + "via-tg"), tgWrap = document.getElementById(p + "tg-wrap"), tgIn = document.getElementById(p + "tg");
  f.querySelectorAll('input[name="via"]').forEach(r => r.addEventListener("change", () => {
    tgWrap.hidden = !tgRadio.checked;
    if (tgRadio.checked) tgIn.focus();
  }));
  f.addEventListener("submit", e => {
    e.preventDefault();
    const ok = f.name.value.trim() && f.phone.value.replace(/\D/g,"").length >= 10
      && document.getElementById(p + "ok").checked && (!tgRadio.checked || tgIn.value.trim());
    document.getElementById(p + "err").hidden = !!ok;
    if (!ok) return;
    f.src.value = JSON.stringify(window.LEAD_SRC || {});
    const done = () => { f.hidden = true; document.getElementById(p + "done").hidden = false; };
    const url = f.dataset.endpoint;
    if (!url) return done();
    fetch(url, {method: "POST", body: new FormData(f)}).then(done, done);
    if (window.ym && f.dataset.goal) window.ym(+f.dataset.ym, "reachGoal", f.dataset.goal);
  });
}
wireForm("lead", "f-");
wireForm("lead2", "m-");

/* ==== Липкая кнопка: всегда видна, прячется, когда на экране основная форма ==== */
(function(){
  const modal = document.getElementById("lead-modal"), sticky = document.getElementById("sticky");
  document.querySelectorAll("[data-open-lead]").forEach(b => b.addEventListener("click", e => {
    e.preventDefault();
    if (modal.showModal) modal.showModal(); else location.hash = "#form";
  }));
  modal.querySelector("[data-close-lead]").addEventListener("click", () => modal.close());
  modal.addEventListener("click", e => { if (e.target === modal) modal.close(); });
  const form = document.getElementById("form");
  if (form && "IntersectionObserver" in window) {
    new IntersectionObserver(es => es.forEach(en => sticky.classList.toggle("away", en.isIntersecting)), {threshold: .25})
      .observe(form);
  }
})();

/* карта проектов: годы по очереди, когда блок виден; клик по году; параллакс картинки */
(() => {
  const map = document.querySelector("[data-map]"); if (!map) return;
  const pts = [...map.querySelectorAll(".map-pt")], rows = [...map.querySelectorAll(".map-years li")];
  const years = rows.map(r => +r.querySelector("button").dataset.year), cnt = map.querySelector("[data-map-count]");
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const show = y => {
    pts.forEach(p => { p.classList.toggle("on", +p.dataset.year <= y); p.classList.toggle("now", +p.dataset.year === y); });
    rows.forEach((r, i) => { r.classList.toggle("on", years[i] <= y); r.classList.toggle("now", years[i] === y); });
    cnt.textContent = pts.filter(p => +p.dataset.year <= y).length;
  };
  let timer;
  const play = () => { let i = 0; clearInterval(timer); show(years[0]);
    timer = setInterval(() => { if (++i >= years.length) return clearInterval(timer); show(years[i]); }, 750); };
  rows.forEach((r, i) => r.querySelector("button").addEventListener("click", () => { clearInterval(timer); show(years[i]); }));
  if (still || !("IntersectionObserver" in window)) { show(years[years.length - 1]); return; }
  show(0);
  const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { play(); io.disconnect(); } }), {threshold: .4});
  io.observe(map);
  const img = map.querySelector(".map-img"), frame = map.querySelector(".map-frame");
  let tick = false;
  addEventListener("scroll", () => { if (tick) return; tick = true; requestAnimationFrame(() => {
    const r = frame.getBoundingClientRect(), k = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
    img.style.transform = `translateY(${Math.max(-1, Math.min(1, k)) * -4.5 - 4.5}%)`; tick = false; }); }, {passive: true});
})();

/* труба вдоль страницы: ответвление от магистрали в hero, растёт со скроллом, кончается у формы заявки */
(() => {
  const main = document.querySelector(".pipe-main"), form = document.getElementById("form");
  if (!main || !form) return;
  const run = document.createElement("div"); run.className = "pipe-run"; run.setAttribute("aria-hidden", "true");
  document.body.appendChild(run); document.body.style.position = "relative";
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let tick = false;
  const draw = () => {
    const y0 = main.getBoundingClientRect().bottom + scrollY - 2, end = form.getBoundingClientRect().top + scrollY + 40;
    const full = end - y0, h = still ? full : Math.min(full, Math.max(0, scrollY + innerHeight * .7 - y0));
    run.style.top = y0 + "px"; run.style.height = h + "px"; run.classList.toggle("done", h >= full - 1); tick = false;
  };
  addEventListener("scroll", () => { if (!tick) { tick = true; requestAnimationFrame(draw); } }, {passive: true});
  addEventListener("resize", draw); addEventListener("load", draw); draw();
})();
