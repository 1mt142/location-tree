function seed(){
  const r=[];let id=0;
  const add=(parent,name)=>{id++;r.push({id,parent_id:parent,name});return id};
  const idn=add(null,"Indonesia");
  const jk=add(idn,"DKI Jakarta");
  const js=add(jk,"Jakarta Selatan");
  add(js,"Kebayoran Baru");add(js,"Tebet");add(js,"Kuningan");
  add(add(jk,"Jakarta Pusat"),"Menteng");
  const bali=add(idn,"Bali");
  add(bali,"Denpasar");add(bali,"Badung");
  const sg=add(null,"Singapore");
  const central=add(sg,"Central Region");
  ["Orchard","Marina Bay","Tanjong Pagar"].forEach(n=>add(central,n));
  const east=add(sg,"East Region");
  add(east,"Tampines");add(east,"Bedok");
  const uae=add(null,"United Arab Emirates");
  const dxb=add(uae,"Dubai");
  ["Dubai Marina","Downtown Dubai","Jumeirah"].forEach(n=>add(dxb,n));
  const auh=add(uae,"Abu Dhabi");
  add(auh,"Al Reem Island");add(auh,"Yas Island");
  add(uae,"Sharjah");
  add(null,"Seminyak");
  return r;
}
let rows=seed(), open=new Set(), adding=null, dragId=null, view="tree";
const initOpen=()=>{open=new Set(rows.filter(r=>r.parent_id==null||byId(r.parent_id)?.parent_id==null).map(r=>r.id))};
const byId=id=>rows.find(r=>r.id===id);
const kids=id=>rows.filter(r=>r.parent_id===id);
const descendants=id=>{const o=[];const w=i=>kids(i).forEach(k=>{o.push(k.id);w(k.id)});w(id);return o};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const ARROW='<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M3 1.5 7 5 3 8.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
initOpen();

function renderTree(){
  const tree=document.getElementById("tree");tree.innerHTML="";
  const build=(pid,ul)=>{
    kids(pid).forEach(r=>{
      const li=document.createElement("li");
      const ch=kids(r.id).length,isOpen=open.has(r.id);
      const row=document.createElement("div");
      row.className="row";row.draggable=true;row.dataset.id=r.id;
      row.innerHTML=`<button class="tog${isOpen?" open":""}" ${ch?"":"disabled"} aria-label="Expand or collapse">${ARROW}</button>
        <span class="nm">${esc(r.name)}</span>${ch?`<span class="cnt">${ch}</span>`:""}
        <button class="ic add" aria-label="Add child to ${esc(r.name)}">+ Child</button>
        <button class="ic del" aria-label="Delete ${esc(r.name)}">Delete</button>`;
      row.querySelector(".tog").onclick=()=>{open.has(r.id)?open.delete(r.id):open.add(r.id);renderTree()};
      row.querySelector(".add").onclick=()=>{adding=r.id;open.add(r.id);renderTree()};
      const delBtn=row.querySelector(".del");
      delBtn.onclick=()=>{
        if(delBtn.dataset.armed){remove(r.id)}else{delBtn.dataset.armed="1";delBtn.style.opacity=1;delBtn.style.color="var(--danger)";delBtn.textContent=ch?"Delete all?":"Sure?"}
      };
      wireDnD(row,r.id);
      li.appendChild(row);
      if(adding===r.id){
        const f=document.createElement("form");f.className="inline";
        f.innerHTML=`<input class="f" placeholder="Area name inside ${esc(r.name)}" autocomplete="off"><button class="btn primary" type="submit">Add</button><button class="btn" type="button">Cancel</button>`;
        const inp=f.querySelector("input");
        f.onsubmit=e=>{e.preventDefault();const n=inp.value.trim();if(!n)return toast("Type a name first",true);
          if(kids(r.id).some(k=>k.name.toLowerCase()===n.toLowerCase()))return toast(`"${n}" already exists here`,true);
          rows.push({id:Math.max(0,...rows.map(x=>x.id))+1,parent_id:r.id,name:n});inp.value="";renderAll(true);toast(`Added "${n}" to ${r.name}`)};
        f.querySelector('[type="button"]').onclick=()=>{adding=null;renderTree()};
        inp.onkeydown=e=>{if(e.key==="Escape"){adding=null;renderTree()}};
        li.appendChild(f);
      }
      if((ch&&isOpen)){const sub=document.createElement("ul");sub.className="tree";build(r.id,sub);li.appendChild(sub)}
      ul.appendChild(li);
    });
  };
  build(null,tree);
  if(!tree.children.length)tree.innerHTML='<div class="empty">No locations yet. Add a country above.</div>';
  const inp=tree.querySelector(".inline input");if(inp)inp.focus();
}

function canDrop(src,t){return src!=null&&t!==src&&!(t!=null&&descendants(src).includes(t))}
function wireDnD(el,id){
  el.addEventListener("dragstart",e=>{dragId=id;el.classList.add("dragging");e.dataTransfer.effectAllowed="move";try{e.dataTransfer.setData("text/plain",String(id))}catch(_){}});
  el.addEventListener("dragend",()=>{dragId=null;document.querySelectorAll(".dragging,.drop-in,.drop-bad").forEach(n=>n.classList.remove("dragging","drop-in","drop-bad"))});
  el.addEventListener("dragover",e=>{if(dragId==null)return;e.preventDefault();const ok=canDrop(dragId,id);el.classList.toggle("drop-in",ok);el.classList.toggle("drop-bad",!ok)});
  el.addEventListener("dragleave",()=>el.classList.remove("drop-in","drop-bad"));
  el.addEventListener("drop",e=>{e.preventDefault();el.classList.remove("drop-in","drop-bad");move(dragId,id)});
}
const rz=document.getElementById("rootzone");
rz.addEventListener("dragover",e=>{if(dragId==null)return;e.preventDefault();rz.classList.add("drop-in")});
rz.addEventListener("dragleave",()=>rz.classList.remove("drop-in"));
rz.addEventListener("drop",e=>{e.preventDefault();rz.classList.remove("drop-in");move(dragId,null)});

function move(src,t){
  const s=byId(src);if(!s)return;
  if(s.parent_id===t)return;
  if(!canDrop(src,t))return toast("Can't move a location inside itself",true);
  s.parent_id=t;if(t!=null)open.add(t);
  toast(`Moved "${s.name}" ${t==null?"to top level":"into "+byId(t).name}`);renderAll();
}
function remove(id){
  const r=byId(id),ids=[id,...descendants(id)];
  rows=rows.filter(x=>!ids.includes(x.id));if(ids.includes(adding))adding=null;
  toast(`Deleted "${r.name}"${ids.length>1?` and ${ids.length-1} inside it`:""}`);renderAll();
}

function renderOut(){
  const out=document.getElementById("out");
  if(!rows.length){out.textContent="(empty)";return}
  if(view==="tree"){
    const lines=[];
    const w=(pid,pre)=>{const k=kids(pid);k.forEach((r,i)=>{const last=i===k.length-1;lines.push(pre+(pid==null?"":(last?"└─ ":"├─ "))+esc(r.name));w(r.id,pid==null?"":pre+(last?"   ":"│  "))})};
    kids(null).forEach((r,i)=>{if(i)lines.push("");lines.push(`<span class="k">${esc(r.name)}</span>`);w(r.id,"")});
    out.innerHTML=lines.join("\n");
  }else{
    const nest=pid=>kids(pid).map(r=>{const c=nest(r.id);return c.length?{id:r.id,name:r.name,children:c}:{id:r.id,name:r.name}});
    out.innerHTML=esc(JSON.stringify(nest(null),null,2)).replace(/&quot;(\w+)&quot;:/g,'<span class="k">"$1"</span>:');
  }
}
let tt;function toast(m,bad){const t=document.getElementById("toast");t.textContent=m;t.className="toast show"+(bad?" bad":"");clearTimeout(tt);tt=setTimeout(()=>t.className="toast"+(bad?" bad":""),2200)}
function renderAll(keepAdding){if(!keepAdding)adding=null;renderTree();renderOut()}

document.getElementById("addRootForm").onsubmit=e=>{e.preventDefault();const i=document.getElementById("rootName"),n=i.value.trim();
  if(!n)return toast("Type a country name first",true);
  rows.push({id:Math.max(0,...rows.map(x=>x.id))+1,parent_id:null,name:n});i.value="";renderAll();toast(`Added "${n}"`)};
document.getElementById("expandAll").onclick=()=>{rows.forEach(r=>open.add(r.id));renderTree()};
document.getElementById("collapseAll").onclick=()=>{open.clear();renderTree()};
document.getElementById("reset").onclick=()=>{rows=seed();initOpen();renderAll();toast("Sample data restored")};
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{view=b.dataset.v;document.querySelectorAll(".tab").forEach(x=>x.setAttribute("aria-selected",x===b));renderOut()});
renderAll();
