
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
  saveCases(cases); dialog.close(); refreshDashboard(); renderCaseList(); if(typeof refreshSummaryCaseOptions==='function') refreshSummaryCaseOptions();
});

$("deleteCaseBtn").addEventListener("click",()=>{
  const id=$("editingId").value;if(!id)return;
  if(!confirm("この症例を削除しますか？"))return;
  saveCases(loadCases().filter(c=>c.id!==id));
  dialog.close();refreshDashboard();renderCaseList();if(typeof refreshSummaryCaseOptions==='function') refreshSummaryCaseOptions();
});
$("caseSearch").addEventListener("input",renderCaseList);
$("areaFilter").addEventListener("change",renderCaseList);

document.querySelector('[data-nav="home"]').addEventListener("click",()=>window.scrollTo({top:0,behavior:"smooth"}));
document.querySelector('[data-nav="cases"]').addEventListener("click",()=>$("casesPanel").scrollIntoView({behavior:"smooth"}));
document.querySelector('[data-nav="summary"]').addEventListener("click",()=>$("summaryPanel").scrollIntoView({behavior:"smooth"}));
document.querySelector('[data-nav="check"]').addEventListener("click",()=>alert("J-OSLERチェックは次フェーズで実装します。"));

initSelects();
refreshDashboard();
renderCaseList();

if("serviceWorker" in navigator){
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(console.error));
}


// ---------- SUMMARY WORKSPACE v4 ----------
const SUMMARY_KEY = "joslerTherapySummaryV1";

const SUMMARY_SECTIONS = {
  history: {
    kicker:"SECTION 01",
    title:"病歴",
    guide:"主病名中心。主訴・既往歴・社会生活歴・家族歴・現病歴を、確認できた事実だけで整える。",
    prompt:`あなたはJ-OSLER病歴要約作成を支援するAIです。
以下の匿名化されたカルテ原文だけを根拠に、【主訴】【既往歴】【社会生活歴】【家族歴】【現病歴】を作成してください。

重要ルール：
- 原文にない事実を補わない。
- 不明・未記載は推測しない。必要なら「要確認」と明示する。
- 患者氏名、イニシャル、生年月日、住所、実在病院名など患者識別情報を書かない。
- 現病歴は主病名中心に、時系列が一読で分かるよう簡潔にする。
- 一般語は適切な医学用語へ整えるが、意味を変えない。
- 薬剤名は確認できる範囲で一般名を用いる。
- 日付は原文にあるものだけ用い、存在しない年月日を作らない。
- 既往歴・家族歴・社会歴を無理に埋めない。
- J-OSLERに貼り付けやすい常体で出力する。

【カルテ原文】
{{SOURCE}}`
  },
  physical: {
    kicker:"SECTION 02",
    title:"主な入院時現症",
    guide:"重要所見だけ。記載のない正常所見を勝手に追加しない。",
    prompt:`あなたはJ-OSLER病歴要約作成を支援するAIです。
以下の匿名化されたカルテ原文から、【主な入院時現症】のみを作成してください。

重要ルール：
- 原文に明記された所見・バイタルだけを使う。
- 記載のない正常所見や陰性所見を作らない。
- 主病名の診断・重症度判断に重要な所見を優先する。
- 数値、酸素投与条件、JCS/GCSなどは原文どおり。推測・補完しない。
- 医学用語に整えるが、意味を変えない。
- 患者識別情報は含めない。
- 1つの連続した文章として出力する。

【カルテ原文】
{{SOURCE}}`
  },
  labs: {
    kicker:"SECTION 03",
    title:"主要な検査所見",
    guide:"異常値・重要な正常値・特殊検査を選択。数字は絶対に補完しない。",
    prompt:`あなたはJ-OSLER病歴要約作成を支援するAIです。
以下の匿名化されたカルテ原文から、【主要な検査所見】を抽出・整形してください。

重要ルール：
- 数値・単位・検査日を絶対に推測しない。
- 原文にある検査だけを使用する。
- 主病名に関連する異常値、診断や鑑別に重要な正常値、特殊検査を優先する。
- すべての検査を機械的に羅列せず、J-OSLER病歴要約として必要な情報を選ぶ。
- 一般的な検査略語は使用可。
- 画像検査・心電図等は原文の所見だけを書く。正常所見を作らない。
- 読み取りに自信がない数値は「要確認」とする。
- 患者識別情報は含めない。

【カルテ原文】
{{SOURCE}}`
  },
  problem: {
    kicker:"SECTION 04",
    title:"プロブレムリスト / 退院時処方",
    guide:"Problemと確定診断を混同しない。退院薬は一般名、確認済みの用量だけ。",
    prompt:`あなたはJ-OSLER病歴要約作成を支援するAIです。
以下の匿名化されたカルテ原文から【プロブレムリスト】と【退院時処方】を作成してください。

重要ルール：
- プロブレムリストは確定診断名の一覧ではなく、診療上扱った重要な症候・所見・検査異常・疾患を整理する。
- #1から重要度・主病態との関連が分かる順に並べる。
- 原文にないProblemを作らない。
- 退院時処方は原文に明記されたものだけ。
- 薬剤は可能な限り一般名とし、用量・用法を推測しない。
- 退院時処方が確認できない場合は「要確認」とする。
- 患者識別情報は含めない。

出力形式：
【プロブレムリスト】#1.〇〇、#2.〇〇、#3.〇〇
【退院時処方】〇〇

【カルテ原文】
{{SOURCE}}`
  },
  course: {
    kicker:"SECTION 05",
    title:"入院後経過と考察",
    guide:"診断根拠 → 治療選択 → 反応 → 修正 → 転帰。実施していない治療は実施扱いにしない。",
    prompt:`あなたはJ-OSLER病歴要約作成を支援するAIです。
以下の匿名化されたカルテ原文だけを根拠に、【入院後経過と考察】を作成してください。

重要ルール：
- 診断に至った根拠と鑑別過程、治療選択の理由、治療反応、変更理由、転帰を症例固有の流れとして書く。
- 原文にない治療・検査・患者指導・予防策を「実施した」と書かない。
- 鑑別診断を数合わせで作らない。
- 診断基準・重症度分類は、この症例で実際に必要かつ情報が揃う場合だけ用いる。
- 薬剤名は一般名を優先し、用量・投与期間は原文にある場合のみ書く。
- 自分が考えたプロセスが分かる能動的な文章にする。
- 引用文献はこの工程では勝手に新規作成しない。文献が必要な箇所は「［文献要確認］」と置く。
- 患者識別情報は含めない。
- J-OSLER向けの常体で出力する。

【カルテ原文】
{{SOURCE}}`
  },
  overall: {
    kicker:"SECTION 06",
    title:"総合考察",
    guide:"一般論ではなく、この患者だから何を考えたか。医学面＋全人的視点。",
    prompt:`あなたはJ-OSLER病歴要約作成を支援するAIです。
以下の匿名化されたカルテ原文だけを根拠に、【総合考察】の下書きを作成してください。

重要ルール：
- 主病名の一般的な教科書説明ではなく、この症例固有の診断・治療判断を考察する。
- 主病名の重症度、併存疾患との関連、治療選択の妥当性、経過から得た学びを統合する。
- 社会背景、家族、仕事、生活、心理面など、原文にある全人的情報を必要に応じて反映する。
- 原文にない生活指導や患者説明を「実施した」と書かない。必要性を述べる場合は「今後〜する必要があると考えた」等とする。
- 実在確認していない文献を作らない。根拠が必要な箇所は「［文献要確認］」とする。
- 自己省察につながる症例固有の気づきを含める。
- 患者識別情報は含めない。
- 常体・一続きの文章で出力する。

【カルテ原文】
{{SOURCE}}`
  }
};

function loadSummaryStore(){
  try{return JSON.parse(localStorage.getItem(SUMMARY_KEY)) || {}}
  catch{return {}}
}
function saveSummaryStore(store){
  localStorage.setItem(SUMMARY_KEY, JSON.stringify(store));
}
function currentSummaryCaseId(){ return $("summaryCaseSelect").value; }

function refreshSummaryCaseOptions(){
  const sel=$("summaryCaseSelect");
  const current=sel.value;
  sel.innerHTML='<option value="">症例を選択してください</option>';
  loadCases().forEach(c=>{
    const o=document.createElement("option");
    o.value=c.id;o.textContent=c.title;sel.appendChild(o);
  });
  if([...sel.options].some(o=>o.value===current)) sel.value=current;
}

function summaryRecord(caseId){
  const store=loadSummaryStore();
  if(!store[caseId]) store[caseId]={source:"",drafts:{},updatedAt:null};
  return {store,record:store[caseId]};
}

let activeSummarySection="history";

function loadSummaryCase(){
  const caseId=currentSummaryCaseId();
  if(!caseId){
    $("summarySource").value="";
    $("sectionDraft").value="";
    $("summarySaveState").textContent="症例未選択";
    updatePromptPreview();
    return;
  }
  const {record}=summaryRecord(caseId);
  $("summarySource").value=record.source||"";
  $("sectionDraft").value=record.drafts?.[activeSummarySection]||"";
  $("summarySaveState").textContent=record.updatedAt?"保存済み":"未保存";
  updatePromptPreview();
}

function saveSource(){
  const caseId=currentSummaryCaseId();
  if(!caseId){alert("先に対象症例を選択してください。");return}
  const {store,record}=summaryRecord(caseId);
  record.source=$("summarySource").value;
  record.updatedAt=new Date().toISOString();
  store[caseId]=record;saveSummaryStore(store);
  $("summarySaveState").textContent="保存済み";
}

function saveDraft(){
  const caseId=currentSummaryCaseId();
  if(!caseId){alert("先に対象症例を選択してください。");return}
  const {store,record}=summaryRecord(caseId);
  record.drafts=record.drafts||{};
  record.drafts[activeSummarySection]=$("sectionDraft").value;
  record.updatedAt=new Date().toISOString();
  store[caseId]=record;saveSummaryStore(store);
  $("summarySaveState").textContent="保存済み";
}

function buildPrompt(){
  const info=SUMMARY_SECTIONS[activeSummarySection];
  const source=$("summarySource").value.trim();
  return info.prompt.replace("{{SOURCE}}", source || "（カルテ原文が未入力です）");
}

function updatePromptPreview(){
  const info=SUMMARY_SECTIONS[activeSummarySection];
  $("sectionKicker").textContent=info.kicker;
  $("sectionTitle").textContent=info.title;
  $("sectionGuide").textContent=info.guide;
  $("promptPreview").textContent=buildPrompt();
}

function switchSummarySection(section){
  activeSummarySection=section;
  document.querySelectorAll(".summary-tab").forEach(b=>b.classList.toggle("active",b.dataset.section===section));
  const caseId=currentSummaryCaseId();
  const record=caseId?summaryRecord(caseId).record:null;
  $("sectionDraft").value=record?.drafts?.[section]||"";
  updatePromptPreview();
}

async function copyText(text, success){
  try{
    await navigator.clipboard.writeText(text);
    alert(success);
  }catch{
    const ta=document.createElement("textarea");ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove();alert(success);
  }
}

$("summaryCaseSelect").addEventListener("change",loadSummaryCase);
$("saveSourceBtn").addEventListener("click",saveSource);
$("clearSourceBtn").addEventListener("click",()=>{
  if(!confirm("カルテ原文欄をクリアしますか？"))return;
  $("summarySource").value="";saveSource();updatePromptPreview();
});
$("summarySource").addEventListener("input",()=>{
  $("summarySaveState").textContent="未保存";
  updatePromptPreview();
});
$("summaryTabs").querySelectorAll(".summary-tab").forEach(b=>b.addEventListener("click",()=>switchSummarySection(b.dataset.section)));
$("saveDraftBtn").addEventListener("click",saveDraft);
$("copyPromptBtn").addEventListener("click",()=>{
  if(!$("summarySource").value.trim()){alert("先にカルテ原文を入力してください。");return}
  copyText(buildPrompt(),"AI用プロンプトをコピーしました。");
});
$("copyDraftBtn").addEventListener("click",()=>{
  const text=$("sectionDraft").value.trim();
  if(!text){alert("下書きがありません。");return}
  copyText(text,"下書きをコピーしました。");
});
$("copyAllDraftsBtn").addEventListener("click",()=>{
  const caseId=currentSummaryCaseId();if(!caseId){alert("症例を選択してください。");return}
  const record=summaryRecord(caseId).record;
  const blocks=Object.entries(SUMMARY_SECTIONS).map(([key,info])=>{
    const d=record.drafts?.[key]?.trim();
    return d?`【${info.title}】\n${d}`:"";
  }).filter(Boolean);
  if(!blocks.length){alert("保存済みの下書きがありません。");return}
  copyText(blocks.join("\n\n"),"文章セットをコピーしました。");
});
$("openSelectedCaseBtn").addEventListener("click",()=>{
  const id=currentSummaryCaseId();if(!id){alert("症例を選択してください。");return}
  openEditCase(id);
});

refreshSummaryCaseOptions();
loadSummaryCase();
