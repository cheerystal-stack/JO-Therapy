
const STORE_KEY = "joslerTherapyCasesV1";
const $ = id => document.getElementById(id);

function loadCases(){
  try{return JSON.parse(localStorage.getItem(STORE_KEY)) || []}
  catch{return []}
}
function saveCases(cases){ localStorage.setItem(STORE_KEY, JSON.stringify(cases)); }
function pct(v,max){ return max ? Math.max(0,Math.min(100,(v/max)*100)) : 0; }
function escapeHtml(s){ return String(s??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch])); }
function getArea(id){ return AREA_MASTER.find(a=>a.id===id); }
function getGroup(groupId){
  for(const area of AREA_MASTER){
    const g=area.groups.find(x=>x.id===groupId);
    if(g) return g;
  }
  return null;
}
function generalCaseCount(cases){
  return cases.filter(c=>["general1","general2","general3"].includes(c.areaId)).length;
}

function initSelects(){
  const areaSelect=$("caseArea");
  const filter=$("areaFilter");
  AREA_MASTER.forEach(a=>{
    const o=document.createElement("option"); o.value=a.id; o.textContent=a.name; areaSelect.appendChild(o);
    const f=document.createElement("option"); f.value=a.id; f.textContent=a.name; filter.appendChild(f);
  });
}
function fillGroupSelect(areaId, selected=""){
  const sel=$("caseGroup");
  sel.innerHTML="";
  const area=getArea(areaId);
  if(!area){
    sel.disabled=true;
    sel.innerHTML='<option value="">先に領域を選択してください</option>';
    return;
  }
  sel.disabled=false;
  sel.appendChild(new Option("選択してください",""));
  area.groups.forEach(g=>sel.appendChild(new Option(g.name,g.id)));
  if(selected) sel.value=selected;
}

function officialGroupSet(cases){
  return new Set(cases.map(c=>c.groupId).filter(Boolean));
}

function refreshDashboard(){
  const cases=loadCases();
  const groups=officialGroupSet(cases);
  const summaries=cases.filter(c=>c.summary).length;
  const inpatient=cases.filter(c=>c.setting==="inpatient").length;
  const outpatient=cases.filter(c=>c.setting==="outpatient").length;
  const outside=cases.filter(c=>c.program==="outside").length;

  $("caseCount").textContent=cases.length;
  $("groupCount").textContent=groups.size;
  $("summaryCount").textContent=summaries;
  $("caseBar").style.width=pct(cases.length,REQUIREMENTS.totalCases)+"%";
  $("groupBar").style.width=pct(groups.size,REQUIREMENTS.totalGroups)+"%";
  $("summaryBar").style.width=pct(summaries,REQUIREMENTS.summaries)+"%";
  $("inpatientCount").textContent=`${inpatient} / ${REQUIREMENTS.inpatientMin}以上`;
  $("outpatientCount").textContent=`${outpatient} / 最大${REQUIREMENTS.outpatientMax}`;
  $("outsideCount").textContent=`${outside} / 最大${REQUIREMENTS.outsideMax}`;
  renderAreaProgress(cases);
}

function renderAreaProgress(cases){
  const wrap=$("areaProgress");
  wrap.innerHTML="";
  const groupSet=officialGroupSet(cases);
  const genCases=generalCaseCount(cases);

  AREA_MASTER.forEach(area=>{
    const areaCases=cases.filter(c=>c.areaId===area.id).length;
    const groupCount=area.groups.filter(g=>groupSet.has(g.id)).length;
    const caseMin=area.caseMin;
    const caseDone = caseMin ? areaCases>=caseMin : genCases>=GENERAL_CASE_MIN;
    const groupDone = groupCount>=area.groupMin;
    const row=document.createElement("div");
    row.className="area-row"+(caseDone&&groupDone?" done":"");
    const caseLabel=caseMin ? `${areaCases}/${caseMin}` : `${genCases}/${GENERAL_CASE_MIN}（総合内科計）`;
    row.innerHTML=`
      <div class="area-head">
        <div class="area-name">${escapeHtml(area.name)}</div>
        <div class="area-values">症例 <strong>${caseLabel}</strong>　疾患群 <strong>${groupCount}/${area.groupMin}</strong></div>
      </div>
      <div class="area-bars">
        <div class="tiny-bar-wrap"><small>症例</small><div class="tiny-bar"><span style="width:${pct(caseMin?areaCases:genCases,caseMin||GENERAL_CASE_MIN)}%"></span></div></div>
        <div class="tiny-bar-wrap"><small>疾患群</small><div class="tiny-bar"><span style="width:${pct(groupCount,area.groupMin)}%"></span></div></div>
      </div>`;
    wrap.appendChild(row);
  });
}

const dialog=$("caseDialog");
function resetForm(){
  $("caseForm").reset();
  $("editingId").value="";
  $("deleteCaseBtn").classList.add("hidden");
  $("dialogKicker").textContent="NEW CASE";
  $("dialogTitle").textContent="症例を登録";
  fillGroupSelect("");
  updateWarnings();
}
function openNewCase(){ resetForm(); dialog.showModal(); }
function openEditCase(id){
  const item=loadCases().find(c=>c.id===id); if(!item)return;
  $("editingId").value=item.id;
  $("caseTitle").value=item.title||"";
  $("caseArea").value=item.areaId||"";
  fillGroupSelect(item.areaId||"",item.groupId||"");
  $("caseSetting").value=item.setting||"inpatient";
  $("caseProgram").value=item.program||"inside";
  $("caseSummary").checked=!!item.summary;
  $("deleteCaseBtn").classList.remove("hidden");
  $("dialogKicker").textContent="EDIT CASE";
  $("dialogTitle").textContent="症例を編集";
  updateWarnings();
  dialog.showModal();
}

function updateWarnings(){
  const warnings=[];
  if($("caseSetting").value==="outpatient"){
    const current=loadCases().filter(c=>c.setting==="outpatient" && c.id!==$("editingId").value).length;
    if(current>=REQUIREMENTS.outpatientMax) warnings.push(`外来症例は最大${REQUIREMENTS.outpatientMax}症例です。`);
    else if(current>=REQUIREMENTS.outpatientMax-2) warnings.push(`外来症例は上限まで残り${REQUIREMENTS.outpatientMax-current}症例です。`);
  }
  if($("caseProgram").value==="outside"){
    const current=loadCases().filter(c=>c.program==="outside" && c.id!==$("editingId").value).length;
    if(current>=REQUIREMENTS.outsideMax) warnings.push(`プログラム外症例は最大${REQUIREMENTS.outsideMax}症例です。`);
  }
  const box=$("caseWarnings");
  box.innerHTML=warnings.map(w=>`⚠ ${escapeHtml(w)}`).join("<br>");
  box.classList.toggle("hidden",warnings.length===0);
}

function renderCaseList(){
  const q=($("caseSearch").value||"").trim().toLowerCase();
  const areaFilter=$("areaFilter").value;
  const cases=loadCases().filter(c=>{
    if(areaFilter && c.areaId!==areaFilter)return false;
    const area=getArea(c.areaId)?.name || c.area || "";
    const group=getGroup(c.groupId)?.name || c.group || "";
    return !q || [c.title,area,group].filter(Boolean).some(v=>v.toLowerCase().includes(q));
  }).sort((a,b)=>new Date(b.updatedAt||b.createdAt)-new Date(a.updatedAt||a.createdAt));

  const list=$("caseList"), empty=$("emptyCases");
  list.innerHTML=""; empty.style.display=cases.length?"none":"block";
  cases.forEach(item=>{
    const area=getArea(item.areaId)?.name || item.area || "領域未設定";
    const group=getGroup(item.groupId)?.name || item.group || "疾患群未設定";
    const legacy=!item.groupId && !!item.group;
    const row=document.createElement("article");
    row.className="case-row";
    row.innerHTML=`
      <div>
        <h3>${escapeHtml(item.title)}</h3>
        <div class="case-meta">
          <span class="badge">${escapeHtml(area)}</span>
          <span class="badge ${legacy?"legacy":""}">${escapeHtml(group)}${legacy?"（旧入力）":""}</span>
          <span class="badge">${item.setting==="outpatient"?"外来":"入院"}</span>
          <span class="badge">${item.program==="outside"?"プログラム外":"プログラム内"}</span>
          ${item.summary?'<span class="badge summary">病歴要約</span>':""}
        </div>
      </div>
      <button type="button" class="edit-btn" data-edit-id="${item.id}">編集</button>`;
    list.appendChild(row);
  });
  list.querySelectorAll("[data-edit-id]").forEach(b=>b.addEventListener("click",()=>openEditCase(b.dataset.editId)));
}

$("caseArea").addEventListener("change",e=>fillGroupSelect(e.target.value));
$("caseSetting").addEventListener("change",updateWarnings);
$("caseProgram").addEventListener("change",updateWarnings);
$("newCaseBtn").addEventListener("click",openNewCase);
$("newCaseBtn2").addEventListener("click",openNewCase);
$("closeCaseDialog").addEventListener("click",()=>dialog.close());

$("caseForm").addEventListener("submit",e=>{
  e.preventDefault();
  const title=$("caseTitle").value.trim();
  const areaId=$("caseArea").value;
  const groupId=$("caseGroup").value;
  if(!title||!areaId||!groupId){
    alert("症例名・領域・疾患群を入力してください。");
    return;
  }
  const id=$("editingId").value;
  const cases=loadCases();
  const old=cases.find(c=>c.id===id);
  const item={
    id:id||(crypto.randomUUID?crypto.randomUUID():String(Date.now())),
    title,areaId,groupId,
    setting:$("caseSetting").value,
    program:$("caseProgram").value,
    summary:$("caseSummary").checked,
    createdAt:old?.createdAt||new Date().toISOString(),
    updatedAt:new Date().toISOString()
  };
  if(id){const i=cases.findIndex(c=>c.id===id); if(i>=0)cases[i]=item;} else cases.push(item);
  saveCases(cases); dialog.close(); refreshDashboard(); renderCaseList();
});

$("deleteCaseBtn").addEventListener("click",()=>{
  const id=$("editingId").value;if(!id)return;
  if(!confirm("この症例を削除しますか？"))return;
  saveCases(loadCases().filter(c=>c.id!==id));
  dialog.close();refreshDashboard();renderCaseList();
});
$("caseSearch").addEventListener("input",renderCaseList);
$("areaFilter").addEventListener("change",renderCaseList);

document.querySelector('[data-nav="home"]').addEventListener("click",()=>window.scrollTo({top:0,behavior:"smooth"}));
document.querySelector('[data-nav="cases"]').addEventListener("click",()=>$("casesPanel").scrollIntoView({behavior:"smooth"}));
document.querySelector('[data-nav="summary"]').addEventListener("click",()=>alert("病歴要約作成は次フェーズで実装します。"));
document.querySelector('[data-nav="check"]').addEventListener("click",()=>alert("J-OSLERチェックは次フェーズで実装します。"));

initSelects();
refreshDashboard();
renderCaseList();

if("serviceWorker" in navigator){
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(console.error));
}
