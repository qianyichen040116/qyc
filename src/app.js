const state={area:'hongdae',mode:'bus',time:2,cell:null};
const el=id=>document.getElementById(id);
const selectArea=(area,cell=null)=>{Object.assign(state,{area,cell});render();};
const updateMap=makeMap(el('map'),selectArea);
function button(parent,label,action){
  const b=document.createElement('button');
  b.type='button';b.textContent=label;b.addEventListener('click',action);parent.append(b);
  return b;
}
const cellGroups=places.map((_,i)=>el("map").cells.filter(c=>c.nearest===i));
function selectedValue(mode,t){
  const total=record(state.area,mode,t)?.demandValue;
  if(total==null || !state.cell)return total;
  const cell=state.cell.cellData;
  const weight=c=>Math.exp(-c.distances[cell.nearest]/1800);
  const group=cellGroups[cell.nearest];
  return Math.round(total*weight(cell)/group.reduce((sum,c)=>sum+weight(c),0)*100)/100;
}
const hours=slots.map((slot,t)=>button(el('hours'),slot,()=>{state.time=t;render();}));
const controls=modes.map((mode)=>{
  const b=button(el('modes'),mode.label,()=>{state.mode=mode.id;render();});
  b.style.setProperty('--mode',mode.color);
  const icon=svg('svg',{viewBox:'0 0 24 24','aria-hidden':'true'},b);
  svg('path',{d:mode.icon,fill:'none',stroke:'currentColor','stroke-width':1.7,'stroke-linejoin':'round'},icon);
  b.prepend(icon);
  return b;
});
for(const [id,label] of places)el('regions').add(new Option(label,id));
el('regions').addEventListener('change',e=>selectArea(e.target.value));
function render(){
  el('regions').value=state.area;
  hours.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===state.time)));
  controls.forEach((b,i)=>b.setAttribute('aria-pressed',String(modes[i].id===state.mode)));
  updateMap(state);
  drawTrend(document.querySelector('#timeline svg'),state);
  drawShares(el('shares'),state);
  const [,ko,en]=places.find(p=>p[0]===state.area);
  const mode=modes.find(m=>m.id===state.mode);
  const data=record(state.area,state.mode,state.time);
  const available=data?.status==='available';
  el('info').innerHTML='<p class="tag">04 / SELECTED AREA</p><h2></h2><p class="stamp"></p><strong></strong><small></small>';
  el('info').querySelector('h2').textContent=ko+' / '+en.toUpperCase();
  el('info').querySelector('.stamp').textContent=slots[state.time]+' · '+mode.label;
  el('info').querySelector('strong').textContent=available?selectedValue(state.mode,state.time):'—';
  el('info').querySelector('small').textContent=available?'수요 지수 · '+data.demandLevel+' · 시뮬레이션 데이터':data?'운행 없음으로 설정된 시나리오 · 실제 시간표는 역별 확인':'데이터 없음';
  const shares=modes.map(m=>selectedValue(m.id,state.time)??0);
  const scope=state.cell?'격자 '+Math.floor(state.cell.cellData.x/9+1)+' · '+Math.floor(state.cell.cellData.y/9+1):'권역 전체';
  el('map-summary').innerHTML='<small>'+scope+' · 시뮬레이션</small><b>'+ko+'</b><span>'+slots[state.time]+' · '+mode.label+'</span><strong>'+ (available?selectedValue(state.mode,state.time):'—')+'</strong><small>'+ (available?'수요 지수':'이용 정보 없음')+'</small>';
  el('detail-title').textContent=ko+' / '+scope+' / 시간대별 추이';
  el('detail-note').textContent='시뮬레이션 수요 지수 · '+(state.cell?'선택한 격자의 추정값입니다.':'선택한 권역의 합계입니다.')+' 실제 이용 인원은 아닙니다.';
  el('detail-data').innerHTML='<table><caption>교통수단별 6개 시간대 비교</caption><thead><tr><th scope="col">시간대</th>'+modes.map(m=>'<th scope="col">'+m.label+'</th>').join('')+'</tr></thead><tbody>'+slots.map((s,i)=>'<tr class="'+(state.time===i?'active-row':'')+'"><th scope="row">'+s+'</th>'+modes.map(m=>'<td class="'+(m.id===state.mode?'active-mode':'')+'">'+(selectedValue(m.id,i)??'—')+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
  placePopup();
  if(state.cell)softly(el('map-summary').querySelector('strong'),[{opacity:.28,transform:'translateY(3px)'},{opacity:1,transform:'none'}],260);
  drawDetail(el('detail-chart'),state);
  const total=shares.reduce((a,b)=>a+b,0);
  el('share-label').textContent=total?modes.map((m,i)=>m.label+' '+Math.round(shares[i]/total*100)+'%').join(' · '):'비율 데이터 없음';
}
render();


function placePopup(){
  const popup=el('map-summary');
  popup.hidden=!state.cell;
  if(!state.cell){popup.anchor=null;return;}
  const map=el('map'), panel=map.parentElement;
  const cell=state.cell.getBoundingClientRect();
  const bounds=panel.getBoundingClientRect();
  const right=cell.right-bounds.left+8;
  popup.style.left=(right+popup.offsetWidth<=bounds.width?right:Math.max(4,cell.left-bounds.left-popup.offsetWidth-8))+'px';
  if(popup.anchor!==state.cell){
    popup.anchor=state.cell;
    popup.getAnimations().forEach(animation=>animation.cancel());
    softly(popup,[{opacity:0,transform:'translateX(-5px) scale(.95)'},{opacity:1,transform:'none'}],280);
  }
  popup.style.top=Math.max(4,Math.min(cell.top-bounds.top-8,bounds.height-popup.offsetHeight-4))+'px';
}
window.addEventListener('resize',placePopup);
document.addEventListener('keydown',event=>{
  if(event.key==='Escape' && state.cell)selectArea(state.area);
});
el('map').addEventListener('click',event=>{
  if(!event.target.closest('.cell,.marker') && state.cell)selectArea(state.area);
});
function enableMapPanning(map) {
  const view = {x:90,y:82,width:520,height:431};
  let gesture = null;
  let suppressClick = false;
  function paint() {
    map.setAttribute('viewBox',[view.x,view.y,view.width,view.height].join(' '));
    placePopup();
  }
  map.setAttribute('tabindex','0');
  map.setAttribute('aria-label','서울 지도. 드래그하거나 방향키로 이동');
  map.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;
    gesture={id:event.pointerId,x:event.clientX,y:event.clientY,startX:view.x,startY:view.y,moved:false};
  });
  window.addEventListener('pointermove',event=>{
    if(!gesture || event.pointerId!==gesture.id)return;
    const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
    if(Math.hypot(dx,dy)>5)gesture.moved=true;
    if(!gesture.moved)return;
    const scale=Math.min(map.clientWidth/view.width,map.clientHeight/view.height);
    view.x=Math.max(0,Math.min(768-view.width,gesture.startX-dx/scale));
    view.y=Math.max(0,Math.min(580-view.height,gesture.startY-dy/scale));
    map.classList.add('panning');
    paint();
  });
  window.addEventListener('pointerup',event=>{
    if(!gesture || event.pointerId!==gesture.id)return;
    suppressClick=gesture.moved;
    gesture=null;
    map.classList.remove('panning');
    setTimeout(()=>suppressClick=false,0);
  });
  window.addEventListener('pointercancel',()=>{gesture=null;map.classList.remove('panning');});
  map.addEventListener('click',event=>{
    if(suppressClick){event.stopImmediatePropagation();event.preventDefault();}
  },true);
  map.addEventListener('wheel',event=>{
    event.preventDefault();
    view.x=Math.max(0,Math.min(768-view.width,view.x+event.deltaX*.35));
    view.y=Math.max(0,Math.min(580-view.height,view.y+event.deltaY*.35));
    paint();
  },{passive:false});
  map.addEventListener('keydown',event=>{
    const steps={ArrowLeft:[-20,0],ArrowRight:[20,0],ArrowUp:[0,-20],ArrowDown:[0,20]};
    if(event.target!==map || !steps[event.key])return;
    event.preventDefault();
    view.x=Math.max(0,Math.min(768-view.width,view.x+steps[event.key][0]));
    view.y=Math.max(0,Math.min(580-view.height,view.y+steps[event.key][1]));
    paint();
  });
  paint();
}
enableMapPanning(el('map'));
