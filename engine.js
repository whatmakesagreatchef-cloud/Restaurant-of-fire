import {
  CITY_ROTATION, CITIES, SEGMENTS, DINING_TYPES, STYLES, STAFF_POOL,
  PRIORITIES, PREP_LEVELS, MANAGER_MOVES, CALLS,
  DISH_LIBRARY, DISH_TEMPLATES, COMPONENTS, TECHNIQUES, PROBLEMS
} from './data.js';

const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
const round = (n,d=2)=>Math.round(n*(10**d))/(10**d);

export const TUNING = {
  seasonDays: 28,
  servicesPerDay: 2,
  aiRivals: 24,

  // customer system
  retentionFactor: 0.004,   // Retention Δ = (SegmentScore-60)*factor
  reviewBase: 0.02,         // base review probability
  reviewBoost: 0.006,       // additional per point above 75
  reviewMax: 0.25,
  churnSpikeBelow: 45,      // churn risk ramps below this

  // operations
  baseDemand: 80,           // baseline covers per service
  baseCapacity: 85,         // baseline covers per service
  rentPerService: 120,      // scaled by neighbourhood rent
  wageScale: 1.0,

  // inspections
  inspectionEveryDays: 7,   // weekly
  starThresholds: [72, 80, 88], // 1/2/3 stars threshold (0..100)
  bestRestaurantTopN: 50,

  // poaching/scouting
  scoutCost: 40,
  poachBaseChance: 0.30,
  poachCooldownServices: 4,
  protectedHireServices: 6,
};

function rng(seed){
  let t = seed >>> 0;
  return ()=>{
    t += 0x6D2B79F5;
    let x = Math.imul(t ^ t >>> 15, 1 | t);
    x ^= x + Math.imul(x ^ x >>> 7, 61 | x);
    return ((x ^ x >>> 14) >>> 0) / 4294967296;
  };
}

export function defaultState(){
  return {
    version: 1,
    seed: Math.floor(Math.random()*1e9),
    season: 1,
    city: CITY_ROTATION[0],
    day: 1,
    service: "Lunch", // Lunch or Dinner
    serviceIndex: 1, // 1..(seasonDays*2)

    // player restaurant created later
    player: null,

    // rivals list
    rivals: [],

    // logs
    log: [],
  };
}

export function newSeason(state, cityName){
  const city = CITIES[cityName] ? cityName : CITY_ROTATION[(state.season-1) % CITY_ROTATION.length];
  state.season += 1;
  state.city = city;
  state.day = 1;
  state.service = "Lunch";
  state.serviceIndex = 1;
  state.log = [];
  state.player = null;
  state.rivals = makeRivals(state);
  return state;
}

export function createRestaurant(state, cfg){
  // cfg: {name, diningTypeId, styleId, neighbourhoodId}
  const city = CITIES[state.city];
  const nh = city.neighbourhoods.find(n=>n.id===cfg.neighbourhoodId) ?? city.neighbourhoods[0];
  const dt = DINING_TYPES.find(d=>d.id===cfg.diningTypeId) ?? DINING_TYPES[1];
  const style = STYLES.find(s=>s.id===cfg.styleId) ?? STYLES[0];

  const baseSegments = {};
  for(const k of Object.keys(SEGMENTS)){
    const p = nh.segments[k] ?? 10;
    baseSegments[k] = { base: p, loyalty: 0.50, satisfaction: 60 }; // base size points, 0..1 loyalty, 0..100 satisfaction
  }

  const roster = seedRoster(state.seed, true);

  state.player = {
    id:"player",
    name: cfg.name || "My Restaurant",
    diningTypeId: dt.id,
    styleId: style.id,
    neighbourhoodId: nh.id,

    // pressures 0..1
    cash: 0.55 + (dt.base?.cash ?? 0),
    consistency: 0.50 + (dt.base?.consistency ?? 0),
    standards: 0.55 + (dt.base?.standards ?? 0),
    throughput: 0.50 + (dt.base?.throughput ?? 0),
    culture: 0.55 + (dt.base?.warmth ?? 0),
    brand: 0.50 + (dt.base?.brand ?? 0),

    // debts
    standardsDebt: 0.10,
    maintenanceDebt: 0.10,
    cultureDebt: 0.06,

    cashFloat: 1200,
    debt: 500,

    segments: baseSegments,

    roster, // hired staff list
    contracts: roster.map(s=>({ staffId:s.uid, lockUntil: state.serviceIndex + TUNING.protectedHireServices })),

    // dish system
    libraryMenu: [],     // current chosen
    signatureDishes: [], // created/locked
    rndQueue: [],        // in-progress R&D
    inventory: { cash:0 },

    // competitive
    stars: 0,
    bestRank: null,
    scoutingReports: {}, // rivalId -> report object
    poachHistory: {}, // rivalId_staffUid -> { lastAttemptServiceIndex }
  };

  return state;
}

function seedRoster(seed, isPlayer=false){
  const r = rng(seed + (isPlayer?999:123));
  // Always include lead + sous + foh + dish + 2 line (plus pastry sometimes)
  const pick = (id)=> {
    const base = STAFF_POOL.find(s=>s.id===id) ?? STAFF_POOL[0];
    return {
      uid: cryptoId(),
      baseId: base.id,
      name: base.name,
      role: base.role,
      skill: base.skill + (r()<0.2?1:0),
      stress: base.stress,
      comm: base.comm,
      wage: base.wage,
      trait: base.trait,
      fatigue: 0.10 + r()*0.10,
      loyalty: 0.55 + r()*0.20,
    };
  };
  const roster = [pick("headchef"), pick("sous"), pick("foh"), pick("dish"), pick("grill"), pick("saute")];
  if(r() < 0.55) roster.push(pick("pastry"));
  if(r() < 0.25) roster.push(pick("cold"));
  return roster;
}

function makeRivals(state){
  const city = CITIES[state.city];
  const r = rng(state.seed + state.season*10007);
  const rivals = [];
  for(let i=0;i<TUNING.aiRivals;i++){
    const nh = city.neighbourhoods[Math.floor(r()*city.neighbourhoods.length)];
    const dt = DINING_TYPES[Math.floor(r()*DINING_TYPES.length)];
    const st = STYLES[Math.floor(r()*STYLES.length)];
    const roster = seedRoster(state.seed + i*97, false);

    const segments = {};
    for(const k of Object.keys(SEGMENTS)){
      const p = nh.segments[k] ?? 10;
      segments[k] = { base: p, loyalty: 0.50 + r()*0.10, satisfaction: 58 + r()*8 };
    }

    rivals.push({
      id: "rival_" + i,
      name: randomName(r, state.city),
      diningTypeId: dt.id,
      styleId: st.id,
      neighbourhoodId: nh.id,
      cash: clamp(0.50 + (dt.base?.cash ?? 0) + (r()*0.12), 0.1, 0.9),
      consistency: clamp(0.48 + (dt.base?.consistency ?? 0) + (r()*0.12), 0.1, 0.9),
      standards: clamp(0.52 + (dt.base?.standards ?? 0) + (r()*0.12), 0.1, 0.9),
      throughput: clamp(0.50 + (dt.base?.throughput ?? 0) + (r()*0.12), 0.1, 0.9),
      culture: clamp(0.50 + (dt.base?.warmth ?? 0) + (r()*0.12), 0.1, 0.9),
      brand: clamp(0.45 + (dt.base?.brand ?? 0) + (r()*0.18), 0.1, 0.95),
      standardsDebt: 0.10 + r()*0.18,
      maintenanceDebt: 0.08 + r()*0.18,
      cultureDebt: 0.05 + r()*0.14,
      cashFloat: 900 + r()*900,
      debt: 400 + r()*900,
      segments,
      roster,
      stars: 0,
      bestRank: null,
      knownFor: [], // will be filled
    });
  }
  return rivals;
}

function randomName(r, city){
  const a = ["Corner","House","Studio","Market","Salt","Smoke","Fern","Lantern","Nori","Brick","Harbour","Noodle","Cinder","Field","Supper","Sake","Pearl","Lime"];
  const b = ["Kitchen","Bar","Table","Club","Room","Canteen","Bistro","Atelier","Izakaya","Grill","Deli","Seafood","Pasta","Bakery"];
  return a[Math.floor(r()*a.length)] + " " + b[Math.floor(r()*b.length)];
}

export function advanceService(state){
  // Move to next service/day
  if(state.service === "Lunch"){
    state.service = "Dinner";
  }else{
    state.service = "Lunch";
    state.day += 1;
  }
  state.serviceIndex += 1;
  return state;
}

export function listCityNeighbourhoods(state){
  return CITIES[state.city]?.neighbourhoods ?? [];
}

export function getNeighbourhood(state, nhId){
  const city = CITIES[state.city];
  return city.neighbourhoods.find(n=>n.id===nhId) ?? city.neighbourhoods[0];
}

export function planDefaults(){
  return { priority:"quality", prep:"balanced", manager:"maintenance", call:"simplify_plating", menuIds:[], signatureId:null };
}

export function createSignatureDish(templateId, picks, techniques){
  // picks: slot->component string; techniques: [techId...]
  const t = DISH_TEMPLATES.find(x=>x.id===templateId) ?? DISH_TEMPLATES[0];
  const techs = techniques.map(id=>TECHNIQUES.find(x=>x.id===id)).filter(Boolean);
  const name = buildDishName(t, picks, techs);
  // compute stats
  let prep = t.base.prep;
  let complexity = t.base.complexity;
  let hold = t.base.hold;
  let identity = t.base.identity;

  for(const tc of techs){
    prep += (tc.mod.prep ?? 0);
    complexity += (tc.mod.complexity ?? 0);
    hold += (tc.mod.hold ?? 0);
    identity += (tc.mod.identity ?? 0);
  }
  prep = clamp(prep,1,8);
  complexity = clamp(complexity,1,8);
  hold = clamp(hold,1,5);
  identity = clamp(identity,1,5);

  return {
    id: cryptoId(),
    type:"signature",
    templateId: t.id,
    name,
    picks,
    techniques: techs.map(x=>x.id),
    stats: { prep, complexity, hold, identity, margin: 4 + (identity-2)*0.2 },
    mastery: 0, // 0..5
    rnd: { level:1, successes:0, required:4 }, // R&D before lock
    locked: false,
  };
}

function buildDishName(t, picks, techs){
  const main = picks.protein || picks.hero || picks.pasta || "Dish";
  const sauce = picks.sauce || picks.creamy || "";
  const tag = techs.find(x=>x.id==="smoke") ? "Smoked " : "";
  const name = `${tag}${main}${sauce?(" + "+sauce):""}`;
  return `${name} (${t.name.split(" ")[0]})`;
}

export function runService(state, plan){
  if(!state.player) throw new Error("No player restaurant. Create one first.");

  const r = rng(state.seed + state.serviceIndex*777);
  const me = state.player;
  const nh = getNeighbourhood(state, me.neighbourhoodId);

  // --- AI rivals simulate this service quickly (affects leaderboards, stars, and poaching attempts)
  simulateRivals(state, r);

  // --- Apply manager move
  applyManagerMove(me, plan.manager);

  // --- Build menu objects
  const menu = plan.menuIds.map(id => DISH_LIBRARY.find(d=>d.id===id)).filter(Boolean);
  let signature = null;
  if(plan.signatureId){
    signature = me.signatureDishes.find(d=>d.id===plan.signatureId) || me.rndQueue.find(d=>d.id===plan.signatureId) || null;
  }
  const menuIdentity = menu.reduce((a,d)=>a+(d.identity||1),0) + (signature?.stats.identity ?? 0);

  // --- Determine demand and capacity
  const priority = plan.priority;
  const prep = plan.prep;

  const demandMod = nh.demand * (0.85 + me.brand*0.6);
  const prepMod = prep==="aggressive" ? 1.10 : (prep==="conservative" ? 0.92 : 1.0);
  const staffSkill = me.roster.reduce((a,s)=>a+s.skill,0) / Math.max(1, me.roster.length);
  const staffMod = 0.85 + (staffSkill/10)*0.4;
  const throughputMod = 0.85 + me.throughput*0.5;

  let demand = TUNING.baseDemand * demandMod;
  demand *= (priority==="cost" ? 0.96 : 1.0);
  demand *= (priority==="hygiene" ? 0.98 : 1.0);

  let capacity = TUNING.baseCapacity * staffMod * throughputMod * prepMod;
  capacity *= (priority==="quality" ? 0.95 : 1.0);
  capacity *= (priority==="hygiene" ? 0.92 : 1.0);

  // menu complexity reduces capacity, increases mistakes and ticket time
  const complexity = (menu.reduce((a,d)=>a+(d.complexity||2),0) + (signature?.stats.complexity ?? 0)) / Math.max(1, (menu.length + (signature?1:0)));
  capacity *= clamp(1.08 - (complexity-3)*0.06, 0.75, 1.10);

  // debts create pressure
  const stress = clamp(0.15 + me.standardsDebt*0.35 + me.maintenanceDebt*0.25 + me.cultureDebt*0.20, 0, 1);
  demand *= 1 + (me.brand-0.5)*0.10;
  capacity *= 1 - (me.maintenanceDebt*0.10);

  // problems drawn: based on stress + standardsDebt
  const problems = drawProblems(r, stress, me.standardsDebt);

  // apply problem effects
  let ticketPenalty = 0;
  let mistakePenalty = 0;
  let wastePenalty = 0;
  let demandDelta = 0;
  let capacityDelta = 0;
  for(const p of problems){
    ticketPenalty += (p.effects.ticket ?? 0);
    mistakePenalty += (p.effects.mistakes ?? 0) + (p.effects.quality ? (-p.effects.quality) : 0);
    wastePenalty += (p.effects.waste ?? 0);
    demandDelta += (p.effects.demand ?? 0);
    capacityDelta += (p.effects.capacity ?? 0);
    me.standardsDebt = clamp(me.standardsDebt + (p.effects.standardsDebt ?? 0), 0, 1);
    me.brand = clamp(me.brand + (p.effects.brand ?? 0), 0.05, 0.95);
    me.culture = clamp(me.culture + (p.effects.culture ?? 0), 0.05, 0.95);
  }

  demand *= (1 + demandDelta);
  capacity *= (1 + capacityDelta);

  // call choice affects outcomes
  const call = plan.call;
  applyCall(me, call, { r });

  // now resolve covers
  const covers = Math.max(0, Math.floor(Math.min(demand, capacity)));

  // ticket time: baseline scaled by complexity, problems, priority, pacing
  let ticketTime = 18 + complexity*2.5;
  ticketTime *= 1 + ticketPenalty;
  if(priority==="speed") ticketTime *= 0.88;
  if(priority==="quality") ticketTime *= 1.06;
  if(plan.manager==="pacing") ticketTime *= 0.92;
  ticketTime = round(ticketTime,1);

  // mistakes: driven by stress, complexity, standardsDebt
  let mistakeRate = 0.04 + (complexity-3)*0.015 + me.standardsDebt*0.06 + me.cultureDebt*0.03 + mistakePenalty;
  if(priority==="quality") mistakeRate *= 0.78;
  if(priority==="speed") mistakeRate *= 1.15;
  mistakeRate = clamp(mistakeRate, 0.01, 0.25);

  // send backs & cold plates are derived
  const sendBackPct = round(mistakeRate*100*0.55,1);
  const coldPlatePct = round(clamp((ticketTime-20)*0.9, 0, 30),1);

  // food quality index: proxy from dish identity/mastery and mistake penalties (0..10 approx)
  let avgDish = 6.6 + (menuIdentity/(menu.length+(signature?1:0)))*0.25;
  if(signature){
    const mastery = signature.mastery;
    avgDish += mastery*0.15;
    // R&D risk: if not locked, more volatile
    if(!signature.locked){
      const rndRisk = 0.6 - mastery*0.08;
      if(r() < rndRisk){
        // failure event
        avgDish -= 0.9;
        me.consistency = clamp(me.consistency - 0.02, 0.05, 0.95);
        me.cultureDebt = clamp(me.cultureDebt + 0.04, 0, 1);
      }else{
        signature.rnd.successes += 1;
        signature.mastery = clamp(signature.mastery + 1, 0, 5);
        if(signature.rnd.successes >= signature.rnd.required){
          signature.locked = True = true;
        }
      }
    }
  }
  const fqi = round(avgDish - (0.5*sendBackPct) - (0.2*coldPlatePct), 2);

  // customer rubric categories (1..5) derived from metrics
  const cust = deriveCustomerRubric({ ticketTime, sendBackPct, coldPlatePct, me, fqi, priority, nh });
  const customerTotal = Object.values(cust).reduce((a,b)=>a+b,0); // /30

  // segment satisfaction + retention updates
  const segOut = updateSegments(me, cust);

  // money
  const avgSpend = 32 + me.brand*18 + (me.cash-0.5)*10; // approx
  const revenue = covers * avgSpend;
  const labour = me.roster.reduce((a,s)=>a+(s.wage*TUNING.wageScale),0);
  const rent = TUNING.rentPerService * nh.rent;
  const cogs = revenue * clamp(0.32 - (me.cash-0.5)*0.06 + wastePenalty, 0.22, 0.45);
  const comps = (call==="comp_table") ? revenue*0.03 : 0;
  const profit = revenue - (labour + rent + cogs + comps);
  me.cashFloat = round(me.cashFloat + profit, 0);

  // update pressures
  me.cash = clamp(me.cash + (profit>0?0.01:-0.02) + (priority==="cost"?0.01:0), 0.05, 0.95);
  me.throughput = clamp(me.throughput + (ticketTime<22?0.01:-0.01), 0.05, 0.95);
  me.consistency = clamp(me.consistency + (sendBackPct<4?0.01:-0.02) + (signature && signature.locked?0.005:0), 0.05, 0.95);
  me.standards = clamp(me.standards + (priority==="hygiene"?0.01:-0.005) - me.standardsDebt*0.004, 0.05, 0.95);
  me.culture = clamp(me.culture + (priority==="culture"?0.01:-0.004) - me.cultureDebt*0.003, 0.05, 0.95);
  me.brand = clamp(me.brand + (customerTotal>=22?0.01:-0.01) + (fqi>6.8?0.008:-0.004), 0.05, 0.95);

  // debt drift
  me.maintenanceDebt = clamp(me.maintenanceDebt + 0.01 - (plan.manager==="maintenance"?0.06:0), 0, 1);
  me.standardsDebt = clamp(me.standardsDebt + (prep==="aggressive"?0.02:0) - (plan.manager==="deep_clean"?0.10:0) - (priority==="hygiene"?0.02:0), 0, 1);
  me.cultureDebt = clamp(me.cultureDebt + 0.008 - (priority==="culture"?0.02:0) - (call==="comp_table"?0.01:0), 0, 1);

  // fatigue
  for(const s of me.roster){
    s.fatigue = clamp(s.fatigue + (stress*0.03) + (priority==="speed"?0.02:0) - (priority==="culture"?0.01:0), 0, 1);
    // loyalty moves with culture + wage fairness (simple)
    s.loyalty = clamp(s.loyalty + (me.culture-0.5)*0.01 - (s.fatigue-0.5)*0.01, 0.1, 0.95);
  }

  // inspection weekly after dinner (simple)
  let inspection = null;
  if(state.service==="Dinner" && (state.day % TUNING.inspectionEveryDays === 0)){
    inspection = runInspection(me, nh);
  }

  const result = {
    day: state.day, service: state.service,
    covers, ticketTime, sendBackPct, coldPlatePct,
    fqi, customerRubric: cust, customerTotal,
    segmentOutcome: segOut,
    profit: round(profit,0), cashFloat: me.cashFloat,
    problems: problems.map(p=>p.title),
    inspection
  };

  state.log.unshift(result);
  // limit log
  state.log = state.log.slice(0, 60);

  return { state, result };
}

function drawProblems(r, stress, standardsDebt){
  const count = (r() < (0.35 + stress*0.55 + standardsDebt*0.35)) ? (r()<0.5?2:1) : 0;
  const out = [];
  for(let i=0;i<count;i++){
    out.push(PROBLEMS[Math.floor(r()*PROBLEMS.length)]);
  }
  return out;
}

function applyManagerMove(me, move){
  if(move==="maintenance"){
    me.maintenanceDebt = clamp(me.maintenanceDebt - 0.06, 0, 1);
    me.cashFloat -= 30;
  }
  if(move==="training"){
    // small skill bump to lowest skill staff
    const s = [...me.roster].sort((a,b)=>a.skill-b.skill)[0];
    if(s) s.skill = clamp(s.skill+0.2, 1, 8);
    me.cashFloat -= 45;
    me.cultureDebt = clamp(me.cultureDebt - 0.01, 0, 1);
  }
  if(move==="deep_clean"){
    me.standardsDebt = clamp(me.standardsDebt - 0.10, 0, 1);
    me.cashFloat -= 20;
  }
  if(move==="supplier_call"){
    me.cashFloat -= 40;
    // reduce future waste slightly (handled as small standards debt relief)
    me.standardsDebt = clamp(me.standardsDebt - 0.02, 0, 1);
  }
  if(move==="pacing"){
    me.cashFloat -= 10;
  }
}

function applyCall(me, call, {r}){
  if(call==="simplify_plating"){
    me.standardsDebt = clamp(me.standardsDebt + 0.03, 0, 1);
    me.brand = clamp(me.brand - 0.004, 0.05, 0.95);
  }
  if(call==="eighty_six"){
    me.brand = clamp(me.brand - 0.006, 0.05, 0.95);
    me.consistency = clamp(me.consistency + 0.004, 0.05, 0.95);
  }
  if(call==="comp_table"){
    me.culture = clamp(me.culture + 0.006, 0.05, 0.95);
  }
  if(call==="pause_walkins"){
    me.brand = clamp(me.brand - 0.003, 0.05, 0.95);
    me.throughput = clamp(me.throughput + 0.003, 0.05, 0.95);
  }
  if(call==="call_casual"){
    me.cashFloat -= 60;
    me.consistency = clamp(me.consistency - 0.01, 0.05, 0.95);
  }
}

function deriveCustomerRubric({ticketTime, sendBackPct, coldPlatePct, me, fqi, priority, nh}){
  // Convert metrics to 1..5 in six categories:
  // flow, recovery, warmth, trust, value, identity
  const flow = scoreFlow(ticketTime);
  const recovery = scoreRecovery(sendBackPct, me.culture, priority);
  const warmth = scoreWarmth(me.culture, priority);
  const trust = scoreTrust(me.standards, me.standardsDebt, sendBackPct);
  const value = scoreValue(me.cash, nh.rent, me.brand);
  const identity = scoreIdentity(me.brand, fqi, priority);
  return { flow, recovery, warmth, trust, value, identity };
}

function scoreFlow(ticketTime){
  // 16-20 => 5, 20-24 => 4, 24-28 =>3, 28-34=>2, >34=>1
  if(ticketTime <= 20) return 5;
  if(ticketTime <= 24) return 4;
  if(ticketTime <= 28) return 3;
  if(ticketTime <= 34) return 2;
  return 1;
}

function scoreRecovery(sendBackPct, culture, priority){
  const base = 4 - Math.floor(sendBackPct/4); // fewer sendbacks => higher
  const mod = (priority==="culture") ? 1 : 0;
  const cmod = culture > 0.6 ? 1 : (culture < 0.45 ? -1 : 0);
  return clamp(base + mod + cmod, 1, 5);
}

function scoreWarmth(culture, priority){
  let s = 3 + Math.round((culture-0.5)*4);
  if(priority==="culture") s += 1;
  if(priority==="speed") s -= 1;
  return clamp(s,1,5);
}

function scoreTrust(standards, debt, sendBackPct){
  let s = 3 + Math.round((standards-0.5)*4) - Math.round(debt*2);
  if(sendBackPct > 6) s -= 1;
  return clamp(s,1,5);
}

function scoreValue(cash, rent, brand){
  // higher rent => needs to feel premium; value perception can drop if brand isn't strong enough
  let s = 3 + Math.round((cash-0.5)*2) + Math.round((brand-0.5)*2) - (rent>1.15?1:0);
  return clamp(s,1,5);
}

function scoreIdentity(brand, fqi, priority){
  let s = 3 + Math.round((brand-0.5)*4);
  if(fqi >= 6.8) s += 1;
  if(priority==="cost") s -= 1;
  return clamp(s,1,5);
}

export function segmentScore(segmentKey, customerRubric){
  const seg = SEGMENTS[segmentKey];
  const to0100 = (v)=> ((clamp(v,1,5)-1)/4)*100;
  let totW=0, score=0;
  for(const [k,w] of Object.entries(seg.weights)){
    totW += w;
    score += w * to0100(customerRubric[k]);
  }
  return totW>0 ? score/totW : 0;
}

function updateSegments(me, customerRubric){
  const out = {};
  for(const key of Object.keys(SEGMENTS)){
    const s = segmentScore(key, customerRubric);
    const seg = me.segments[key];
    // satisfaction rolls toward s
    seg.satisfaction = round(seg.satisfaction*0.75 + s*0.25, 1);

    const retentionDelta = (seg.satisfaction - 60) * TUNING.retentionFactor;
    seg.loyalty = clamp(seg.loyalty + retentionDelta, 0.10, 0.95);

    // base size drifts with loyalty and satisfaction
    const growth = (seg.loyalty-0.5)*0.8 + (seg.satisfaction-60)*0.02;
    seg.base = clamp(seg.base + growth, 0, 60);

    // review chance
    let reviewChance = TUNING.reviewBase + SEGMENTS[key].reviewTendency*0.5;
    if(seg.satisfaction >= 75) reviewChance += (seg.satisfaction-75)*TUNING.reviewBoost/2;
    reviewChance = clamp(reviewChance, 0.01, TUNING.reviewMax);

    const churnRisk = seg.satisfaction < TUNING.churnSpikeBelow ? clamp((TUNING.churnSpikeBelow - seg.satisfaction)/TUNING.churnSpikeBelow, 0, 1) : 0;

    out[key] = {
      score: round(s,1),
      satisfaction: seg.satisfaction,
      loyalty: round(seg.loyalty,3),
      base: round(seg.base,1),
      reviewChance: round(reviewChance*100,1),
      churnRisk: round(churnRisk*100,1),
    };
  }
  return out;
}

function runInspection(me, nh){
  // Michelin-ish: consistency + standards + quality proxy + recovery
  const last = me.lastResultCache;
  // Use current pressures and last log
  const qualityProxy = clamp((me.brand*0.45 + me.consistency*0.30 + me.standards*0.25)*100, 0, 100);
  const scrutiny = nh.critic;
  const score = clamp(qualityProxy * (0.92 + scrutiny*0.06) - me.standardsDebt*8 - me.maintenanceDebt*5, 0, 100);

  let stars = 0;
  if(score >= TUNING.starThresholds[2]) stars = 3;
  else if(score >= TUNING.starThresholds[1]) stars = 2;
  else if(score >= TUNING.starThresholds[0]) stars = 1;
  me.stars = stars;

  return { score: round(score,1), stars };
}

export function computeLeaderboards(state){
  // Rank by "Best Restaurant" score: brand momentum + satisfaction + profit proxy
  const city = CITIES[state.city];
  const all = [];
  const scoreRestaurant = (x)=>{
    const satAvg = Object.values(x.segments).reduce((a,s)=>a+s.satisfaction,0)/Object.keys(x.segments).length;
    const debtPenalty = (x.standardsDebt+x.maintenanceDebt+x.cultureDebt)*6;
    const rent = city.neighbourhoods.find(n=>n.id===x.neighbourhoodId)?.rent ?? 1.0;
    const cashProxy = clamp((x.cashFloat-500)/2500, -1, 1);
    return (x.brand*45 + satAvg*0.35 + cashProxy*10 + x.stars*6) - debtPenalty - (rent>1.15?1.5:0);
  };
  if(state.player) all.push({ ...state.player, kind:"You", bestScore: scoreRestaurant(state.player) });
  for(const r of state.rivals) all.push({ ...r, kind:"Rival", bestScore: scoreRestaurant(r) });
  all.sort((a,b)=>b.bestScore-a.bestScore);
  all.forEach((x,i)=> x.bestRank = i+1);
  // update back
  if(state.player) state.player.bestRank = all.find(x=>x.id==="player")?.bestRank ?? null;
  for(const r of state.rivals){
    const found = all.find(x=>x.id===r.id);
    if(found) r.bestRank = found.bestRank;
  }
  return all.slice(0, 50);
}

function simulateRivals(state, r){
  // very lightweight simulation per service for rivals
  const city = CITIES[state.city];
  for(const rv of state.rivals){
    const nh = city.neighbourhoods.find(n=>n.id===rv.neighbourhoodId) ?? city.neighbourhoods[0];
    // update segments satisfaction a bit with brand/standards/culture noise
    for(const key of Object.keys(SEGMENTS)){
      const seg = rv.segments[key];
      const base = 55 + rv.brand*20 + rv.standards*10 + rv.culture*8;
      const noise = (r()-0.5)*6;
      seg.satisfaction = clamp(seg.satisfaction*0.8 + (base+noise)*0.2, 0, 100);
      seg.loyalty = clamp(seg.loyalty + (seg.satisfaction-60)*TUNING.retentionFactor*0.6, 0.1, 0.95);
      seg.base = clamp(seg.base + (seg.loyalty-0.5)*0.4, 0, 60);
    }
    // cash drift
    const rent = TUNING.rentPerService * nh.rent;
    rv.cashFloat = round(rv.cashFloat + (r()-0.45)*180 - rent*0.2, 0);
    // debt drift
    rv.standardsDebt = clamp(rv.standardsDebt + 0.01 + (r()-0.5)*0.02, 0, 1);
    rv.maintenanceDebt = clamp(rv.maintenanceDebt + 0.01 + (r()-0.5)*0.02, 0, 1);
    rv.cultureDebt = clamp(rv.cultureDebt + 0.008 + (r()-0.5)*0.02, 0, 1);

    // simple star calc weekly
    if(state.service==="Dinner" && (state.day % TUNING.inspectionEveryDays === 0)){
      const qualityProxy = clamp((rv.brand*0.45 + rv.consistency*0.30 + rv.standards*0.25)*100, 0, 100);
      const score = clamp(qualityProxy*(0.92 + nh.critic*0.06) - rv.standardsDebt*8 - rv.maintenanceDebt*5, 0, 100);
      rv.stars = score >= TUNING.starThresholds[2] ? 3 : (score >= TUNING.starThresholds[1] ? 2 : (score >= TUNING.starThresholds[0] ? 1 : 0));
    }

    // occasionally rivals attempt to poach from player
    if(state.player && r() < 0.06){
      attemptAIPoach(state, rv, r);
    }
  }
}

function attemptAIPoach(state, rival, r){
  const me = state.player;
  // pick a target staff with low loyalty or high fatigue
  const candidates = [...me.roster].sort((a,b)=> (a.loyalty + (1-a.fatigue)) - (b.loyalty + (1-b.fatigue)));
  const target = candidates[0];
  if(!target) return;
  const key = rival.id + "_" + target.uid;
  const last = me.poachHistory?.[key]?.lastAttemptServiceIndex ?? -999;
  if(state.serviceIndex - last < TUNING.poachCooldownServices) return;

  // if in protected hire window, skip
  const lock = me.contracts.find(c=>c.staffId===target.uid)?.lockUntil ?? -999;
  if(state.serviceIndex < lock) return;

  const base = 0.10 + (rival.brand - me.brand)*0.20 + (rival.culture - me.culture)*0.15 + (target.fatigue)*0.10 - (target.loyalty-0.5)*0.35;
  const chance = clamp(base, 0.02, 0.55);
  me.poachHistory[key] = { lastAttemptServiceIndex: state.serviceIndex };

  if(r() < chance){
    // player loses staff
    me.roster = me.roster.filter(s=>s.uid!==target.uid);
    me.contracts = me.contracts.filter(c=>c.staffId!==target.uid);
    state.log.unshift({ system:true, msg:`A rival (${rival.name}) poached your ${target.name}.` });
  }else{
    state.log.unshift({ system:true, msg:`A rival tried to poach your ${target.name}, but they stayed.` });
  }
}

export function scoutRival(state, rivalId){
  const me = state.player;
  const rv = state.rivals.find(r=>r.id===rivalId);
  if(!me || !rv) return null;
  if(me.cashFloat < TUNING.scoutCost) return { ok:false, reason:"Not enough cash for scouting." };
  me.cashFloat -= TUNING.scoutCost;

  const nh = getNeighbourhood(state, rv.neighbourhoodId);
  // reveal partial info: style, stars, broad segment strengths, "known for"
  const segTop = Object.entries(rv.segments).sort((a,b)=>b[1].satisfaction-a[1].satisfaction).slice(0,2).map(([k,v])=>SEGMENTS[k].name);
  const report = {
    rivalId,
    name: rv.name,
    neighbourhood: nh.name,
    styleId: rv.styleId,
    diningTypeId: rv.diningTypeId,
    stars: rv.stars,
    strengths: segTop,
    hint: rv.stars>0 ? "They’re under scrutiny. Any slip hurts them." : "They’re chasing momentum.",
    seenAtServiceIndex: state.serviceIndex
  };
  me.scoutingReports[rivalId] = report;
  return { ok:true, report };
}

export function poachFromRival(state, rivalId, staffUid, offer){
  // offer: { wageBumpPct, perks: "training|days_off|creative_control" }
  const me = state.player;
  const rv = state.rivals.find(r=>r.id===rivalId);
  if(!me || !rv) return { ok:false, reason:"Missing player or rival." };

  const target = rv.roster.find(s=>s.uid===staffUid);
  if(!target) return { ok:false, reason:"Staff not found." };

  const key = rivalId + "_" + staffUid;
  const last = me.poachHistory?.[key]?.lastAttemptServiceIndex ?? -999;
  if(state.serviceIndex - last < TUNING.poachCooldownServices) return { ok:false, reason:"Poach cooldown active." };

  // protected window for their new hires (simplified: any staff with high loyalty recently considered protected)
  if(target.loyalty > 0.80 && state.serviceIndex < TUNING.protectedHireServices) return { ok:false, reason:"Target is protected right now." };

  const wageOffer = target.wage * (1 + clamp(offer.wageBumpPct ?? 0.10, 0, 0.6));
  const upFrontCost = 80 + (offer.wageBumpPct??0)*120;
  if(me.cashFloat < upFrontCost) return { ok:false, reason:"Not enough cash to make this offer." };

  me.cashFloat -= upFrontCost;
  me.poachHistory[key] = { lastAttemptServiceIndex: state.serviceIndex };

  const perks = offer.perks || "training";
  const perkBonus = perks.includes("creative") ? 0.10 : (perks.includes("days") ? 0.08 : 0.06);

  const base = TUNING.poachBaseChance
    + (me.brand - rv.brand)*0.12
    + (me.culture - rv.culture)*0.12
    + (wageOffer - target.wage)/target.wage*0.20
    + perkBonus
    - (target.loyalty-0.5)*0.35;

  const chance = clamp(base, 0.05, 0.70);
  const r = rng(state.seed + state.serviceIndex*333 + staffUid.length*17);

  if(r() < chance){
    // transfer
    rv.roster = rv.roster.filter(s=>s.uid!==staffUid);
    // new staff instance for player
    const newStaff = { ...target, wage: round(wageOffer,0), loyalty: clamp(target.loyalty-0.08, 0.2, 0.9), fatigue: clamp(target.fatigue+0.05,0,1) };
    me.roster.push(newStaff);
    me.contracts.push({ staffId: newStaff.uid, lockUntil: state.serviceIndex + TUNING.protectedHireServices });
    return { ok:true, chance: round(chance*100,1), msg:`Success! ${target.name} joined you.` };
  }
  return { ok:false, chance: round(chance*100,1), reason:`They declined (chance was ${round(chance*100,1)}%).` };
}

export function cryptoId(){
  // short id without requiring crypto in some environments
  return Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
}

export function listDishLibrary(){ return DISH_LIBRARY; }
export function listTemplates(){ return DISH_TEMPLATES; }
export function listComponents(){ return COMPONENTS; }
export function listTechniques(){ return TECHNIQUES; }
export function listPriorities(){ return PRIORITIES; }
export function listPrepLevels(){ return PREP_LEVELS; }
export function listManagerMoves(){ return MANAGER_MOVES; }
export function listCalls(){ return CALLS; }
export function listDiningTypes(){ return DINING_TYPES; }
export function listStyles(){ return STYLES; }
