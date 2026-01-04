import {
  defaultState, newSeason, createRestaurant, listCityNeighbourhoods, getNeighbourhood,
  planDefaults, runService, advanceService, computeLeaderboards,
  listDishLibrary, listTemplates, listComponents, listTechniques,
  listPriorities, listPrepLevels, listManagerMoves, listCalls,
  listDiningTypes, listStyles, scoutRival, poachFromRival, createSignatureDish, TUNING
} from './engine.js';

const $ = (id)=>document.getElementById(id);
const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
const round = (n,d=2)=>Math.round(n*(10**d))/(10**d);

let state = load() || defaultState();
let plan = planDefaults();

function save(){ localStorage.setItem("bearModeSave", JSON.stringify(state)); }
function load(){
  try{ const raw = localStorage.getItem("bearModeSave"); return raw?JSON.parse(raw):null; }catch{ return null; }
}

function reset(){
  if(!confirm("Reset everything?")) return;
  localStorage.removeItem("bearModeSave");
  state = defaultState();
  plan = planDefaults();
  renderAll();
}

function setTab(tab){
  for(const b of document.querySelectorAll(".tab")){
    b.classList.toggle("active", b.dataset.tab===tab);
  }
  for(const p of document.querySelectorAll(".tabpane")){
    p.classList.add("hidden");
  }
  $("tab-"+tab).classList.remove("hidden");
}

function initUI(){
  for(const b of document.querySelectorAll(".tab")){
    b.addEventListener("click", ()=>{ setTab(b.dataset.tab); renderAll(); });
  }
  $("btnSave").addEventListener("click", ()=>{ save(); alert("Saved."); });
  $("btnLoad").addEventListener("click", ()=>{ const s=load(); if(s){ state=s; plan=planDefaults(); renderAll(); } });
  $("btnReset").addEventListener("click", reset);
  $("btnNewSeason").addEventListener("click", ()=>{
    const city = prompt("City for next Season (e.g., Sydney, Melbourne, Seoul):", state.city) || state.city;
    state = newSeason(state, city);
    plan = planDefaults();
    save();
    renderAll();
  });
}

function renderAll(){
  renderOnboarding();
  renderPlay();
  renderRestaurant();
  renderMarket();
  renderRivals();
  renderLeader();
  renderHelp();
}

function renderOnboarding(){
  const box = $("onboarding");
  if(state.player){
    const nh = getNeighbourhood(state, state.player.neighbourhoodId);
    box.innerHTML = `
      <h2>Season ${state.season} — ${state.city}</h2>
      <div class="small">Day ${state.day} • ${state.service} • Neighbourhood: <b>${nh.name}</b></div>
    `;
    return;
  }

  const nhs = listCityNeighbourhoods(state);
  const dining = listDiningTypes();
  const styles = listStyles();

  box.innerHTML = `
    <h2>Create your restaurant</h2>
    <div class="grid2">
      <div class="box">
        <h3>Basics</h3>
        <label>Restaurant name <input id="rName" placeholder="e.g., Corner Kitchen"/></label>
        <label>Dining type
          <select id="rDining">${dining.map(d=>`<option value="${d.id}">${d.name}</option>`).join("")}</select>
        </label>
        <label>Style
          <select id="rStyle">${styles.map(s=>`<option value="${s.id}">${s.name}</option>`).join("")}</select>
        </label>
        <label>Neighbourhood (kingdom)
          <select id="rNh">${nhs.map(n=>`<option value="${n.id}">${n.name}</option>`).join("")}</select>
        </label>
        <button id="btnCreate" class="primary" style="margin-top:10px;">Create</button>
        <div class="small" style="margin-top:10px;">
          Neighbourhood changes rent, demand, critic attention, and starting clientele mix.
        </div>
      </div>

      <div class="box">
        <h3>How it works</h3>
        <div class="small">
          <ul>
            <li>Two services per day: Lunch & Dinner.</li>
            <li>Clientele segments grow/shrink based on satisfaction & retention.</li>
            <li>Rivals exist in the same city: scout them, poach staff, chase stars.</li>
            <li>Weekly Michelin-style inspection (after Dinner) influences stars.</li>
          </ul>
        </div>
      </div>
    </div>
  `;

  $("btnCreate").addEventListener("click", ()=>{
    const cfg = {
      name: $("rName").value.trim() || "My Restaurant",
      diningTypeId: $("rDining").value,
      styleId: $("rStyle").value,
      neighbourhoodId: $("rNh").value
    };
    createRestaurant(state, cfg);
    save();
    renderAll();
  });
}

function renderPlay(){
  const pane = $("tab-play");
  if(!state.player){
    pane.innerHTML = `<h2>Play</h2><div class="small">Create your restaurant above to start.</div>`;
    return;
  }
  const me = state.player;
  const nh = getNeighbourhood(state, me.neighbourhoodId);

  const kpis = [
    ["Cash", round(me.cash*100,0)+"%"],
    ["Consistency", round(me.consistency*100,0)+"%"],
    ["Standards", round(me.standards*100,0)+"%"],
    ["Throughput", round(me.throughput*100,0)+"%"],
    ["Culture", round(me.culture*100,0)+"%"],
    ["Brand", round(me.brand*100,0)+"%"],
  ];

  // planning UI
  const dishes = listDishLibrary();
  const priorities = listPriorities();
  const preps = listPrepLevels();
  const managers = listManagerMoves();
  const calls = listCalls();

  // signatures & R&D
  const sigs = [...(me.signatureDishes||[]), ...(me.rndQueue||[])];

  pane.innerHTML = `
    <h2>Service Planning</h2>
    <div class="kpis">
      ${kpis.map(([l,v])=>`
        <div class="kpi"><div class="label">${l}</div><div class="value">${v}</div></div>
      `).join("")}
    </div>

    <div class="grid2">
      <div class="box">
        <h3>Context</h3>
        <div class="small">
          <b>${state.city}</b> • ${nh.name}<br/>
          Rent: <span class="badge ${nh.rent>1.15?'warn':''}">${round(nh.rent,2)}x</span>
          Demand: <span class="badge">${round(nh.demand,2)}x</span>
          Critic: <span class="badge ${nh.critic>1.15?'warn':''}">${round(nh.critic,2)}x</span>
        </div>
        <div class="small" style="margin-top:10px;">
          Cash Float: <b>$${Math.round(me.cashFloat)}</b> • Stars: <b>${me.stars}</b> • Best Rank: <b>${me.bestRank ?? "—"}</b>
        </div>
        <div class="small" style="margin-top:10px;">
          Debt: Standards <span class="badge ${me.standardsDebt>0.35?'warn':''}">${round(me.standardsDebt,2)}</span>
          Maintenance <span class="badge ${me.maintenanceDebt>0.35?'warn':''}">${round(me.maintenanceDebt,2)}</span>
          Culture <span class="badge ${me.cultureDebt>0.35?'warn':''}">${round(me.cultureDebt,2)}</span>
        </div>
      </div>

      <div class="box">
        <h3>Choose Priority / Prep / Manager Move / Call</h3>
        <label>Priority
          <select id="pPriority">${priorities.map(x=>`<option value="${x.id}" ${plan.priority===x.id?'selected':''}>${x.name}</option>`).join("")}</select>
        </label>
        <label>Prep level
          <select id="pPrep">${preps.map(x=>`<option value="${x.id}" ${plan.prep===x.id?'selected':''}>${x.name}</option>`).join("")}</select>
        </label>
        <label>Manager move (1/service)
          <select id="pManager">${managers.map(x=>`<option value="${x.id}" ${plan.manager===x.id?'selected':''}>${x.name}</option>`).join("")}</select>
        </label>
        <label>Call (1/service)
          <select id="pCall">${calls.map(x=>`<option value="${x.id}" ${plan.call===x.id?'selected':''}>${x.name}</option>`).join("")}</select>
        </label>
      </div>
    </div>

    <div class="grid2" style="margin-top:12px;">
      <div class="box">
        <h3>Menu (select up to 6)</h3>
        <div class="small">Library dishes are stable. Signatures add identity but need R&D to become consistent.</div>
        <div class="pills" id="menuPills">
          ${dishes.map(d=>`<div class="pill ${plan.menuIds.includes(d.id)?'active':''}" data-dish="${d.id}">${d.name}</div>`).join("")}
        </div>
      </div>

      <div class="box">
        <h3>Signature / R&D dish (optional)</h3>
        <label>Use signature
          <select id="pSig">
            <option value="">None</option>
            ${sigs.map(s=>`<option value="${s.id}" ${plan.signatureId===s.id?'selected':''}>${s.name} ${s.locked?'(Locked)':'(R&D '+s.rnd.successes+'/'+s.rnd.required+')'}</option>`).join("")}
          </select>
        </label>
        <button id="btnNewSig" style="margin-top:8px;">Create new signature (template)</button>
      </div>
    </div>

    <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
      <button id="btnRun" class="primary">Run Service</button>
      <button id="btnAdvance">Skip (advance service)</button>
    </div>

    <div style="margin-top:12px;" id="resultBox"></div>
  `;

  // hooks
  $("pPriority").addEventListener("change", ()=>{ plan.priority=$("pPriority").value; save(); });
  $("pPrep").addEventListener("change", ()=>{ plan.prep=$("pPrep").value; save(); });
  $("pManager").addEventListener("change", ()=>{ plan.manager=$("pManager").value; save(); });
  $("pCall").addEventListener("change", ()=>{ plan.call=$("pCall").value; save(); });
  $("pSig").addEventListener("change", ()=>{ plan.signatureId=$("pSig").value || null; save(); });

  $("btnAdvance").addEventListener("click", ()=>{
    advanceService(state);
    save();
    renderAll();
  });

  // menu toggles
  for(const el of document.querySelectorAll("#menuPills .pill")){
    el.addEventListener("click", ()=>{
      const id = el.dataset.dish;
      const i = plan.menuIds.indexOf(id);
      if(i>=0) plan.menuIds.splice(i,1);
      else{
        if(plan.menuIds.length >= 6) return alert("Max 6 menu items.");
        plan.menuIds.push(id);
      }
      renderAll();
      save();
    });
  }

  $("btnNewSig").addEventListener("click", ()=> openSignatureBuilder());
  $("btnRun").addEventListener("click", ()=>{
    if(plan.menuIds.length === 0 && !plan.signatureId){
      if(!confirm("Run service with no menu selected? (It will hurt demand.)")) return;
    }
    const { result } = runService(state, plan);
    // cache last result for inspection tie-in
    state.player.lastResultCache = result;
    computeLeaderboards(state);
    // advance service
    advanceService(state);
    save();
    renderAll();
    showResult(result);
  });

  // show last result if exists in log
  if(state.log?.length){
    showResult(state.log[0], true);
  }
}

function showResult(result, isLast=false){
  const div = $("resultBox");
  if(!div) return;
  if(result?.system){
    div.innerHTML = `<div class="box"><h3>System</h3><div class="small">${result.msg}</div></div>`;
    return;
  }
  if(!result) { div.innerHTML = ""; return; }

  const rub = result.customerRubric;
  const segRows = Object.entries(result.segmentOutcome||{}).map(([k,v])=>`
    <tr>
      <td>${k}</td>
      <td>${v.score}</td>
      <td>${v.satisfaction}</td>
      <td>${v.loyalty}</td>
      <td>${v.base}</td>
      <td>${v.reviewChance}%</td>
    </tr>
  `).join("");

  div.innerHTML = `
    <div class="box">
      <h3>${isLast ? "Last Result" : "Service Result"} <span class="badge">${result.day} ${result.service}</span></h3>
      <div class="small">
        Covers: <b>${result.covers}</b> • Ticket time: <b>${result.ticketTime}m</b> • Send-backs: <b>${result.sendBackPct}%</b> • Cold plates: <b>${result.coldPlatePct}%</b><br/>
        Food Quality Index: <b>${result.fqi}</b> • Customer Total: <b>${result.customerTotal}/30</b> • Profit: <b>${result.profit>=0?"+":""}$${result.profit}</b> • Cash Float: <b>$${result.cashFloat}</b>
      </div>
      ${result.problems?.length ? `<div class="small" style="margin-top:8px;">Problems: ${result.problems.map(p=>`<span class="badge warn">${p}</span>`).join(" ")}</div>` : ""}
      ${result.inspection ? `<div class="small" style="margin-top:8px;">Inspection: Score <b>${result.inspection.score}</b> → Stars <b>${result.inspection.stars}</b></div>` : ""}

      <div class="grid2" style="margin-top:12px;">
        <div class="box">
          <h3>Customer Rubric (1–5)</h3>
          <div class="small">
            Flow: <b>${rub.flow}</b> • Recovery: <b>${rub.recovery}</b> • Warmth: <b>${rub.warmth}</b><br/>
            Trust: <b>${rub.trust}</b> • Value: <b>${rub.value}</b> • Identity: <b>${rub.identity}</b>
          </div>
        </div>
        <div class="box">
          <h3>Clientele Update</h3>
          <table>
            <thead><tr><th>Segment</th><th>Score</th><th>Satisfaction</th><th>Loyalty</th><th>Base</th><th>Review%</th></tr></thead>
            <tbody>${segRows}</tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function openSignatureBuilder(){
  const me = state.player;
  const templates = listTemplates();
  const comps = listComponents();
  const techs = listTechniques();

  const pane = $("tab-play");
  const overlay = document.createElement("div");
  overlay.className = "card";
  overlay.style.borderColor = "rgba(125,211,252,.6)";
  overlay.innerHTML = `
    <h2>Create Signature (Template-driven)</h2>
    <div class="small">Pick a template, fill the component slots, pick up to 2 techniques. The dish enters R&D until it’s stable.</div>

    <div class="grid2">
      <div class="box">
        <label>Template
          <select id="tSel">${templates.map(t=>`<option value="${t.id}">${t.name}</option>`).join("")}</select>
        </label>
        <div id="slotArea" style="margin-top:10px;"></div>

        <label style="margin-top:10px;">Techniques (0–2)
          <select id="techA"><option value="">None</option>${techs.map(t=>`<option value="${t.id}">${t.name}</option>`).join("")}</select>
        </label>
        <label>Technique B
          <select id="techB"><option value="">None</option>${techs.map(t=>`<option value="${t.id}">${t.name}</option>`).join("")}</select>
        </label>
      </div>

      <div class="box">
        <h3>Preview</h3>
        <div id="preview" class="small"></div>
        <button id="btnMake" class="primary" style="margin-top:10px;">Create (adds to R&D)</button>
        <button id="btnCancel" style="margin-top:10px;">Cancel</button>
        <div class="small" style="margin-top:10px;">
          R&D requires <b>4 successes</b>. Using the dish in service increases mastery; failures can hurt consistency & culture.
        </div>
      </div>
    </div>
  `;

  pane.prepend(overlay);

  const renderSlots = ()=>{
    const tId = $("tSel").value;
    const t = templates.find(x=>x.id===tId);
    const slotArea = $("slotArea");
    slotArea.innerHTML = t.slots.map(slot=>{
      const opts = (comps[slot] || ["Option"]).map(v=>`<option value="${v}">${v}</option>`).join("");
      return `<label>${slot}<select data-slot="${slot}">${opts}</select></label>`;
    }).join("");
    refreshPreview();
  };

  const readPicks = ()=>{
    const picks = {};
    for(const sel of overlay.querySelectorAll("select[data-slot]")){
      picks[sel.dataset.slot] = sel.value;
    }
    return picks;
  };

  const refreshPreview = ()=>{
    const tId = $("tSel").value;
    const picks = readPicks();
    const techniques = [ $("techA").value, $("techB").value ].filter(Boolean).slice(0,2);
    const dish = createSignatureDish(tId, picks, techniques);
    $("preview").innerHTML = `
      <b>${dish.name}</b><br/>
      Template: ${tId}<br/>
      Techniques: ${dish.techniques.join(", ") || "None"}<br/>
      Stats — Prep: ${dish.stats.prep}, Complexity: ${dish.stats.complexity}, Hold: ${dish.stats.hold}, Identity: ${dish.stats.identity}
    `;
    return dish;
  };

  $("tSel").addEventListener("change", renderSlots);
  overlay.addEventListener("change", (e)=>{ if(e.target.tagName==="SELECT") refreshPreview(); });

  $("btnCancel").addEventListener("click", ()=> overlay.remove());
  $("btnMake").addEventListener("click", ()=>{
    const dish = refreshPreview();
    me.rndQueue.push(dish);
    save();
    overlay.remove();
    renderAll();
    alert("Signature created and added to R&D.");
  });

  renderSlots();
}

function renderRestaurant(){
  const pane = $("tab-restaurant");
  if(!state.player){
    pane.innerHTML = `<h2>Restaurant</h2><div class="small">Create your restaurant first.</div>`;
    return;
  }
  const me = state.player;
  const nh = getNeighbourhood(state, me.neighbourhoodId);

  const segRows = Object.entries(me.segments).map(([k,v])=>`
    <tr>
      <td>${k}</td><td>${round(v.base,1)}</td><td>${round(v.satisfaction,1)}</td><td>${round(v.loyalty,3)}</td>
    </tr>
  `).join("");

  const rosterRows = me.roster.map(s=>`
    <tr>
      <td>${s.name}</td><td>${s.role}</td><td>${round(s.skill,1)}</td><td>${round(s.fatigue,2)}</td><td>${round(s.loyalty,2)}</td><td>$${Math.round(s.wage)}</td>
    </tr>
  `).join("");

  pane.innerHTML = `
    <h2>Your Restaurant</h2>
    <div class="grid2">
      <div class="box">
        <h3>Clientele Base</h3>
        <div class="small">Segments grow/shrink based on satisfaction and retention. This is your demand engine.</div>
        <table>
          <thead><tr><th>Segment</th><th>Base</th><th>Satisfaction</th><th>Loyalty</th></tr></thead>
          <tbody>${segRows}</tbody>
        </table>
      </div>
      <div class="box">
        <h3>Team</h3>
        <div class="small">Fatigue + loyalty drive retention and poaching vulnerability.</div>
        <table>
          <thead><tr><th>Name</th><th>Role</th><th>Skill</th><th>Fatigue</th><th>Loyalty</th><th>Wage</th></tr></thead>
          <tbody>${rosterRows}</tbody>
        </table>
      </div>
    </div>
  `;
}

function renderMarket(){
  const pane = $("tab-market");
  if(!state.player){
    pane.innerHTML = `<h2>Staff Market</h2><div class="small">Create your restaurant first.</div>`;
    return;
  }
  const me = state.player;

  pane.innerHTML = `
    <h2>Staff Market</h2>
    <div class="small">This MVP market is rivalry-driven: scout rivals and poach. (A full free-agent market can be added later.)</div>
    <div class="box" style="margin-top:10px;">
      <h3>Tip</h3>
      <div class="small">Go to <b>Rivals</b> → Scout → Poach staff. Poaching costs cash and can fail.</div>
    </div>
  `;
}

function renderRivals(){
  const pane = $("tab-rivals");
  if(!state.player){
    pane.innerHTML = `<h2>Rivals</h2><div class="small">Create your restaurant first.</div>`;
    return;
  }
  const me = state.player;
  const leaders = computeLeaderboards(state);
  const rivals = state.rivals.map(r=>{
    const report = me.scoutingReports?.[r.id];
    const nh = getNeighbourhood(state, r.neighbourhoodId);
    return { ...r, nhName: nh.name, report };
  });

  const rows = rivals.slice(0, 12).map(r=>`
    <tr>
      <td><b>${r.name}</b><div class="small">${r.nhName}</div></td>
      <td>${r.stars}</td>
      <td>${r.bestRank ?? "—"}</td>
      <td>${Math.round(r.brand*100)}%</td>
      <td>${r.report ? `<span class="badge ok">Scouted</span><div class="small">${r.report.strengths.join(", ")}</div>` : `<button data-scout="${r.id}">Scout ($${TUNING.scoutCost})</button>`}</td>
      <td><button data-view="${r.id}">View</button></td>
    </tr>
  `).join("");

  pane.innerHTML = `
    <h2>Rivals</h2>
    <div class="small">Neighbourhoods behave like kingdoms: demand and critic attention differ. Scout for intel, then poach strategically.</div>
    <table>
      <thead><tr><th>Restaurant</th><th>Stars</th><th>Best Rank</th><th>Brand</th><th>Intel</th><th>Actions</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div id="rivalDetail" style="margin-top:12px;"></div>
  `;

  // scout buttons
  pane.querySelectorAll("button[data-scout]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.dataset.scout;
      const res = scoutRival(state, id);
      if(!res.ok) alert(res.reason);
      save();
      renderAll();
    });
  });

  pane.querySelectorAll("button[data-view]").forEach(btn=>{
    btn.addEventListener("click", ()=> showRival(btn.dataset.view));
  });

  function showRival(rivalId){
    const r = state.rivals.find(x=>x.id===rivalId);
    const detail = $("rivalDetail");
    if(!r || !detail) return;
    const report = me.scoutingReports?.[rivalId];
    const nh = getNeighbourhood(state, r.neighbourhoodId);

    const staffRows = r.roster.slice(0, 8).map(s=>`
      <tr>
        <td>${s.name}</td><td>${s.role}</td><td>${round(s.skill,1)}</td><td>${round(s.fatigue,2)}</td><td>${round(s.loyalty,2)}</td><td>$${Math.round(s.wage)}</td>
        <td>
          <button data-poach="${rivalId}:${s.uid}">Poach</button>
        </td>
      </tr>
    `).join("");

    detail.innerHTML = `
      <div class="box">
        <h3>${r.name} <span class="badge">${nh.name}</span> <span class="badge ${r.stars>0?'ok':''}">${r.stars}★</span></h3>
        <div class="small">Style: ${r.styleId} • Dining: ${r.diningTypeId} • Cash: $${Math.round(r.cashFloat)}</div>
        ${report ? `<div class="small" style="margin-top:8px;"><b>Scout report:</b> Strengths — ${report.strengths.join(", ")}. ${report.hint}</div>` : `<div class="small" style="margin-top:8px;">Scout them to reveal strengths and context.</div>`}

        <h3 style="margin-top:12px;">Staff (poachable)</h3>
        <table>
          <thead><tr><th>Name</th><th>Role</th><th>Skill</th><th>Fatigue</th><th>Loyalty</th><th>Wage</th><th></th></tr></thead>
          <tbody>${staffRows}</tbody>
        </table>
      </div>
    `;

    detail.querySelectorAll("button[data-poach]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const [rid, uid] = btn.dataset.poach.split(":");
        const bump = parseFloat(prompt("Wage bump % (e.g., 0.15 = +15%)", "0.15") || "0.15");
        const perks = prompt("Perks: training | days_off | creative_control", "training") || "training";
        const out = poachFromRival(state, rid, uid, { wageBumpPct: bump, perks });
        alert(out.ok ? out.msg : out.reason);
        save();
        renderAll();
      });
    });
  }
}

function renderLeader(){
  const pane = $("tab-leader");
  if(!state.player){
    pane.innerHTML = `<h2>Leaderboards</h2><div class="small">Create your restaurant first.</div>`;
    return;
  }
  const list = computeLeaderboards(state);

  const rows = list.slice(0, 30).map(x=>`
    <tr>
      <td>${x.bestRank}</td>
      <td><b>${x.name}</b> ${x.id==="player" ? `<span class="badge ok">You</span>` : ""}</td>
      <td>${x.stars}★</td>
      <td>${Math.round(x.brand*100)}%</td>
      <td>${Math.round(x.cashFloat)}</td>
      <td>${Math.round(Object.values(x.segments).reduce((a,s)=>a+s.satisfaction,0)/Object.values(x.segments).length)}</td>
    </tr>
  `).join("");

  pane.innerHTML = `
    <h2>Leaderboards</h2>
    <div class="small">Best Restaurant is momentum + customer satisfaction + financial stability. Michelin Stars are awarded weekly by inspection.</div>
    <table>
      <thead><tr><th>#</th><th>Restaurant</th><th>Stars</th><th>Brand</th><th>Cash</th><th>Avg Satisfaction</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderHelp(){
  const pane = $("tab-help");
  pane.innerHTML = `
    <h2>Help</h2>
    <div class="grid2">
      <div class="box">
        <h3>Core loop</h3>
        <div class="small">
          Plan (Priority/Prep/Manager/Call + Menu) → Run Service → Customer rubric → Segment updates → Money & debts → Repeat.
        </div>
        <div class="small" style="margin-top:10px;">
          <b>Neighbourhoods</b> are like Utopia kingdoms: different rent/demand/critics and starting clientele mixes.
          <b>Seasons</b> rotate cities: Sydney → Melbourne → Seoul etc.
        </div>
      </div>
      <div class="box">
        <h3>Strategy tips</h3>
        <div class="small">
          <ul>
            <li>Clientele base is your engine — protect satisfaction.</li>
            <li>Signatures raise identity, but R&D adds volatility until locked.</li>
            <li>Debt kills consistency: pay down standards + maintenance.</li>
            <li>Scout before poaching so you’re not wasting cash.</li>
          </ul>
        </div>
      </div>
      <div class="box">
        <h3>Tools</h3>
        <div class="small">
          Rubric tester is included at <code>tools/rubric-tester/index.html</code>.
        </div>
      </div>
    </div>
  `;
}

// Start
initUI();
setTab("play");
renderAll();
save();
