const svgNS = 'http://www.w3.org/2000/svg';
function svg(tag, attrs, parent) {
  const el = document.createElementNS(svgNS, tag);
  for (const [key,value] of Object.entries(attrs)) el.setAttribute(key,value);
  parent.append(el);
  return el;
}
function inside(x,y,ring) {
  let hit=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const [a,b]=ring[i], [c,d]=ring[j];
    if ((b>y)!==(d>y) && x<(c-a)*(y-b)/(d-b)+a) hit=!hit;
  }
  return hit;
}
function makeMap(map, select) {
  const boundary=rings.map(r=>'M'+r.map(p=>p.join(',')).join('L')+'Z').join('');
  const clip=svg('clipPath',{id:'city'},svg('defs',{},map));
  svg('path',{d:boundary,'clip-rule':'evenodd'},clip);
  svg('image',{href:'../assets/seoul-map.webp',width:768,height:580,class:'cartographic-base'},map);
  svg('path',{d:boundary,fill:'#fff9ed','fill-opacity':.28},map);
  const layer=svg('g',{'clip-path':'url(#city)'},map);
  const cells=[];
  for(let y=24;y<534;y+=9) for(let x=36;x<654;x+=9){
    if(!rings.some(r=>[[0,0],[9,0],[0,9],[9,9],[4,4]].some(([dx,dy])=>inside(x+dx,y+dy,r)))) continue;
    const distances=places.map(p=>(x+4-p[3])**2+(y+4-p[4])**2);
    const nearest=distances.indexOf(Math.min(...distances));
    const node=svg('rect',{x,y,width:8.4,height:8.4,class:'cell'},layer);
    node.addEventListener('click',()=>select(places[nearest][0],node));
    const cell={node,nearest,distances,x,y}; cells.push(cell); node.cellData=cell;
  }
  svg('path',{d:boundary,fill:'none',stroke:'#434648','stroke-width':1.4,'pointer-events':'none'},map);
  const markers=places.map(([id,label,,x,y],i)=>{
    const lift=[-25,23,-25,-25,24][i];
    const g=svg('g',{transform:'translate('+x+' '+y+')',class:'marker',role:'button',tabindex:0,'aria-label':label},map);
    svg('path',{d:'M0 0L12 '+lift,stroke:'#77838a'},g);
    svg('circle',{r:5},g);
    svg('rect',{x:11,y:lift-13,width:66,height:26,rx:3},g);
    svg('text',{x:19,y:lift+5},g).textContent=label;
    g.addEventListener('click',()=>select(id));
    g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(id);}});
    return g;
  });
  map.cells=cells;
  return (state)=>{
    const palette = {
      taxi: [[244,177,157],[153,42,65]],
      bus: [[180,212,173],[39,103,65]],
      subway: [[177,211,234],[39,95,149]]
    }[state.mode];
    const [light, dark] = palette;
    const rgb = value => 'rgb('+value.join(' ')+')';
    const accent = modes.find(mode => mode.id === state.mode).color;
    document.querySelector('.poster').style.setProperty('--active-mode',accent);
    document.querySelector('.legend i').style.background =
      'linear-gradient(90deg,'+rgb(light)+','+rgb(dark)+')';
    const scores=places.map(([id])=>record(id,state.mode,state.time)?.demandValue ?? 0);
    for(const {node,nearest,distances} of cells){
      const weights=distances.map((d,i)=>scores[i]/340*Math.exp(-d/3300));
      const k=Math.min(1,Math.max(...weights)*(.83+.17*Math.sin(+node.getAttribute('x')*6+ +node.getAttribute('y'))));
      node.style.fill=rgb(light.map((value,index)=>Math.round(value+(dark[index]-value)*k)));
      node.style.fillOpacity=k<.018 ? .075 : (.32+.64*k)*(places[nearest][0]===state.area?1:.82);
      node.classList.toggle('selected-cell',state.cell===node);
    }
    markers.forEach((el,i)=>el.setAttribute('aria-pressed',String(places[i][0]===state.area)));
  };
}
function softly(node, frames, duration){ if(!matchMedia("(prefers-reduced-motion: reduce)").matches)node.animate(frames,{duration,easing:"cubic-bezier(.22,.75,.3,1)"}); }
function drawTrend(target,state) {
  target.replaceChildren();
  for (const x of [12,48,84]) svg('line',{x1:x,x2:x,y1:0,y2:300,stroke:'#dedad3'},target);
  for (let i=0;i<6;i++) svg('line',{x1:0,x2:100,y1:25+i*50,y2:25+i*50,stroke:'#dedad3'},target);
  const ceiling=state.cell?Math.max(.01,...modes.flatMap(m=>slots.map((_,i)=>selectedValue(m.id,i)??0)))*1.08:350;
  for (const mode of [...modes].sort((a,b)=>Number(a.id===state.mode)-Number(b.id===state.mode))) {
    let d='', previous=null;
    for(let i=0;i<6;i++){
      const value=selectedValue(mode.id,i);
      if(value==null){previous=null;continue;}
      const x=12+value/ceiling*72,y=25+i*50;
      d+=previous===null?'M'+x+' '+y:'C'+previous+' '+(y-16)+' '+x+' '+(y-34)+' '+x+' '+y;
      previous=x;
    }
    const active=mode.id===state.mode;
    const curve=svg('path',{d,stroke:mode.color,'stroke-width':active?2.8:1.5,fill:'none',opacity:active?1:.45},target);
    target.curves ??= new Map();
    const previousPath=target.curves.get(mode.id);
    target.curves.set(mode.id,d);
    if(previousPath && previousPath!==d && previousPath.replace(/[\d.]+/g,'')===d.replace(/[\d.]+/g,'')){
      softly(curve,[{d:'path('+JSON.stringify(previousPath)+')'},{d:'path('+JSON.stringify(d)+')'}],340);
    }
    const selected=selectedValue(mode.id,state.time);
    if(selected!=null) svg('circle',{cx:12+selected/ceiling*72,cy:25+state.time*50,r:active?4:2.4,fill:mode.color},target);
  }
}
function drawShares(target,state) {
  target.replaceChildren();
  slots.forEach((_,t)=>{
    const values=modes.map(m=>selectedValue(m.id,t) ?? 0);
    const total=values.reduce((a,b)=>a+b,0);
    if(!total)return;
    let a=Math.PI;
    values.forEach((v,i)=>{
      if(!v)return;
      const r=70-9*t,b=a+Math.PI*v/total;
      const point=q=>[100+r*Math.cos(q),74+r*Math.sin(q)].join(',');
      svg('path',{d:'M'+point(a)+'A'+r+','+r+' 0 0 1 '+point(b),fill:'none',stroke:modes[i].color,'stroke-width':t===state.time?6:4,opacity:t===state.time?1:.48},target);
      a=b;
    });
  });
}


function drawDetail(target,state){
  target.replaceChildren();
  const values=slots.map((_,i)=>selectedValue(state.mode,i));
  const max=Math.max(1,...values.filter(v=>v!=null));
  const color=modes.find(m=>m.id===state.mode).color;
  values.forEach((value,i)=>{
    const x=44+i*98, y=value==null?0:value/max*110;
    svg('line',{x1:x-12,x2:x+58,y1:145,y2:145,stroke:'#c7c2b8'},target);
    if(value!=null)svg('rect',{x,y:145-y,width:46,height:y,fill:color,opacity:i===state.time?1:.53},target);
    svg('text',{x:x+23,y:Math.max(19,138-y),'text-anchor':'middle',class:'bar-value'},target).textContent=value??'—';
    svg('text',{x:x+23,y:169,'text-anchor':'middle',class:'bar-time'},target).textContent=slots[i].slice(0,5);
  });
}
