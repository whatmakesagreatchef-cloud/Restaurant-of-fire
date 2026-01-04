// Bear Mode data (starter set). Extend freely.
export const CITY_ROTATION = ["Sydney","Melbourne","Seoul","Tokyo","Singapore","Paris"];

export const CITIES = {
  Sydney: {
    name:"Sydney",
    neighbourhoods:[
      { id:"syd_cbd", name:"CBD", rent:1.25, demand:1.15, critic:1.2, segments:{locals:18,families:10,foodies:25,highend:22,corporate:18,tourists:7} },
      { id:"syd_surry", name:"Surry Hills", rent:1.15, demand:1.10, critic:1.15, segments:{locals:22,families:8,foodies:28,highend:18,corporate:10,tourists:14} },
      { id:"syd_newtown", name:"Newtown", rent:1.00, demand:1.05, critic:1.00, segments:{locals:30,families:12,foodies:24,highend:8,corporate:8,tourists:18} },
      { id:"syd_suburbs", name:"North Shore Suburbs", rent:1.10, demand:1.05, critic:0.95, segments:{locals:28,families:22,foodies:16,highend:10,corporate:14,tourists:10} },
    ]
  },
  Melbourne: {
    name:"Melbourne",
    neighbourhoods:[
      { id:"mel_cbd", name:"CBD", rent:1.20, demand:1.12, critic:1.20, segments:{locals:18,families:10,foodies:28,highend:20,corporate:18,tourists:6} },
      { id:"mel_fitzroy", name:"Fitzroy", rent:1.05, demand:1.08, critic:1.10, segments:{locals:24,families:8,foodies:30,highend:14,corporate:10,tourists:14} },
      { id:"mel_stkilda", name:"St Kilda", rent:1.00, demand:1.06, critic:0.95, segments:{locals:24,families:14,foodies:18,highend:10,corporate:10,tourists:24} },
      { id:"mel_suburbs", name:"Inner Suburbs", rent:1.02, demand:1.03, critic:0.90, segments:{locals:32,families:20,foodies:16,highend:8,corporate:14,tourists:10} },
    ]
  },
  Seoul: {
    name:"Seoul",
    neighbourhoods:[
      { id:"seo_gangnam", name:"Gangnam", rent:1.25, demand:1.12, critic:1.20, segments:{locals:16,families:10,foodies:22,highend:26,corporate:18,tourists:8} },
      { id:"seo_hongdae", name:"Hongdae", rent:1.00, demand:1.10, critic:1.00, segments:{locals:22,families:8,foodies:30,highend:10,corporate:10,tourists:20} },
      { id:"seo_jongno", name:"Jongno", rent:1.05, demand:1.08, critic:1.05, segments:{locals:26,families:14,foodies:20,highend:12,corporate:10,tourists:18} },
      { id:"seo_suburbs", name:"Suburbs", rent:0.95, demand:1.02, critic:0.85, segments:{locals:34,families:22,foodies:14,highend:6,corporate:14,tourists:10} },
    ]
  }
};

export const SEGMENTS = {
  locals: { name:"Locals", reviewTendency:0.06, influence:0.7,
    weights:{ flow:15,recovery:15,warmth:20,trust:15,value:25,identity:10 } },
  families: { name:"Families", reviewTendency:0.05, influence:0.6,
    weights:{ flow:30,recovery:15,warmth:15,trust:15,value:20,identity:5 } },
  foodies: { name:"Foodies", reviewTendency:0.14, influence:1.2,
    weights:{ flow:15,recovery:15,warmth:10,trust:15,value:5,identity:40 } },
  highend: { name:"High-end / Star Chasers", reviewTendency:0.10, influence:1.0,
    weights:{ flow:15,recovery:20,warmth:10,trust:30,value:5,identity:20 } },
  corporate: { name:"Corporate", reviewTendency:0.04, influence:0.5,
    weights:{ flow:30,recovery:20,warmth:10,trust:15,value:15,identity:10 } },
  tourists: { name:"Tourists", reviewTendency:0.12, influence:1.0,
    weights:{ flow:20,recovery:15,warmth:10,trust:10,value:10,identity:35 } },
};

export const DINING_TYPES = [
  { id:"fast_casual", name:"Fast Casual", base:{ value:+0.10, throughput:+0.10, brand:-0.03, standards:-0.03 } },
  { id:"bistro", name:"Bistro", base:{ warmth:+0.06, consistency:+0.05, brand:+0.02 } },
  { id:"fine_dining", name:"Fine Dining", base:{ brand:+0.08, standards:+0.10, throughput:-0.08, cash:-0.04 } },
  { id:"wine_bar", name:"Wine Bar", base:{ identity:+0.07, warmth:+0.04, cash:+0.02 } },
  { id:"izakaya", name:"Izakaya", base:{ throughput:+0.05, identity:+0.05, standards:-0.02 } },
];

export const STYLES = [
  { id:"modern_aus", name:"Modern Australian" },
  { id:"italian", name:"Italian" },
  { id:"korean", name:"Korean" },
  { id:"japanese", name:"Japanese" },
  { id:"seafood", name:"Seafood Focus" },
  { id:"bbq", name:"Woodfire / Grill" },
];

export const STAFF_POOL = [
  { id:"headchef", name:"Head Chef", role:"lead", skill:7, stress:6, comm:6, wage:220, trait:"Standards-first" },
  { id:"sous", name:"Sous Chef", role:"sous", skill:6, stress:6, comm:7, wage:180, trait:"Systems builder" },
  { id:"grill", name:"Grill Cook", role:"line", skill:5, stress:5, comm:5, wage:150, trait:"Heat calm" },
  { id:"saute", name:"Sauté Cook", role:"line", skill:5, stress:5, comm:5, wage:150, trait:"Pickup speed" },
  { id:"cold", name:"Cold Section", role:"line", skill:4, stress:5, comm:5, wage:140, trait:"Precision prep" },
  { id:"pastry", name:"Pastry", role:"pastry", skill:6, stress:4, comm:5, wage:160, trait:"Brand lift" },
  { id:"foh", name:"FOH Captain", role:"foh", skill:4, stress:5, comm:7, wage:150, trait:"Pacing control" },
  { id:"dish", name:"Dish/Prep", role:"support", skill:3, stress:6, comm:5, wage:120, trait:"Standards guard" },
];

export const PRIORITIES = [
  { id:"speed", name:"Speed" },
  { id:"quality", name:"Quality" },
  { id:"cost", name:"Cost" },
  { id:"culture", name:"Culture" },
  { id:"hygiene", name:"Hygiene" },
];

export const PREP_LEVELS = [
  { id:"conservative", name:"Conservative" },
  { id:"balanced", name:"Balanced" },
  { id:"aggressive", name:"Aggressive" },
];

export const MANAGER_MOVES = [
  { id:"maintenance", name:"Maintenance" },
  { id:"training", name:"Training" },
  { id:"deep_clean", name:"Deep Clean" },
  { id:"supplier_call", name:"Supplier Call" },
  { id:"pacing", name:"Pacing" },
];

export const CALLS = [
  { id:"simplify_plating", name:"Simplify plating" },
  { id:"eighty_six", name:"86 an item" },
  { id:"comp_table", name:"Comp table" },
  { id:"pause_walkins", name:"Pause walk-ins" },
  { id:"call_casual", name:"Call in casual" },
];

export const DISH_LIBRARY = [
  { id:"beef_sandwich", name:"Beef Sandwich", station:"cold", margin:3, complexity:2, prep:2, hold:3, identity:1 },
  { id:"pasta_ragu", name:"Pasta Ragù", station:"saute", margin:4, complexity:4, prep:4, hold:2, identity:2 },
  { id:"seasonal_fish", name:"Seasonal Fish", station:"grill", margin:4, complexity:5, prep:3, hold:1, identity:3 },
  { id:"roast_chicken", name:"Roast Chicken", station:"grill", margin:4, complexity:3, prep:3, hold:2, identity:1 },
  { id:"house_salad", name:"House Salad", station:"cold", margin:3, complexity:2, prep:2, hold:3, identity:1 },
  { id:"steak_frites", name:"Steak Frites", station:"grill", margin:5, complexity:5, prep:4, hold:1, identity:2 },
  { id:"soup_day", name:"Soup of the Day", station:"prep", margin:3, complexity:2, prep:3, hold:4, identity:1 },
  { id:"choc_cake", name:"Chocolate Cake", station:"pastry", margin:4, complexity:3, prep:4, hold:4, identity:2 },
];

export const DISH_TEMPLATES = [
  { id:"grilled_plate", name:"Grilled Protein + Sauce + Veg", slots:["protein","sauce","veg","texture"], base:{prep:3, complexity:4, hold:2, identity:2} },
  { id:"saute_plate", name:"Sauté Plate (Pan Roast)", slots:["protein","sauce","veg","texture"], base:{prep:3, complexity:5, hold:2, identity:2} },
  { id:"braise_bowl", name:"Braise + Purée + Pickle", slots:["protein","puree","pickle","texture"], base:{prep:5, complexity:3, hold:3, identity:2} },
  { id:"pasta_bowl", name:"Pasta Bowl", slots:["pasta","sauce","garnish","texture"], base:{prep:4, complexity:5, hold:1, identity:2} },
  { id:"cold_starter", name:"Cold Starter (Acid+Crunch+Creamy)", slots:["hero","acid","creamy","crunch"], base:{prep:3, complexity:3, hold:3, identity:2} },
];

export const COMPONENTS = {
  protein:["Fish","Chicken","Lamb","Beef","Mushroom"],
  sauce:["Pan Jus","Emulsion","Brown Butter","Broth","Purée Sauce"],
  veg:["Charred Greens","Roast Root Veg","Pickled Veg","Salad Garnish"],
  texture:["Crumb","Crisp","Seed","Chip"],
  puree:["Potato Purée","Cauliflower Purée","Carrot Purée"],
  pickle:["Quick Pickle","Fermented Pickle","Citrus Relish"],
  pasta:["Rigatoni","Spaghetti","Gnocchi"],
  garnish:["Herbs","Citrus Zest","Chilli Oil","Onion Crisp"],
  hero:["Oyster","Tuna","Tomato","Cucumber","Beetroot"],
  acid:["Citrus","Vinegar","Yuzu"],
  creamy:["Labneh","Aioli","Cream"],
  crunch:["Crouton","Fried Shallot","Seed Mix"],
};

export const TECHNIQUES = [
  { id:"grill", name:"Grill", mod:{ complexity:+1, hold:-1, identity:+1 } },
  { id:"sear", name:"Pan-sear", mod:{ complexity:+1, hold:-1 } },
  { id:"braise", name:"Braise", mod:{ prep:+2, hold:+1, complexity:-1 } },
  { id:"fry", name:"Fry", mod:{ complexity:+1, hold:-1, value:+1 } },
  { id:"pickle", name:"Pickle", mod:{ prep:+1, identity:+1, value:+0 } },
  { id:"smoke", name:"Smoke", mod:{ prep:+1, identity:+2, complexity:+1 } },
];

export const PROBLEMS = [
  { id:"pos_lag", title:"POS Lag", severity:2, effects:{ ticket:+0.12, culture:-0.02 } },
  { id:"coolroom_drift", title:"Coolroom Temp Drift", severity:3, effects:{ standardsDebt:+0.18, waste:+0.06 } },
  { id:"dishwasher_sick", title:"Dishwasher Calls In Sick", severity:3, effects:{ capacity:-0.10, standardsDebt:+0.12, culture:-0.03 } },
  { id:"walkin_surge", title:"Walk-in Surge", severity:3, effects:{ demand:+0.18, ticket:+0.10, stress:+0.12 } },
  { id:"allergen_near_miss", title:"Allergen Near-Miss", severity:4, effects:{ standardsDebt:+0.22, culture:-0.05, brand:-0.04 } },
  { id:"station_conflict", title:"Station Conflict", severity:2, effects:{ culture:-0.05, ticket:+0.05 } },
  { id:"late_delivery", title:"Delivery Late", severity:2, effects:{ ticket:+0.07, culture:-0.02 } },
  { id:"fryer_oil_due", title:"Fryer Oil Overdue", severity:2, effects:{ ticket:+0.08, quality:-0.06, standardsDebt:+0.05 } },
];
