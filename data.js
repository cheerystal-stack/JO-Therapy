
const REQUIREMENTS = {
  totalCases: 120,
  totalGroups: 56,
  summaries: 29,
  inpatientMin: 108,
  outpatientMax: 12,
  outsideMax: 60
};

// 症例数の最低要件：専攻医7期生（2024年度専門研修開始）以降。
// 疾患群マスター：2015年版 日本内科学会「研修手帳（疾患群項目表）」の構成を元にした管理用ラベル。
// 疾患群名はUI上の識別を目的とした簡略ラベル。
const AREA_MASTER = [
  {id:"general1", name:"総合内科Ⅰ（一般）", caseMin:null, groupMin:1, groups:[
    {id:"general1-1", name:"疾患群1：総合内科Ⅰ（一般）"}
  ]},
  {id:"general2", name:"総合内科Ⅱ（高齢者）", caseMin:null, groupMin:1, groups:[
    {id:"general2-1", name:"疾患群1：総合内科Ⅱ（高齢者）"}
  ]},
  {id:"general3", name:"総合内科Ⅲ（腫瘍）", caseMin:null, groupMin:1, groups:[
    {id:"general3-1", name:"疾患群1：総合内科Ⅲ（腫瘍）"}
  ]},
  {id:"gi", name:"消化器", caseMin:10, groupMin:5, groups:[
    {id:"gi-1", name:"疾患群1：食道・胃・十二指腸疾患（腫瘍性）"},
    {id:"gi-2", name:"疾患群2：食道・胃・十二指腸疾患（非腫瘍性）"},
    {id:"gi-3", name:"疾患群3：小腸・大腸疾患（腫瘍性）"},
    {id:"gi-4", name:"疾患群4：小腸・大腸疾患（炎症性・その他）"},
    {id:"gi-5", name:"疾患群5：全消化管に関わる疾患"},
    {id:"gi-6", name:"疾患群6：肝疾患（炎症性）"},
    {id:"gi-7", name:"疾患群7：肝疾患（代謝関連）"},
    {id:"gi-8", name:"疾患群8：肝・胆道・膵疾患"},
    {id:"gi-9", name:"疾患群9：腹腔・腹壁疾患／急性腹症"}
  ]},
  {id:"cv", name:"循環器", caseMin:10, groupMin:5, groups:[
    {id:"cv-1", name:"疾患群1：虚血性心疾患（急性冠症候群）"},
    {id:"cv-2", name:"疾患群2：虚血性心疾患（安定冠動脈疾患等）"},
    {id:"cv-3", name:"疾患群3：血圧異常"},
    {id:"cv-4", name:"疾患群4：不整脈"},
    {id:"cv-5", name:"疾患群5：失神・突然死関連"},
    {id:"cv-6", name:"疾患群6：弁膜症・感染性心内膜炎"},
    {id:"cv-7", name:"疾患群7：先天性心疾患・肺循環異常等"},
    {id:"cv-8", name:"疾患群8：心膜・心筋疾患"},
    {id:"cv-9", name:"疾患群9：大動脈・末梢血管疾患"},
    {id:"cv-10", name:"疾患群10：心不全・ショック"}
  ]},
  {id:"endo", name:"内分泌", caseMin:3, groupMin:2, groups:[
    {id:"endo-1", name:"疾患群1：視床下部・下垂体疾患"},
    {id:"endo-2", name:"疾患群2：甲状腺疾患"},
    {id:"endo-3", name:"疾患群3：副甲状腺・Ca/P代謝異常"},
    {id:"endo-4", name:"疾患群4：副腎・多発性内分泌異常・性腺等"}
  ]},
  {id:"met", name:"代謝", caseMin:10, groupMin:3, groups:[
    {id:"met-1", name:"疾患群1：1型糖尿病"},
    {id:"met-2", name:"疾患群2：2型糖尿病・その他の糖尿病"},
    {id:"met-3", name:"疾患群3：低血糖・糖尿病緊急症"},
    {id:"met-4", name:"疾患群4：糖尿病慢性合併症"},
    {id:"met-5", name:"疾患群5：肥満・脂質・尿酸・ビタミン等"}
  ]},
  {id:"renal", name:"腎臓", caseMin:10, groupMin:4, groups:[
    {id:"renal-1", name:"疾患群1：慢性腎臓病（CKD）"},
    {id:"renal-2", name:"疾患群2：急性腎障害（AKI）"},
    {id:"renal-3", name:"疾患群3：糸球体疾患"},
    {id:"renal-4", name:"疾患群4：尿細管・間質疾患"},
    {id:"renal-5", name:"疾患群5：血管系疾患"},
    {id:"renal-6", name:"疾患群6：水・電解質・酸塩基平衡異常"},
    {id:"renal-7", name:"疾患群7：腎尿路感染症・泌尿器科的腎尿路疾患"}
  ]},
  {id:"resp", name:"呼吸器", caseMin:10, groupMin:4, groups:[
    {id:"resp-1", name:"疾患群1：感染性呼吸器疾患"},
    {id:"resp-2", name:"疾患群2：気管・気管支・肺の形態機能異常等"},
    {id:"resp-3", name:"疾患群3：免疫・間質性・薬物性肺疾患等"},
    {id:"resp-4", name:"疾患群4：肺循環異常"},
    {id:"resp-5", name:"疾患群5：呼吸器新生物"},
    {id:"resp-6", name:"疾患群6：胸膜・縦隔・横隔膜・胸郭疾患"},
    {id:"resp-7", name:"疾患群7：呼吸不全"},
    {id:"resp-8", name:"疾患群8：呼吸調節障害"}
  ]},
  {id:"heme", name:"血液", caseMin:3, groupMin:2, groups:[
    {id:"heme-1", name:"疾患群1：赤血球系疾患"},
    {id:"heme-2", name:"疾患群2：白血球系・血漿蛋白異常"},
    {id:"heme-3", name:"疾患群3：出血・血栓性疾患"}
  ]},
  {id:"neuro", name:"神経", caseMin:10, groupMin:5, groups:[
    {id:"neuro-1", name:"疾患群1：脳血管障害"},
    {id:"neuro-2", name:"疾患群2：感染性・炎症性・中枢性脱髄疾患"},
    {id:"neuro-3", name:"疾患群3：免疫異常による末梢神経・筋疾患"},
    {id:"neuro-4", name:"疾患群4：末梢神経・筋疾患"},
    {id:"neuro-5", name:"疾患群5：変性疾患"},
    {id:"neuro-6", name:"疾患群6：認知症"},
    {id:"neuro-7", name:"疾患群7：機能性疾患・自律神経疾患"},
    {id:"neuro-8", name:"疾患群8：脊椎・脊髄・腫瘍性疾患"},
    {id:"neuro-9", name:"疾患群9：代謝性・内科疾患等に伴う神経疾患"}
  ]},
  {id:"allergy", name:"アレルギー", caseMin:3, groupMin:1, groups:[
    {id:"allergy-1", name:"疾患群1：喘息・肺疾患"},
    {id:"allergy-2", name:"疾患群2：全身性疾患・その他"}
  ]},
  {id:"rheum", name:"膠原病及び類縁疾患", caseMin:3, groupMin:1, groups:[
    {id:"rheum-1", name:"疾患群1：関節症状を主とする膠原病・類縁疾患"},
    {id:"rheum-2", name:"疾患群2：全身症状・多臓器症状を主とする膠原病・類縁疾患"}
  ]},
  {id:"infect", name:"感染症", caseMin:8, groupMin:2, groups:[
    {id:"infect-1", name:"疾患群1：ウイルス感染症"},
    {id:"infect-2", name:"疾患群2：リケッチア・クラミジア・原虫等"},
    {id:"infect-3", name:"疾患群3：細菌感染症"},
    {id:"infect-4", name:"疾患群4：真菌感染症"}
  ]},
  {id:"emerg", name:"救急", caseMin:10, groupMin:4, groups:[
    {id:"emerg-1", name:"疾患群1：心停止・ショック"},
    {id:"emerg-2", name:"疾患群2：神経・呼吸・循環救急"},
    {id:"emerg-3", name:"疾患群3：消化器・腎・内分泌・電解質等の救急"},
    {id:"emerg-4", name:"疾患群4：中毒・環境障害"}
  ]}
];

const GENERAL_CASE_MIN = 10;
