const slots = ['22:00–23:00','23:00–00:00','00:00–01:00','01:00–02:00','02:00–03:00','03:00–04:00'];
const modes = [
  {id:'taxi', label:'택시', color:'#ad454e', icon:'M3 13l2-6h14l2 6v6H3z M5 15h2m10 0h2M5 19v2m14-2v2'},
  {id:'bus', label:'심야버스', color:'#367451', icon:'M4 4h16v15H4z M4 12h16M7 15h1m8 0h1M6 19v2m12-2v2'},
  {id:'subway', label:'지하철', color:'#487b99', icon:'M6 3h12v15H6z M6 11h12m-9 4h1m4 0h1M9 18l-3 4m9-4l3 4'}
];
const profiles = [
  [[182,264,314,279,211,145],[115,158,234,211,157,108],[247,163,24,null,null,null]],
  [[210,298,336,300,252,163],[95,147,196,205,171,103],[275,197,39,11,null,null]],
  [[219,230,223,183,107,74],[130,167,213,182,106,73],[212,156,26,null,null,null]],
  [[127,196,255,230,158,102],[87,123,173,171,108,80],[184,139,31,null,null,null]],
  [[151,167,149,123,93,61],[104,137,168,132,95,65],[152,107,17,null,null,null]]
];
const mobilityData = places.flatMap(([locationId], area) => modes.flatMap(({id:mode}, m) =>
  slots.map((timeSlot, t) => {
    const demandValue = profiles[area][m][t];
    return {locationId, timeSlot, mode, demandValue,
      demandLevel: demandValue === null ? '—' : demandValue >= 240 ? '높음' : demandValue >= 120 ? '보통' : '낮음',
      dataType:'simulated', status:demandValue === null ? 'unavailable' : 'available'};
  })
));
const records = new Map(mobilityData.map(d => [[d.locationId,d.mode,d.timeSlot].join('|'),d]));
const record = (area, mode, t) => records.get([area,mode,slots[t]].join('|'));

