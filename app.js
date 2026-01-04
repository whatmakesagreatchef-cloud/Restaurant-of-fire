// Bear Mode — Rubric Tester (no dependencies)

const CUST_CATS = [
  { id:"flow", name:"Ticket Time & Flow" },
  { id:"recovery", name:"Service Recovery" },
  { id:"warmth", name:"Hospitality & Warmth" },
  { id:"trust", name:"Trust & Safety" },
  { id:"value", name:"Value Perception" },
  { id:"identity", name:"Atmosphere & Identity" },
];

const SEGMENTS = {
  locals: {
    name: "Locals",
    weights: { flow:15, recovery:15, warmth:20, trust:15, value:25, identity:10 }
  },
  families: {
    name: "Families",
    weights: { flow:30, recovery:15, warmth:15, trust:15, value:20, identity:5 }
  },
  foodies: {
    name: "Foodies",
    weights: { flow:15, recovery:15, warmth:10, trust:15, value:5, identity:40 }
  },
  highend: {
    name: "High-end / Star Chasers",
    weights: { flow:15, recovery:20, warmth:10, trust:30, value:5, identity:20 }
  },
  corporate: {
    name: "Corporate",
    weights: { flow:30, recovery:20, warmth:10, trust:15, value:15, identity:10 }
  },
  tourists: {
    name: "Tourists",
    weights: { flow:20, recovery:15, warmth:10, trust:10, value:10, identity:35 }
  }
};

const FLAV_CATS = [
  "Seasoning Accuracy","Balance","Umami & Depth","Aroma & Top Notes","Texture Contrast",
  "Temperature & Timing","Ingredient Expression","Technical Execution","Finish & Aftertaste","Distinctiveness"
];

const DEFAULTS = {
  customer: { flow:3, recovery:3, warmth:3, trust:3, value:3, identity:3 },
  segmentKey: "locals",
  sendBack: 2,
  coldPlate: 3,
  dishes: []
};

const $ = (id) => document.getElementById(id);
const clamp = (n,a,b) => Math.max(a, Math.min(b,n));
const round = (n,d=2) => Math.round(n*(10**d))/(10**d);

let state = loadState() ?? structuredClone(DEFAULTS);

function saveState(){ localStorage.setItem("bearRubricTester", JSON.stringify(state)); }
function loadState(){
  try{
    const raw = localStorage.getItem("bearRubricTester");
    return raw ? JSON.parse(raw) : null;
  }catch{ return null; }
}

function init(){
  // Build customer form
  const form = $("custForm");
  form.innerHTML = "";
  for(const c of CUST_CATS){
    const label = document.createElement("label");
    label.textContent = c.name + " (1–5)";
    const input = document.createElement("input");
    input.type = "number";
    input.min = "1";
    input.max = "5";
    input.step = "1";
    input.value = state.customer[c.id] ?? 3;
    input.addEventListener("input", () => {
      state.customer[c.id] = clamp(parseInt(input.value||"3",10),1,5);
      saveState(); render();
    });
    label.appendChild(input);
    form.appendChild(label);
  }

  // Segment selector
  const sel = $("segmentSel");
  sel.innerHTML = "";
  for(const [key, seg] of Object.entries(SEGMENTS)){
    const opt = document.createElement("option");
    opt.value = key; opt.textContent = seg.name;
    if(key === state.segmentKey) opt.selected = true;
    sel.appendChild(opt);
  }
  sel.addEventListener("change", () => {
    state.segmentKey = sel.value;
    saveState(); render();
  });

  // Rates
  $("sendBack").value = state.sendBack ?? 2;
  $("coldPlate").value = state.coldPlate ?? 3;

  $("sendBack").addEventListener("input", () => { state.sendBack = clamp(parseFloat($("sendBack").value||"0"),0,100); saveState(); render(); });
  $("coldPlate").addEventListener("input", () => { state.coldPlate = clamp(parseFloat($("coldPlate").value||"0"),0,100); saveState(); render(); });

  // Dish add
  $("btnAddDish").addEventListener("click", () => {
    const name = $("dishName").value.trim();
    if(!name) return;
    const sales = clamp(parseFloat($("dishSales").value||"0"),0,100);
    const dish = {
      id: crypto.randomUUID(),
      name,
      sales,
      scores: Object.fromEntries(FLAV_CATS.map((_,i)=>[i,7]))
    };
    state.dishes.push(dish);
    $("dishName").value = "";
    saveState(); render();
  });

  $("btnClear").addEventListener("click", () => {
    if(!confirm("Clear everything?")) return;
    state = structuredClone(DEFAULTS);
    saveState(); init(); render();
  });

  $("btnExport").addEventListener("click", () => {
    const payload = computeExport();
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bear_rubric_test_export.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  $("btnSample").addEventListener("click", () => {
    state = structuredClone(DEFAULTS);
    state.customer = { flow:4, recovery:4, warmth:3, trust:4, value:3, identity:4 };
    state.segmentKey = "foodies";
    state.sendBack = 2.5;
    state.coldPlate = 3.0;
    state.dishes = [
      mkDish("Fish + beurre noisette", 28, [8,8,8,7,7,7,8,7,8,8]),
      mkDish("Pasta ragù", 22, [7,7,7,6,7,7,7,7,7,6]),
      mkDish("Beef sandwich", 18, [7,6,6,6,7,7,6,7,7,5]),
      mkDish("House salad", 12, [6,7,5,7,6,6,7,6,6,5]),
      mkDish("Chocolate cake", 20, [7,7,6,7,7,7,7,7,7,6]),
    ];
    saveState(); init(); render();
  });

  render();
}

function mkDish(name, sales, arr){
  const d = { id: crypto.randomUUID(), name, sales, scores:{} };
  arr.forEach((v,i)=> d.scores[i] = clamp(v,1,10));
  return d;
}

function customerTotal(){
  let sum = 0;
  for(const c of CUST_CATS) sum += (state.customer[c.id] ?? 3);
  return sum; // out of 30
}

function bandFor(total){
  if(total >= 26) return { label:"Evangelists (loyalty up, WOM surge, high review chance)", badge:"26–30" };
  if(total >= 20) return { label:"Happy Repeat (loyalty up, steady demand)", badge:"20–25" };
  if(total >= 14) return { label:"Neutral Drift (stable/slight down)", badge:"14–19" };
  if(total >= 8)  return { label:"Churn Risk (demand down, negative review chance)", badge:"8–13" };
  return { label:"Reputation Hit (trust shock + churn)", badge:"6–7" };
}

function to0100(v15){
  // 1..5 -> 0..100 linear
  return ((clamp(v15,1,5)-1)/4)*100;
}

function segmentScore(){
  const seg = SEGMENTS[state.segmentKey] ?? SEGMENTS.locals;
  let totalW = 0;
  let score = 0;
  for(const c of CUST_CATS){
    const w = seg.weights[c.id] ?? 0;
    totalW += w;
    score += w * to0100(state.customer[c.id] ?? 3);
  }
  return totalW > 0 ? (score/totalW) : 0;
}

function retentionAndReviews(segScore){
  const retentionDelta = (segScore - 60) * 0.004; // default tuning
  let reviewChance = 0.02; // base 2%
  if(segScore >= 75) reviewChance += (segScore - 75) * 0.006; // up to ~17% at 100
  reviewChance = clamp(reviewChance, 0.01, 0.25);

  const churnRisk = segScore < 45 ? clamp((45 - segScore) / 45, 0, 1) : 0;
  return { retentionDelta, reviewChance, churnRisk };
}

function dishAvg(dish){
  let sum = 0;
  for(let i=0;i<FLAV_CATS.length;i++){
    sum += clamp(parseFloat(dish.scores[i] ?? 7),1,10);
  }
  return sum / FLAV_CATS.length;
}

function foodQualityIndex(){
  if(state.dishes.length === 0) return { fqi:null, top3:[] };
  const sorted = [...state.dishes].sort((a,b)=> (b.sales||0) - (a.sales||0));
  const top3 = sorted.slice(0,3);
  const avgTop3 = top3.reduce((acc,d)=> acc + dishAvg(d), 0) / top3.length;

  const sb = clamp(state.sendBack ?? 0, 0, 100);
  const cp = clamp(state.coldPlate ?? 0, 0, 100);
  const fqi = avgTop3 - (0.5 * sb) - (0.2 * cp);
  return { fqi, top3, avgTop3 };
}

function renderDishes(){
  const wrap = $("dishTable");
  if(state.dishes.length === 0){
    wrap.innerHTML = '<div class="small">No dishes yet. Add one above.</div>';
    return;
  }

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const trh = document.createElement("tr");
  ["Dish","Sales %","Avg","Edit scores (1–10)",""].forEach(t=>{
    const th=document.createElement("th"); th.textContent=t; trh.appendChild(th);
  });
  thead.appendChild(trh);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  for(const dish of state.dishes){
    const tr = document.createElement("tr");

    const tdName = document.createElement("td");
    tdName.innerHTML = `<b>${escapeHtml(dish.name)}</b><div class="small">${FLAV_CATS.length} flavour categories</div>`;
    tr.appendChild(tdName);

    const tdSales = document.createElement("td");
    const inSales = document.createElement("input");
    inSales.type="number"; inSales.min="0"; inSales.max="100"; inSales.step="1";
    inSales.value = dish.sales ?? 0;
    inSales.addEventListener("input", ()=>{
      dish.sales = clamp(parseFloat(inSales.value||"0"),0,100);
      saveState(); render();
    });
    tdSales.appendChild(inSales);
    tr.appendChild(tdSales);

    const tdAvg = document.createElement("td");
    tdAvg.textContent = round(dishAvg(dish),2).toString();
    tr.appendChild(tdAvg);

    const tdScores = document.createElement("td");
    tdScores.appendChild(scoresGrid(dish));
    tr.appendChild(tdScores);

    const tdDel = document.createElement("td");
    const btn = document.createElement("button");
    btn.textContent = "Delete";
    btn.className = "danger";
    btn.addEventListener("click", ()=>{
      if(!confirm("Delete dish?")) return;
      state.dishes = state.dishes.filter(d=>d.id !== dish.id);
      saveState(); render();
    });
    tdDel.appendChild(btn);
    tr.appendChild(tdDel);

    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  wrap.innerHTML = "";
  wrap.appendChild(table);
}

function scoresGrid(dish){
  const container = document.createElement("div");
  container.style.display = "grid";
  container.style.gridTemplateColumns = "repeat(2, minmax(0, 1fr))";
  container.style.gap = "8px 12px";

  FLAV_CATS.forEach((name,i)=>{
    const label = document.createElement("label");
    label.textContent = name;
    const inp = document.createElement("input");
    inp.type="number"; inp.min="1"; inp.max="10"; inp.step="1";
    inp.value = dish.scores[i] ?? 7;
    inp.addEventListener("input", ()=>{
      dish.scores[i] = clamp(parseInt(inp.value||"7",10),1,10);
      saveState(); render();
    });
    label.appendChild(inp);
    container.appendChild(label);
  });

  return container;
}

function render(){
  // Customer totals
  const total = customerTotal();
  $("custTotal").innerHTML = `${total} <span class="badge">/30</span>`;
  const band = bandFor(total);
  $("custBand").textContent = `${band.badge}: ${band.label}`;

  // Segment weights
  const seg = SEGMENTS[state.segmentKey] ?? SEGMENTS.locals;
  const weights = CUST_CATS.map(c => `${c.name}: ${seg.weights[c.id] ?? 0}%`).join("<br/>");
  $("segmentWeights").innerHTML = weights;

  // Segment score
  const sScore = segmentScore();
  $("segScore").innerHTML = `${round(sScore,1)} <span class="badge">/100</span>`;

  const { retentionDelta, reviewChance, churnRisk } = retentionAndReviews(sScore);
  $("segDetails").innerHTML = `Converted 1–5 → 0–100, then weighted by segment preferences.`;
  $("retention").innerHTML = `<b>Retention Δ:</b> ${retentionDelta>=0?"+":""}${round(retentionDelta,3)} (e.g., +0.02 = +2%)`;
  $("reviews").innerHTML = `<b>Review chance:</b> ${round(reviewChance*100,1)}% &nbsp; | &nbsp; <b>Churn risk:</b> ${round(churnRisk*100,1)}%`;

  // Food Quality Index
  const { fqi, top3, avgTop3 } = foodQualityIndex();
  if(fqi === null){
    $("fqi").textContent = "—";
    $("fqiDetails").textContent = "Add dishes to compute.";
  }else{
    $("fqi").textContent = round(fqi,2).toString();
    const names = top3.map(d => `${d.name} (${round(dishAvg(d),2)})`).join(", ");
    $("fqiDetails").textContent = `Avg top 3: ${round(avgTop3,2)} | Top 3: ${names}`;
  }

  renderDishes();
}

function computeExport(){
  return {
    exportedAt: new Date().toISOString(),
    customerRubric: state.customer,
    customerTotal: customerTotal(),
    segment: { key: state.segmentKey, name: (SEGMENTS[state.segmentKey]?.name ?? "Locals"), score0100: round(segmentScore(),2) },
    rates: { sendBackPct: state.sendBack ?? 0, coldPlatePct: state.coldPlate ?? 0 },
    foodQualityIndex: (() => {
      const r = foodQualityIndex();
      return r.fqi === null ? null : {
        fqi: round(r.fqi,2),
        avgTop3: round(r.avgTop3,2),
        top3: r.top3.map(d => ({ name:d.name, salesPct:d.sales, avg:round(dishAvg(d),2) }))
      };
    })(),
    dishes: state.dishes.map(d => ({
      name: d.name,
      salesPct: d.sales,
      avg: round(dishAvg(d),2),
      scores: FLAV_CATS.map((n,i) => ({ category:n, score: d.scores[i] }))
    }))
  };
}

function escapeHtml(s){
  return s.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
}

init();
