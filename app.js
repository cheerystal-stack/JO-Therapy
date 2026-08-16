const STORE_KEY = "joslerTherapyCasesV1";
const $ = (id) => document.getElementById(id);
function loadCases(){ try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch { return []; } }
function saveCases(cases){ localStorage.setItem(STORE_KEY, JSON.stringify(cases)); }
function pct(value,max){ return Math.max(0,Math.min(100,(value/max)*100)); }
function escapeHtml(str){ return String(str ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch])); }
function refreshDashboard(){
  const cases=loadCases(); const groups=new Set(cases.map(c=>(c.group||"").trim()).filter(Boolean));
  const summaries=cases.filter(c=>c.summary).length; const inpatient=cases.filter(c=>c.setting==="inpatient").length; const outpatient=cases.filter(c=>c.setting==="outpatient").length; const outside=cases.filter(c=>c.program==="outside").length;
  $("caseCount").textContent=cases.length; $("groupCount").textContent=groups.size; $("summaryCount").textContent=summaries;
  $("caseBar").style.width=pct(cases.length,120)+"%"; $("groupBar").style.width=pct(groups.size,56)+"%"; $("summaryBar").style.width=pct(summaries,29)+"%";
  $("inpatientCount").textContent=`${inpatient} / 108以上`; $("outpatientCount").textContent=`${outpatient} / 最大12`; $("outsideCount").textContent=`${outside} / 最大60`;
}
const dialog=$("caseDialog");
function resetForm(){ $("caseForm").reset(); $("editingId").value=""; $("deleteCaseBtn").classList.add("hidden"); }
function openNewCase(){ resetForm(); dialog.showModal(); }
function openEditCase(id){ const item=loadCases().find(c=>c.id===id); if(!item)return; $("editingId").value=item.id; $("caseTitle").value=item.title||""; $("caseArea").value=item.area||""; $("caseGroup").value=item.group||""; $("caseSetting").value=item.setting||"inpatient"; $("caseProgram").value=item.program||"inside"; $("caseSummary").checked=!!item.summary; $("deleteCaseBtn").classList.remove("hidden"); dialog.showModal(); }
function renderCaseList(){
  const query=($("caseSearch")?.value||"").trim().toLowerCase();
  const cases=loadCases().filter(c=>!query||[c.title,c.area,c.group].filter(Boolean).some(v=>v.toLowerCase().includes(query))).sort((a,b)=>new Date(b.updatedAt||b.createdAt)-new Date(a.updatedAt||a.createdAt));
  const list=$("caseList"), empty=$("emptyCases"); if(!list||!empty)return; list.innerHTML=""; empty.style.display=cases.length?"none":"block";
  for(const item of cases){ const row=document.createElement("article"); row.className="case-row"; const setting=item.setting==="outpatient"?"外来":"入院"; const program=item.program==="outside"?"プログラム外":"プログラム内"; row.innerHTML=`<div><h3>${escapeHtml(item.title)}</h3><div class="case-meta"><span class="badge">${escapeHtml(item.area)}</span><span class="badge">${escapeHtml(item.group||"疾患群未入力")}</span><span class="badge">${setting}</span><span class="badge">${program}</span>${item.summary?'<span class="badge summary">病歴要約</span>':''}</div></div><button type="button" class="edit-btn" data-edit-id="${item.id}">編集</button>`; list.appendChild(row); }
  list.querySelectorAll("[data-edit-id]").forEach(btn=>btn.addEventListener("click",()=>openEditCase(btn.dataset.editId)));
}
$("newCaseBtn").addEventListener("click",openNewCase); $("newCaseBtn2")?.addEventListener("click",openNewCase); $("closeCaseDialog")?.addEventListener("click",()=>dialog.close());
$("caseForm").addEventListener("submit",e=>{ e.preventDefault(); const title=$("caseTitle").value.trim(), area=$("caseArea").value; if(!title||!area){ alert("症例名と領域を入力してください。"); return; } const id=$("editingId").value, cases=loadCases(), old=cases.find(c=>c.id===id); const item={id:id||(crypto.randomUUID?crypto.randomUUID():String(Date.now())),title,area,group:$("caseGroup").value.trim(),setting:$("caseSetting").value,program:$("caseProgram").value,summary:$("caseSummary").checked,createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()}; if(id){ const i=cases.findIndex(c=>c.id===id); if(i>=0)cases[i]=item; } else cases.push(item); saveCases(cases); dialog.close(); refreshDashboard(); renderCaseList(); });
$("deleteCaseBtn")?.addEventListener("click",()=>{ const id=$("editingId").value; if(!id)return; if(!confirm("この症例を削除しますか？"))return; saveCases(loadCases().filter(c=>c.id!==id)); dialog.close(); refreshDashboard(); renderCaseList(); });
$("caseSearch")?.addEventListener("input",renderCaseList);
document.querySelectorAll('[data-view="summary"]').forEach(btn=>btn.addEventListener("click",()=>alert("病歴要約画面は次のステップで実装します。")));
document.querySelectorAll('[data-view="check"]').forEach(btn=>btn.addEventListener("click",()=>alert("J-OSLERチェック画面は次のステップで実装します。")));
document.querySelectorAll('[data-view="cases"]').forEach(btn=>btn.addEventListener("click",()=>$("casesPanel")?.scrollIntoView({behavior:"smooth",block:"start"})));
if("serviceWorker" in navigator){ window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(console.error)); }
refreshDashboard(); renderCaseList();
