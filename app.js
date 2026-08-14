const STORE_KEY = "joslerTherapyCasesV1";

const $ = (id) => document.getElementById(id);

function loadCases(){
  try{
    return JSON.parse(localStorage.getItem(STORE_KEY)) || [];
  }catch{
    return [];
  }
}

function saveCases(cases){
  localStorage.setItem(STORE_KEY, JSON.stringify(cases));
}

function pct(value, max){
  return Math.max(0, Math.min(100, (value / max) * 100));
}

function refreshDashboard(){
  const cases = loadCases();
  const groups = new Set(cases.map(c => c.group.trim()).filter(Boolean));
  const summaries = cases.filter(c => c.summary).length;
  const inpatient = cases.filter(c => c.setting === "inpatient").length;
  const outpatient = cases.filter(c => c.setting === "outpatient").length;
  const outside = cases.filter(c => c.program === "outside").length;

  $("caseCount").textContent = cases.length;
  $("groupCount").textContent = groups.size;
  $("summaryCount").textContent = summaries;

  $("caseBar").style.width = pct(cases.length,120) + "%";
  $("groupBar").style.width = pct(groups.size,56) + "%";
  $("summaryBar").style.width = pct(summaries,29) + "%";

  $("inpatientCount").textContent = `${inpatient} / 108以上`;
  $("outpatientCount").textContent = `${outpatient} / 最大12`;
  $("outsideCount").textContent = `${outside} / 最大60`;
}

const dialog = $("caseDialog");
$("closeCaseDialog").addEventListener("click", () => {
  dialog.close();
});

$("newCaseBtn").addEventListener("click", () => dialog.showModal());

document.querySelectorAll('[data-view="cases"]').forEach(btn => {
  btn.addEventListener("click", () => dialog.showModal());
});

document.querySelectorAll('[data-view="summary"]').forEach(btn => {
  btn.addEventListener("click", () => {
    alert("病歴要約画面は次のステップで実装します。");
  });
});

document.querySelectorAll('[data-view="check"]').forEach(btn => {
  btn.addEventListener("click", () => {
    alert("J-OSLERチェック画面は次のステップで実装します。");
  });
});

$("caseForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const item = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    title: $("caseTitle").value.trim(),
    area: $("caseArea").value,
    group: $("caseGroup").value.trim(),
    setting: $("caseSetting").value,
    program: $("caseProgram").value,
    summary: $("caseSummary").checked,
    createdAt: new Date().toISOString()
  };

  if(!item.title || !item.area){
    alert("症例名と領域を入力してください。");
    return;
  }

  const cases = loadCases();
  cases.push(item);
  saveCases(cases);
  $("caseForm").reset();
  dialog.close();
  refreshDashboard();
});

document.querySelectorAll(".nav-item").forEach(item => {
  item.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(x => x.classList.remove("active"));
    item.classList.add("active");
  });
});

if("serviceWorker" in navigator){
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(console.error);
  });
}

refreshDashboard();
