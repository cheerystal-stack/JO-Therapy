const STORE_KEY = "joslerTherapyCasesV1";
const SUMMARY_KEY = "joslerTherapySummaryV1";
const QUICK_KEY = "joslerTherapyQuickV1";
const $ = id => document.getElementById(id);

function loadJSON(key, fallback){
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function saveJSON(key, value){ localStorage.setItem(key, JSON.stringify(value)); }

function loadCases(){ return loadJSON(STORE_KEY, []); }
function saveCases(cases){ saveJSON(STORE_KEY, cases); }
function loadSummaryStore(){ return loadJSON(SUMMARY_KEY, {}); }
function saveSummaryStore(store){ saveJSON(SUMMARY_KEY, store); }
function loadQuickStore(){ return loadJSON(QUICK_KEY, {}); }
function saveQuickStore(store){ saveJSON(QUICK_KEY, store); }

function pct(v,max){ return max ? Math.max(0,Math.min(100,(v/max)*100)) : 0; }
function escapeHtml(s){
  return String(s ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[ch]));
}
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
function officialGroupSet(cases){
  return new Set(cases.map(c=>c.groupId).filter(Boolean));
}
function quickRecord(caseId){
  const store=loadQuickStore();
  if(!store[caseId]){
    store[caseId]={source:"",overview:"",reflection:"",updatedAt:null};
  }
  return {store,record:store[caseId]};
}
function summaryRecord(caseId){
  const store=loadSummaryStore();
  if(!store[caseId]){
    store[caseId]={source:"",drafts:{},updatedAt:null};
  }
  return {store,record:store[caseId]};
}
function isQuickComplete(caseId){
  const r=loadQuickStore()[caseId];
  return !!(r?.overview?.trim() && r?.reflection?.trim());
}
function savedSummarySections(caseId){
  const r=loadSummaryStore()[caseId];
  if(!r?.drafts) return 0;
  return Object.values(r.drafts).filter(v=>String(v||"").trim()).length;
}
function currentQuickCaseId(){ return $("quickCaseSelect").value; }
function currentSummaryCaseId(){ return $("summaryCaseSelect").value; }

async function copyText(text, success){
  try{
    await navigator.clipboard.writeText(text);
    alert(success);
  }catch{
    const ta=document.createElement("textarea");
    ta.value=text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    alert(success);
  }
}

// ---------- SELECTS ----------
function initSelects(){
  const areaSelect=$("caseArea");
  const filter=$("areaFilter");
  AREA_MASTER.forEach(a=>{
    areaSelect.appendChild(new Option(a.name,a.id));
    filter.appendChild(new Option(a.name,a.id));
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

// ---------- DASHBOARD ----------
function refreshDashboard(){
  const cases=loadCases();
  const groups=officialGroupSet(cases);
  const summaries=cases.filter(c=>c.summary).length;
  const inpatient=cases.filter(c=>c.setting==="inpatient").length;
  const outpatient=cases.filter(c=>c.setting==="outpatient").length;
  const outside=cases.filter(c=>c.program==="outside").length;
  const quickDone=cases.filter(c=>isQuickComplete(c.id)).length;

  $("caseCount").textContent=cases.length;
  $("groupCount").textContent=groups.size;
  $("summaryCount").textContent=summaries;
  $("quickDoneCount").textContent=quickDone;

  $("caseBar").style.width=pct(cases.length,REQUIREMENTS.totalCases)+"%";
  $("groupBar").style.width=pct(groups.size,REQUIREMENTS.totalGroups)+"%";
  $("summaryBar").style.width=pct(summaries,REQUIREMENTS.summaries)+"%";

  $("inpatientCount").textContent=`${inpatient} / ${REQUIREMENTS.inpatientMin}以上`;
  $("outpatientCount").textContent=`${outpatient} / 最大${REQUIREMENTS.outpatientMax}`;
  $("outsideCount").textContent=`${outside} / 最大${REQUIREMENTS.outsideMax}`;

  renderAreaProgress(cases);
  renderNextAction(cases);
  renderCheckPanel();
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
    const caseDone=caseMin ? areaCases>=caseMin : genCases>=GENERAL_CASE_MIN;
    const groupDone=groupCount>=area.groupMin;
    const row=document.createElement("div");
    row.className="area-row"+(caseDone&&groupDone?" done":"");
    const caseLabel=caseMin ? `${areaCases}/${caseMin}` : `${genCases}/${GENERAL_CASE_MIN}（総合内科計）`;

    row.innerHTML=`
      <div class="area-head">
        <div class="area-name">${escapeHtml(area.name)}</div>
        <div class="area-values">症例 <strong>${caseLabel}</strong>　疾患群 <strong>${groupCount}/${area.groupMin}</strong></div>
      </div>
      <div class="area-bars">
        <div class="tiny-bar-wrap">
          <small>症例</small>
          <div class="tiny-bar"><span style="width:${pct(caseMin?areaCases:genCases,caseMin||GENERAL_CASE_MIN)}%"></span></div>
        </div>
        <div class="tiny-bar-wrap">
          <small>疾患群</small>
          <div class="tiny-bar"><span style="width:${pct(groupCount,area.groupMin)}%"></span></div>
        </div>
      </div>`;
    wrap.appendChild(row);
  });
}

function renderNextAction(cases){
  const box=$("nextAction");
  if(!cases.length){
    box.textContent="まず1症例だけ登録。詳しい入力は後で大丈夫です。";
    return;
  }

  const quickPending=cases.find(c=>!isQuickComplete(c.id));
  if(quickPending){
    box.innerHTML=`<strong>${escapeHtml(quickPending.title)}</strong><br>QUICK未完成。カルテ原文を貼って概略＋自己省察を作れます。`;
    return;
  }

  const fullPending=cases.find(c=>c.summary && savedSummarySections(c.id)<6);
  if(fullPending){
    box.innerHTML=`<strong>${escapeHtml(fullPending.title)}</strong><br>病歴要約候補。FULLは ${savedSummarySections(fullPending.id)}/6 セクション保存済みです。`;
    return;
  }

  box.textContent="登録済み症例のQUICKはすべて完成しています。病歴要約29篇の候補を進めましょう。";
}

// ---------- CASE BANK ----------
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
  const item=loadCases().find(c=>c.id===id);
  if(!item) return;

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
    if(current>=REQUIREMENTS.outpatientMax){
      warnings.push(`外来症例は最大${REQUIREMENTS.outpatientMax}症例です。`);
    }else if(current>=REQUIREMENTS.outpatientMax-2){
      warnings.push(`外来症例は上限まで残り${REQUIREMENTS.outpatientMax-current}症例です。`);
    }
  }

  if($("caseProgram").value==="outside"){
    const current=loadCases().filter(c=>c.program==="outside" && c.id!==$("editingId").value).length;
    if(current>=REQUIREMENTS.outsideMax){
      warnings.push(`プログラム外症例は最大${REQUIREMENTS.outsideMax}症例です。`);
    }
  }

  const box=$("caseWarnings");
  box.innerHTML=warnings.map(w=>`⚠ ${escapeHtml(w)}`).join("<br>");
  box.classList.toggle("hidden",warnings.length===0);
}

function renderCaseList(){
  const q=($("caseSearch").value||"").trim().toLowerCase();
  const areaFilter=$("areaFilter").value;

  const cases=loadCases()
    .filter(c=>{
      if(areaFilter && c.areaId!==areaFilter) return false;
      const area=getArea(c.areaId)?.name || c.area || "";
      const group=getGroup(c.groupId)?.name || c.group || "";
      return !q || [c.title,area,group].filter(Boolean).some(v=>v.toLowerCase().includes(q));
    })
    .sort((a,b)=>new Date(b.updatedAt||b.createdAt)-new Date(a.updatedAt||a.createdAt));

  const list=$("caseList");
  const empty=$("emptyCases");
  list.innerHTML="";
  empty.style.display=cases.length?"none":"block";

  cases.forEach(item=>{
    const area=getArea(item.areaId)?.name || item.area || "領域未設定";
    const group=getGroup(item.groupId)?.name || item.group || "疾患群未設定";
    const legacy=!item.groupId && !!item.group;
    const quickDone=isQuickComplete(item.id);
    const fullCount=savedSummarySections(item.id);

    const row=document.createElement("article");
    row.className="case-row";
    row.innerHTML=`
      <div class="case-main">
        <h3>${escapeHtml(item.title)}</h3>
        <div class="case-meta">
          <span class="badge">${escapeHtml(area)}</span>
          <span class="badge ${legacy?"legacy":""}">${escapeHtml(group)}${legacy?"（旧入力）":""}</span>
          <span class="badge">${item.setting==="outpatient"?"外来":"入院"}</span>
          <span class="badge">${item.program==="outside"?"プログラム外":"プログラム内"}</span>
          ${item.summary?'<span class="badge summary">29篇候補</span>':""}
        </div>
        <div class="case-status-line">
          <span class="${quickDone?"status-ok":"status-pending"}">QUICK ${quickDone?"✓":"未完"}</span>
          ${item.summary?`<span class="${fullCount===6?"status-ok":"status-pending"}">FULL ${fullCount}/6</span>`:""}
        </div>
      </div>
      <div class="case-row-actions">
        <button type="button" class="quick-jump-btn" data-quick-id="${item.id}">QUICK</button>
        <button type="button" class="summary-jump-btn" data-summary-id="${item.id}">FULL</button>
        <button type="button" class="edit-btn" data-edit-id="${item.id}">編集</button>
      </div>`;

    list.appendChild(row);
  });

  list.querySelectorAll("[data-edit-id]").forEach(b=>{
    b.addEventListener("click",()=>openEditCase(b.dataset.editId));
  });

  list.querySelectorAll("[data-quick-id]").forEach(b=>{
    b.addEventListener("click",()=>{
      refreshWorkspaceCaseOptions();
      $("quickCaseSelect").value=b.dataset.quickId;
      loadQuickCase();
      $("quickPanel").scrollIntoView({behavior:"smooth",block:"start"});
    });
  });

  list.querySelectorAll("[data-summary-id]").forEach(b=>{
    b.addEventListener("click",()=>{
      refreshWorkspaceCaseOptions();
      $("summaryCaseSelect").value=b.dataset.summaryId;
      loadSummaryCase();
      $("summaryPanel").scrollIntoView({behavior:"smooth",block:"start"});
    });
  });
}

function refreshWorkspaceCaseOptions(){
  const cases=loadCases();

  const fill=(sel,current,onlySummary=false)=>{
    sel.innerHTML='<option value="">症例を選択してください</option>';
    const source=onlySummary ? cases.filter(c=>c.summary) : cases;
    source.forEach(c=>sel.appendChild(new Option(c.title,c.id)));
    if([...sel.options].some(o=>o.value===current)) sel.value=current;
  };

  fill($("quickCaseSelect"),$("quickCaseSelect").value,false);

  // FULLは29篇候補を優先。ただし候補が0件なら全症例を表示。
  const summaryCandidates=cases.filter(c=>c.summary);
  const sel=$("summaryCaseSelect");
  const current=sel.value;
  sel.innerHTML='<option value="">症例を選択してください</option>';
  (summaryCandidates.length?summaryCandidates:cases).forEach(c=>{
    const suffix=c.summary?"":"（候補未設定）";
    sel.appendChild(new Option(c.title+suffix,c.id));
  });
  if([...sel.options].some(o=>o.value===current)) sel.value=current;
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
    title,
    areaId,
    groupId,
    setting:$("caseSetting").value,
    program:$("caseProgram").value,
    summary:$("caseSummary").checked,
    createdAt:old?.createdAt||new Date().toISOString(),
    updatedAt:new Date().toISOString()
  };

  if(id){
    const i=cases.findIndex(c=>c.id===id);
    if(i>=0) cases[i]=item;
  }else{
    cases.push(item);
  }

  saveCases(cases);
  dialog.close();
  refreshEverything();
});

$("deleteCaseBtn").addEventListener("click",()=>{
  const id=$("editingId").value;
  if(!id) return;
  if(!confirm("この症例を削除しますか？")) return;

  saveCases(loadCases().filter(c=>c.id!==id));

  const quick=loadQuickStore();
  delete quick[id];
  saveQuickStore(quick);

  const summary=loadSummaryStore();
  delete summary[id];
  saveSummaryStore(summary);

  dialog.close();
  refreshEverything();
});

$("caseSearch").addEventListener("input",renderCaseList);
$("areaFilter").addEventListener("change",renderCaseList);

// ---------- QUICK 120 ----------
const QUICK_PROMPT = `あなたはJ-OSLER症例登録を支援するAIです。

以下の匿名化されたカルテ原文だけを根拠に、
【症例の概略】と【症例を経験しての自己省察】を作成してください。

重要ルール：
- 原文にない事実を補わない。
- 不明・未記載事項を推測しない。
- 患者氏名、生年月日、住所、実在施設名など患者識別情報を書かない。
- 数値、日付、薬剤名、用量、検査所見を勝手に作らない。
- 一般的な医学用語へ整えてよいが、意味を変えない。
- 冗長にしない。
- J-OSLERへ貼り付けやすい常体で出力する。

【症例の概略】
- 500字以内。
- 500字を埋める必要はない。
- 発症または受診契機、主要な検査・診断根拠、診断、治療、治療反応、転帰が分かるよう簡潔にまとめる。
- 原文にない経過は作らない。

【症例を経験しての自己省察】
- 300字以内。
- 必要十分であれば1〜3文程度でもよい。
- この症例から得られた医学的な学び、今後の課題、必要に応じて社会的・全人的な視点を含める。
- 実際に行っていない指導や対応を「実施した」と書かない。
- 無理に反省点を作らない。

出力形式：
【症例の概略】
本文

【症例を経験しての自己省察】
本文

【カルテ原文】
{{SOURCE}}`;

function buildQuickPrompt(){
  const source=$("quickSource").value.trim();
  return QUICK_PROMPT.replace("{{SOURCE}}", source || "（カルテ原文が未入力です）");
}

function updateQuickCounters(){
  $("overviewCounter").textContent=`${$("quickOverview").value.length} / 500`;
  $("reflectionCounter").textContent=`${$("quickReflection").value.length} / 300`;
}

function loadQuickCase(){
  const caseId=currentQuickCaseId();

  if(!caseId){
    $("quickSource").value="";
    $("quickOverview").value="";
    $("quickReflection").value="";
    $("quickSaveState").textContent="症例未選択";
    updateQuickCounters();
    return;
  }

  const {record}=quickRecord(caseId);
  $("quickSource").value=record.source||"";
  $("quickOverview").value=record.overview||"";
  $("quickReflection").value=record.reflection||"";
  $("quickSaveState").textContent=record.updatedAt ? (isQuickComplete(caseId)?"QUICK ✓":"保存済み") : "未保存";
  updateQuickCounters();
}

function saveQuickSource(){
  const caseId=currentQuickCaseId();
  if(!caseId){
    alert("先に対象症例を選択してください。");
    return;
  }
  const {store,record}=quickRecord(caseId);
  record.source=$("quickSource").value;
  record.updatedAt=new Date().toISOString();
  store[caseId]=record;
  saveQuickStore(store);
  $("quickSaveState").textContent=isQuickComplete(caseId)?"QUICK ✓":"保存済み";
  refreshDashboard();
  renderCaseList();
}

function saveQuickAll(){
  const caseId=currentQuickCaseId();
  if(!caseId){
    alert("先に対象症例を選択してください。");
    return;
  }

  const {store,record}=quickRecord(caseId);
  record.source=$("quickSource").value;
  record.overview=$("quickOverview").value.trim();
  record.reflection=$("quickReflection").value.trim();
  record.updatedAt=new Date().toISOString();
  store[caseId]=record;
  saveQuickStore(store);

  $("quickSaveState").textContent=isQuickComplete(caseId)?"QUICK ✓":"保存済み";
  refreshDashboard();
  renderCaseList();

  if(isQuickComplete(caseId)){
    alert("QUICK登録文章を保存しました。✓");
  }else{
    alert("保存しました。概略と自己省察の両方が入るとQUICK完了になります。");
  }
}

$("quickCaseSelect").addEventListener("change",loadQuickCase);

$("saveQuickSourceBtn").addEventListener("click",saveQuickSource);

$("clearQuickSourceBtn").addEventListener("click",()=>{
  if(!currentQuickCaseId()){
    alert("症例を選択してください。");
    return;
  }
  if(!confirm("QUICKのカルテ原文欄をクリアしますか？")) return;
  $("quickSource").value="";
  saveQuickSource();
});

$("copyQuickPromptBtn").addEventListener("click",()=>{
  if(!$("quickSource").value.trim()){
    alert("先にカルテ原文を入力してください。");
    return;
  }
  copyText(buildQuickPrompt(),"QUICK用AIプロンプトをコピーしました。");
});

$("saveQuickAllBtn").addEventListener("click",saveQuickAll);

$("copyQuickOverviewBtn").addEventListener("click",()=>{
  const text=$("quickOverview").value.trim();
  if(!text){ alert("症例の概略がありません。"); return; }
  copyText(text,"症例の概略をコピーしました。");
});

$("copyQuickReflectionBtn").addEventListener("click",()=>{
  const text=$("quickReflection").value.trim();
  if(!text){ alert("自己省察がありません。"); return; }
  copyText(text,"自己省察をコピーしました。");
});

$("quickOverview").addEventListener("input",()=>{
  $("quickSaveState").textContent="未保存";
  updateQuickCounters();
});
$("quickReflection").addEventListener("input",()=>{
  $("quickSaveState").textContent="未保存";
  updateQuickCounters();
});
$("quickSource").addEventListener("input",()=>{
  $("quickSaveState").textContent="未保存";
});

$("openQuickCaseBtn").addEventListener("click",()=>{
  const id=currentQuickCaseId();
  if(!id){ alert("症例を選択してください。"); return; }
  openEditCase(id);
});

// ---------- FULL 29 ----------
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

let activeSummarySection="history";

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

function updateDraftStatus(){
  const caseId=currentSummaryCaseId();
  const status=$("draftStatus");

  if(!caseId){
    status.textContent="症例未選択";
    status.classList.remove("saved");
    return;
  }

  const record=summaryRecord(caseId).record;
  const saved=!!record.drafts?.[activeSummarySection]?.trim();
  status.textContent=saved?"保存済み":"未保存";
  status.classList.toggle("saved",saved);
}

function resetPreflight(message){
  $("preflightSummary").className="preflight-summary";
  $("preflightSummary").textContent=message;
  $("preflightList").innerHTML="";
}

function loadSummaryCase(){
  const caseId=currentSummaryCaseId();

  if(!caseId){
    $("summarySource").value="";
    $("sectionDraft").value="";
    $("summarySaveState").textContent="症例未選択";
    updatePromptPreview();
    updateDraftStatus();
    resetPreflight("症例を選択してください。");
    return;
  }

  const {record}=summaryRecord(caseId);
  $("summarySource").value=record.source||"";
  $("sectionDraft").value=record.drafts?.[activeSummarySection]||"";
  $("summarySaveState").textContent=record.updatedAt?"保存済み":"未保存";
  updatePromptPreview();
  updateDraftStatus();
  resetPreflight("「チェックする」で症例材料の抜け候補を確認できます。");
}

function saveSource(){
  const caseId=currentSummaryCaseId();
  if(!caseId){
    alert("先に対象症例を選択してください。");
    return;
  }

  const {store,record}=summaryRecord(caseId);
  record.source=$("summarySource").value;
  record.updatedAt=new Date().toISOString();
  store[caseId]=record;
  saveSummaryStore(store);

  $("summarySaveState").textContent="保存済み";
  refreshDashboard();
}

function saveDraft(){
  const caseId=currentSummaryCaseId();
  if(!caseId){
    alert("先に対象症例を選択してください。");
    return;
  }

  const {store,record}=summaryRecord(caseId);
  record.drafts=record.drafts||{};
  record.drafts[activeSummarySection]=$("sectionDraft").value;
  record.updatedAt=new Date().toISOString();
  store[caseId]=record;
  saveSummaryStore(store);

  $("summarySaveState").textContent="保存済み";
  updateDraftStatus();
  refreshDashboard();
  renderCaseList();
}

function switchSummarySection(section){
  activeSummarySection=section;
  document.querySelectorAll(".summary-tab").forEach(b=>{
    b.classList.toggle("active",b.dataset.section===section);
  });

  const caseId=currentSummaryCaseId();
  const record=caseId?summaryRecord(caseId).record:null;
  $("sectionDraft").value=record?.drafts?.[section]||"";
  updatePromptPreview();
  updateDraftStatus();
}

$("summaryCaseSelect").addEventListener("change",loadSummaryCase);
$("saveSourceBtn").addEventListener("click",saveSource);

$("clearSourceBtn").addEventListener("click",()=>{
  if(!currentSummaryCaseId()){
    alert("症例を選択してください。");
    return;
  }
  if(!confirm("カルテ原文欄をクリアしますか？")) return;
  $("summarySource").value="";
  saveSource();
  updatePromptPreview();
  resetPreflight("症例情報を変更しました。再チェックしてください。");
});

$("summarySource").addEventListener("input",()=>{
  $("summarySaveState").textContent="未保存";
  updatePromptPreview();
  resetPreflight("症例情報を変更しました。再チェックしてください。");
});

$("summaryTabs").querySelectorAll(".summary-tab").forEach(b=>{
  b.addEventListener("click",()=>switchSummarySection(b.dataset.section));
});

$("saveDraftBtn").addEventListener("click",saveDraft);

$("copyPromptBtn").addEventListener("click",()=>{
  if(!$("summarySource").value.trim()){
    alert("先にカルテ原文を入力してください。");
    return;
  }
  copyText(buildPrompt(),"AI用プロンプトをコピーしました。");
});

$("copyDraftBtn").addEventListener("click",()=>{
  const text=$("sectionDraft").value.trim();
  if(!text){
    alert("下書きがありません。");
    return;
  }
  copyText(text,"下書きをコピーしました。");
});

$("copyAllDraftsBtn").addEventListener("click",()=>{
  const caseId=currentSummaryCaseId();
  if(!caseId){
    alert("症例を選択してください。");
    return;
  }

  const record=summaryRecord(caseId).record;
  const blocks=Object.entries(SUMMARY_SECTIONS)
    .map(([key,info])=>{
      const d=record.drafts?.[key]?.trim();
      return d?`【${info.title}】\n${d}`:"";
    })
    .filter(Boolean);

  if(!blocks.length){
    alert("保存済みの下書きがありません。");
    return;
  }

  copyText(blocks.join("\n\n"),"文章セットをコピーしました。");
});

$("openSelectedCaseBtn").addEventListener("click",()=>{
  const id=currentSummaryCaseId();
  if(!id){
    alert("症例を選択してください。");
    return;
  }
  openEditCase(id);
});

$("sectionDraft").addEventListener("input",()=>{
  $("draftStatus").textContent="未保存";
  $("draftStatus").classList.remove("saved");
});

// ---------- PRE-FLIGHT SUPPORT CHECK ----------
const PREFLIGHT_RULES = [
  {
    id:"privacy",
    title:"個人識別情報",
    test:(s)=>!/(氏名|住所|生年月日|病院名|クリニック名|医療センター|大学病院)/.test(s),
    ok:"明らかな識別情報キーワードは検出されませんでした。",
    warn:"患者氏名・住所・生年月日・実在施設名などが含まれていないか確認してください。"
  },
  {
    id:"history",
    title:"病歴の材料",
    test:(s)=>/(主訴|発熱|疼痛|呼吸|意識|嘔吐|下痢|倦怠|浮腫|胸痛)/.test(s) && /(現病歴|受診|入院|搬送|発症)/.test(s),
    ok:"主訴・時系列経過に使えそうな情報があります。",
    warn:"主訴または発症から入院までの時系列情報が不足している可能性があります。"
  },
  {
    id:"physical",
    title:"入院時現症",
    test:(s)=>/(体温|T\s|BP|血圧|HR|脈拍|SpO2|呼吸数|RR)/i.test(s),
    ok:"バイタルまたは入院時所見が確認できます。",
    warn:"入院時バイタル・重要身体所見が少ない可能性があります。"
  },
  {
    id:"labs",
    title:"検査所見",
    test:(s)=>/(WBC|CRP|Hb|Cr|AST|ALT|Na|K|CT|MRI|X線|レントゲン|心電図|ECG)/i.test(s),
    ok:"血液検査・画像等の材料が確認できます。",
    warn:"主要検査所見が不足している可能性があります。"
  },
  {
    id:"treatment",
    title:"治療内容",
    test:(s)=>/(開始|投与|内服|静注|点滴|治療|手術|酸素|抗菌薬|ステロイド|輸液)/.test(s),
    ok:"実施治療に使えそうな記載があります。",
    warn:"治療内容が明確でない可能性があります。"
  },
  {
    id:"response",
    title:"治療反応・転帰",
    test:(s)=>/(改善|軽快|解熱|低下|増悪|終了|退院|転院|死亡|離脱|安定)/.test(s),
    ok:"治療反応または転帰が確認できます。",
    warn:"治療後の反応・転帰が不足している可能性があります。"
  },
  {
    id:"rationale",
    title:"診断・治療の根拠",
    test:(s)=>/(ため|ことから|疑|診断|鑑別|選択|根拠|適応|否定|考え)/.test(s),
    ok:"診断・治療理由に使えそうな記載があります。",
    warn:"診断根拠や治療選択理由が原文から拾えない可能性があります。⑤では要確認になりやすい項目です。"
  },
  {
    id:"dischargeMeds",
    title:"退院時処方",
    test:(s)=>/(退院時処方|退院処方|退院薬|退院時.*内服)/.test(s),
    ok:"退院時処方の記載候補があります。",
    warn:"退院時処方が確認できません。④では「要確認」になる可能性があります。"
  },
  {
    id:"social",
    title:"全人的情報",
    test:(s)=>/(生活|家族|妻|夫|独居|同居|仕事|職業|会社員|喫煙|飲酒|介護|ADL|退院後)/.test(s),
    ok:"生活・家族・仕事等の情報があります。",
    warn:"総合考察に使える生活・家族・仕事・心理面の情報が少ない可能性があります。"
  },
  {
    id:"reflection",
    title:"自己省察につながる材料",
    test:(s)=>/(学ん|反省|課題|今後|必要|注意|再発|指導|困難|難渋)/.test(s),
    ok:"学び・今後の課題につながる記載があります。",
    warn:"自己省察につながる材料は原文からは明確でない可能性があります。"
  }
];

function runPreflight(){
  const source=$("summarySource").value.trim();
  const summary=$("preflightSummary");
  const list=$("preflightList");
  list.innerHTML="";

  if(!source){
    summary.className="preflight-summary warn";
    summary.textContent="症例情報が未入力です。先に匿名化した症例材料を貼り付けてください。";
    return;
  }

  const results=PREFLIGHT_RULES.map(rule=>({...rule,pass:rule.test(source)}));
  const warnings=results.filter(r=>!r.pass).length;

  summary.className="preflight-summary "+(warnings?"warn":"good");
  summary.textContent=warnings
    ? `要確認候補が ${warnings} 件あります。これは合否判定ではなく、生成前にカルテへ戻る候補です。`
    : "大きな抜け候補は検出されませんでした。生成後も原文との照合は必要です。";

  results.forEach(r=>{
    const item=document.createElement("div");
    item.className="preflight-item "+(r.pass?"":"warn");
    item.innerHTML=`
      <div class="preflight-icon">${r.pass?"✓":"!"}</div>
      <div>
        <strong>${escapeHtml(r.title)}</strong>
        <small>${escapeHtml(r.pass?r.ok:r.warn)}</small>
      </div>`;
    list.appendChild(item);
  });
}
$("runPreflightBtn").addEventListener("click",runPreflight);

// ---------- CHECK PANEL ----------
function renderCheckPanel(){
  const cases=loadCases();
  const groups=officialGroupSet(cases);
  const quickDone=cases.filter(c=>isQuickComplete(c.id)).length;
  const summaryCandidates=cases.filter(c=>c.summary);
  const fullDone=summaryCandidates.filter(c=>savedSummarySections(c.id)===6).length;

  $("checkSummaryCards").innerHTML=`
    <article class="check-card"><span>症例登録</span><strong>${cases.length} / ${REQUIREMENTS.totalCases}</strong></article>
    <article class="check-card"><span>疾患群</span><strong>${groups.size} / ${REQUIREMENTS.totalGroups}</strong></article>
    <article class="check-card"><span>QUICK完成</span><strong>${quickDone} / ${cases.length||0}</strong></article>
    <article class="check-card"><span>FULL 6/6</span><strong>${fullDone} / ${summaryCandidates.length}</strong></article>
  `;

  const todos=[];

  cases.filter(c=>!isQuickComplete(c.id)).slice(0,10).forEach(c=>{
    todos.push({
      type:"QUICK",
      title:c.title,
      text:"症例の概略＋自己省察が未完成です。",
      id:c.id
    });
  });

  summaryCandidates.filter(c=>savedSummarySections(c.id)<6).slice(0,10).forEach(c=>{
    todos.push({
      type:"FULL",
      title:c.title,
      text:`病歴要約 ${savedSummarySections(c.id)}/6 セクション保存済み。`,
      id:c.id
    });
  });

  const list=$("checkTodoList");
  if(!todos.length){
    list.innerHTML='<div class="empty-state"><h3>今ある症例の文章作業は完了しています</h3><p>新しい症例を追加するか、領域バランスを確認しましょう。</p></div>';
    return;
  }

  list.innerHTML=todos.map(t=>`
    <article class="todo-item">
      <div>
        <span class="todo-type">${t.type}</span>
        <strong>${escapeHtml(t.title)}</strong>
        <p>${escapeHtml(t.text)}</p>
      </div>
      <button type="button" class="secondary-btn" data-check-jump="${t.type}" data-case-id="${t.id}">開く</button>
    </article>
  `).join("");

  list.querySelectorAll("[data-check-jump]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const id=btn.dataset.caseId;
      if(btn.dataset.checkJump==="QUICK"){
        refreshWorkspaceCaseOptions();
        $("quickCaseSelect").value=id;
        loadQuickCase();
        $("quickPanel").scrollIntoView({behavior:"smooth",block:"start"});
      }else{
        refreshWorkspaceCaseOptions();
        $("summaryCaseSelect").value=id;
        loadSummaryCase();
        $("summaryPanel").scrollIntoView({behavior:"smooth",block:"start"});
      }
    });
  });
}

// ---------- NAV ----------
const NAV_TARGETS = {
  home:"homePanel",
  cases:"casesPanel",
  quick:"quickPanel",
  summary:"summaryPanel",
  check:"checkPanel"
};

document.querySelectorAll(".nav-item").forEach(btn=>{
  btn.addEventListener("click",()=>{
    document.querySelectorAll(".nav-item").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    const target=$(NAV_TARGETS[btn.dataset.nav]);
    target?.scrollIntoView({behavior:"smooth",block:"start"});
  });
});

// ---------- REFRESH ----------
function refreshEverything(){
  refreshDashboard();
  renderCaseList();
  refreshWorkspaceCaseOptions();
  loadQuickCase();
  loadSummaryCase();
}

initSelects();
refreshEverything();

if("serviceWorker" in navigator){
  window.addEventListener("load",()=>{
    navigator.serviceWorker.register("./sw.js?v=6").catch(console.error);
  });
}
