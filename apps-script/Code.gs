/**
 * 台大領袖社 × 台科領袖社聯合社課問卷。
 * 使用 Advanced Sheets Service + drive.file，僅操作本應用程式建立的檔案。
 * 編輯器執行 initializeBackend，部署網頁應用程式：以我身分執行、所有人。
 */
const SETTINGS = '設定';
const QUESTIONS_SHEET = '題目';
const RESPONSES = '回覆';
const BASE_HEADERS = ['時間戳記', '姓名', '社團', 'Q1 分數', 'Q1 題目', 'Q1 選項', 'Q2 分數', 'Q2 題目', 'Q2 選項', 'Q3 分數', 'Q3 題目', 'Q3 選項', '總分', '問卷版本', '回覆代碼'];
// 新欄位附在原有欄位之後，保留既有資料與回覆代碼的位置。
const HEADERS = BASE_HEADERS.concat(['Q6 呼吸頻率（選項序號）', 'Q6 題目', 'Q6 選項', 'Q7 題目', 'Q7 想問講師']);
const DEFAULT_ASK = {title:'有沒有特別想要問講師的，也歡迎提出~',placeholder:'寫下你的問題',maxLength:500,required:false};
const DEFAULT_QUESTIONS = [
  ['q1', '專注持續力', '讀書、上課或工作時，我的注意力通常能維持多久，才會開始分心（想別的事、拿起手機）？', '不到 5 分鐘', '約 5–15 分鐘', '約 15–30 分鐘', '約 30–60 分鐘', '超過 1 小時', '很快分心', '長時間專注'],
  ['q2', '拉回當下', '當我發現自己分心，或被情緒、雜念影響時，我能多快把心拉回來、重新專注在眼前的事？', '幾乎拉不回來，整段時間都被打斷', '要花很久，通常得休息或換個環境', '有時拉得回來，有時拉不回來', '多數時候幾分鐘內就能拉回來', '幾乎能立刻察覺，並馬上回到當下', '難以拉回', '立刻回到當下'],
  ['q3', '心腦一致', '日常生活中，我感覺「心裡的感受」與「腦中所想、手上所做」是一致的，內在平穩且投入的頻率是？', '幾乎從不，心常常很亂、想的和做的不同調', '很少', '有時候', '經常', '幾乎總是，身心合一、內在平靜', '心亂不同調', '身心合一'],
  ['q4', '呼吸頻率', '禪定時，我的呼吸每分鐘大約可以幾下？（一吸一吐算一下）', '20 下以上', '15 到 20 下', '10 到 15 下', '5 到 10 下', '5 下以內', '呼吸較快', '呼吸深長']
];

function initializeBackend() {
  if (Session.getActiveUser().getEmail() !== 'rockon8765@gmail.com') throw new Error('此操作限後台管理者執行');
  return setupBackend_();
}

function setupBackend_() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty('SPREADSHEET_ID');
  if (!id) {
    const created = Sheets.Spreadsheets.create({
      properties: { title: '台大領袖社 × 台科領袖社｜聯合社課課前問卷回覆', locale: 'zh_TW', timeZone: 'Asia/Taipei' },
      sheets: [ { properties: { sheetId: 0, title: SETTINGS } }, { properties: { sheetId: 1, title: QUESTIONS_SHEET } }, { properties: { sheetId: 2, title: RESPONSES } } ]
    });
    id = created.spreadsheetId;
    props.setProperty('SPREADSHEET_ID', id);
  }
  const initialSettings = [
    ['設定項目', '內容'],
    ['問卷標題', '課前 QA：專注力自我覺察'],
    ['主辦社團', '台大領袖社 × 台科領袖社'],
    ['填答說明', '花一分鐘，誠實觀察自己平常的專注狀態。沒有標準答案，選最接近你「最近一週」實際情況的選項就好。'],
    ['完成訊息', '這是你這次的自我覺察，社課上我們一起練習，期末再回來看看有沒有不一樣。'],
    ['開放收件', '是'],
    ['社團選項', '台大領袖社\n台科領袖社'],
    ['修改方式', '本頁與「題目」頁修改後，網站重新整理即更新。四道單選題各五個選項；Q7 為選填文字。'],
    ['Q7 題目', DEFAULT_ASK.title],
    ['Q7 輸入提示', DEFAULT_ASK.placeholder]
  ];
  const seed = [
    { range: "'設定'!A1:B10", values: initialSettings },
    { range: "'題目'!A1:J5", values: [['題目代碼（勿改）','主題','題目','1 分選項','2 分選項','3 分選項','4 分選項','5 分選項','低分提示','高分提示']].concat(DEFAULT_QUESTIONS) },
    { range: "'回覆'!A1:T1", values: [HEADERS] }
  ];
  // 只初始化空白頁，重複執行不會清除設定或回覆。
  const empty = seed.filter(item => !(Sheets.Spreadsheets.Values.get(id, item.range.split('!')[0] + '!A1').values || []).length);
  if (empty.length) Sheets.Spreadsheets.Values.batchUpdate({ valueInputOption: 'RAW', data: empty }, id);
  if (props.getProperty('INITIALIZED') !== 'yes') {
    const requests = [];
    [0,1,2].forEach(sheetId => {
      requests.push({ updateSheetProperties: { properties: {sheetId, gridProperties:{frozenRowCount:1}}, fields:'gridProperties.frozenRowCount' } });
      requests.push({ repeatCell: {range:{sheetId,startRowIndex:0,endRowIndex:sheetId === 0 ? 8 : sheetId === 1 ? 4 : 1,startColumnIndex:0,endColumnIndex:sheetId === 0 ? 2 : sheetId === 1 ? 10 : 15},cell:{userEnteredFormat:{textFormat:{fontFamily:'Arial',fontSize:11},wrapStrategy:'WRAP',verticalAlignment:'TOP'}},fields:'userEnteredFormat'} });
      requests.push({ repeatCell: {range:{sheetId,startRowIndex:0,endRowIndex:1},cell:{userEnteredFormat:{backgroundColor:{red:.212,green:.369,blue:.294},textFormat:{fontFamily:'Arial',fontSize:11,bold:true,foregroundColor:{red:1,green:1,blue:1}}}},fields:'userEnteredFormat.backgroundColor,userEnteredFormat.textFormat'} });
      requests.push({ updateDimensionProperties: {range:{sheetId,dimension:'ROWS',startIndex:0,endIndex:1},properties:{pixelSize:36},fields:'pixelSize'} });
    });
    const width = (sheetId,start,end,pixelSize) => requests.push({updateDimensionProperties:{range:{sheetId,dimension:'COLUMNS',startIndex:start,endIndex:end},properties:{pixelSize},fields:'pixelSize'}});
    width(0,0,1,150); width(0,1,2,640);
    width(1,0,2,140); width(1,2,3,430); width(1,3,8,230); width(1,8,10,150);
    width(2,0,15,180); [3,6,9,12].forEach(c=>width(2,c,c+1,90)); [4,7,10].forEach(c=>width(2,c,c+1,380)); [5,8,11].forEach(c=>width(2,c,c+1,280)); width(2,14,15,300);
    requests.push({updateDimensionProperties:{range:{sheetId:0,dimension:'ROWS',startIndex:1,endIndex:8},properties:{pixelSize:66},fields:'pixelSize'}});
    requests.push({updateDimensionProperties:{range:{sheetId:1,dimension:'ROWS',startIndex:1,endIndex:4},properties:{pixelSize:130},fields:'pixelSize'}});
    requests.push({repeatCell:{range:{sheetId:2,startRowIndex:1,startColumnIndex:0,endColumnIndex:1},cell:{userEnteredFormat:{numberFormat:{type:'DATE_TIME',pattern:'yyyy/mm/dd hh:mm:ss'}}},fields:'userEnteredFormat.numberFormat'}});
    Sheets.Spreadsheets.batchUpdate({requests}, id);
    props.setProperty('INITIALIZED','yes');
  }
  // 預先格式化回覆區；append 不插入新列，避免繼承標題列的格式。
  if (props.getProperty('RESPONSE_FORMAT_VERSION') !== '1') {
    Sheets.Spreadsheets.batchUpdate({requests:[
      {repeatCell:{range:{sheetId:2,startRowIndex:1,startColumnIndex:0,endColumnIndex:15},cell:{userEnteredFormat:{backgroundColor:{red:1,green:1,blue:1},textFormat:{fontFamily:'Arial',fontSize:11,bold:false,foregroundColor:{red:0,green:0,blue:0}},wrapStrategy:'WRAP',verticalAlignment:'TOP'}},fields:'userEnteredFormat'}},
      {repeatCell:{range:{sheetId:2,startRowIndex:1,startColumnIndex:0,endColumnIndex:1},cell:{userEnteredFormat:{numberFormat:{type:'DATE_TIME',pattern:'yyyy/mm/dd hh:mm:ss'}}},fields:'userEnteredFormat.numberFormat'}}
    ]},id);
    props.setProperty('RESPONSE_FORMAT_VERSION','1');
  }
  upgradeQuestionnaire_();
  const meta = Sheets.Spreadsheets.get(id, {fields:'spreadsheetUrl'});
  console.log('後台試算表：' + meta.spreadsheetUrl);
  return meta.spreadsheetUrl;
}

// 表頭第一行保留欄位識別，後續各行可顯示完整題文。
function responseHeadersMatch_(headers, expected) {
  return Array.isArray(headers) && headers.length === expected.length &&
    headers.every((header, index) => typeof header === 'string' && header.split('\n')[0] === expected[index]);
}

function upgradeQuestionnaire_() {
  const props=PropertiesService.getScriptProperties();
  if(props.getProperty('QUESTIONNAIRE_SCHEMA_VERSION')==='2') return;
  const id=spreadsheetId_();
  const headers=(Sheets.Spreadsheets.Values.get(id,"'回覆'!A1:T1").values||[])[0]||[];
  if(!responseHeadersMatch_(headers,BASE_HEADERS) && !responseHeadersMatch_(headers,HEADERS)) throw new Error('回覆標題列與預期不同，停止更新以保留資料');
  const data=[];
  if(headers.length===BASE_HEADERS.length) data.push({range:"'回覆'!P1:T1",values:[HEADERS.slice(15)]});
  const fillIfBlank=(range,values)=>{
    if(!(Sheets.Spreadsheets.Values.get(id,range).values||[]).some(row=>row.some(v=>v!==''))) data.push({range,values});
  };
  fillIfBlank("'題目'!A5:J5",[DEFAULT_QUESTIONS[3]]);
  fillIfBlank("'設定'!A9:B9",[['Q7 題目',DEFAULT_ASK.title]]);
  fillIfBlank("'設定'!A10:B10",[['Q7 輸入提示',DEFAULT_ASK.placeholder]]);
  const oldHelp=(Sheets.Spreadsheets.Values.get(id,"'設定'!B8").values||[])[0];
  if(oldHelp && oldHelp[0]==='本頁與「題目」頁修改後，網站重新整理即更新。維持 3 題、每題 5 選項。') data.push({range:"'設定'!B8",values:[['本頁與「題目」頁修改後，網站重新整理即更新。四道單選題各五個選項；Q7 為選填文字。']]});
  if(data.length) Sheets.Spreadsheets.Values.batchUpdate({valueInputOption:'RAW',data},id);
  const bodyFormat={backgroundColor:{red:1,green:1,blue:1},textFormat:{fontFamily:'Arial',fontSize:11,bold:false,foregroundColor:{red:0,green:0,blue:0}},wrapStrategy:'WRAP',verticalAlignment:'TOP'};
  const requests=[
    {repeatCell:{range:{sheetId:2,startRowIndex:1,startColumnIndex:15,endColumnIndex:20},cell:{userEnteredFormat:bodyFormat},fields:'userEnteredFormat'}},
    {repeatCell:{range:{sheetId:2,startRowIndex:0,endRowIndex:1,startColumnIndex:15,endColumnIndex:20},cell:{userEnteredFormat:{backgroundColor:{red:.212,green:.369,blue:.294},textFormat:{fontFamily:'Arial',fontSize:11,bold:true,foregroundColor:{red:1,green:1,blue:1}},wrapStrategy:'WRAP'}},fields:'userEnteredFormat'}},
    {repeatCell:{range:{sheetId:1,startRowIndex:4,endRowIndex:5,startColumnIndex:0,endColumnIndex:10},cell:{userEnteredFormat:bodyFormat},fields:'userEnteredFormat'}},
    {repeatCell:{range:{sheetId:0,startRowIndex:8,endRowIndex:10,startColumnIndex:0,endColumnIndex:2},cell:{userEnteredFormat:bodyFormat},fields:'userEnteredFormat'}},
    {updateDimensionProperties:{range:{sheetId:1,dimension:'ROWS',startIndex:4,endIndex:5},properties:{pixelSize:130},fields:'pixelSize'}},
    {updateDimensionProperties:{range:{sheetId:0,dimension:'ROWS',startIndex:8,endIndex:10},properties:{pixelSize:66},fields:'pixelSize'}}
  ];
  [100,380,280,380,440].forEach((pixelSize,i)=>requests.push({updateDimensionProperties:{range:{sheetId:2,dimension:'COLUMNS',startIndex:15+i,endIndex:16+i},properties:{pixelSize},fields:'pixelSize'}}));
  Sheets.Spreadsheets.batchUpdate({requests},id);
  props.setProperty('QUESTIONNAIRE_SCHEMA_VERSION','2');
}

function spreadsheetId_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('後台尚未初始化，請由管理者執行 initializeBackend');
  return id;
}

function readSurvey_() {
  const result = Sheets.Spreadsheets.Values.batchGet(spreadsheetId_(), {ranges:["'設定'!A2:B10","'題目'!A2:J5"],valueRenderOption:'FORMATTED_VALUE'});
  const settings = {};
  (result.valueRanges[0].values || []).forEach(r=>{settings[r[0]]=r[1];});
  const clean = (value, limit) => {
    const text = String(value || '').trim();
    if (!text || text.length > limit) throw new Error('問卷設定有未填或過長的文字');
    return text;
  };
  const clubs = clean(settings['社團選項'],1000).split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  if (!clubs.length || clubs.length>20 || new Set(clubs).size!==clubs.length || clubs.some(c=>c.length>50)) throw new Error('社團選項設定有誤');
  const questionRows = result.valueRanges[1].values || [];
  if (questionRows.length !== 4) throw new Error('請維持四道單選題');
  const questions=questionRows.map((r,i)=>{
    if (r[0] !== 'q'+(i+1)) throw new Error('請維持題目代碼 q1、q2、q3、q4');
    const options=r.slice(3,8).map(x=>clean(x,300));
    if (options.length!==5 || new Set(options).size!==5) throw new Error('每題需有五個不同選項');
    return {id:r[0],tag:clean(r[1],50),title:clean(r[2],1000),options,low:clean(r[8],100),high:clean(r[9],100),showScore:i<3};
  });
  if (!['是','否'].includes(settings['開放收件'])) throw new Error('開放收件請填是或否');
  const ask={title:clean(settings['Q7 題目'],1000),placeholder:clean(settings['Q7 輸入提示'],300),maxLength:500,required:false};
  const config={title:clean(settings['問卷標題'],150),subtitle:clean(settings['主辦社團'],150),intro:clean(settings['填答說明'],2000),thanks:clean(settings['完成訊息'],2000),open:settings['開放收件']==='是',clubs,questions,ask};
  config.version=Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify(config),Utilities.Charset.UTF_8)).slice(0,22);
  return config;
}

function getSurvey() {
  try { return {ok:true,survey:readSurvey_()}; }
  catch(e) { console.error(e); return {ok:false,error:'無法載入問卷設定，請聯絡主辦夥伴。'}; }
}

function doGet(e) {
  if(e && e.parameter && e.parameter.action==='config') return json_(getSurvey());
  return HtmlService.createHtmlOutputFromFile('index').setTitle('台大領袖社 × 台科領袖社・課前問卷').addMetaTag('viewport','width=device-width, initial-scale=1');
}

function doPost(e) {
  try {
    if(!e || !e.postData || e.postData.contents.length>20000) throw new Error('格式不正確');
    return json_(submitResponse(JSON.parse(e.postData.contents)));
  } catch(e) { return json_({ok:false,error:'資料無法讀取，請重新整理後再試。'}); }
}

function submitResponse(data) {
  const lock=LockService.getScriptLock();
  let locked=false;
  try {
    if(!data || typeof data!=='object' || Array.isArray(data)) throw new Error('填答資料格式不正確');
    if(typeof data.responseId!=='string' || !/^[a-zA-Z0-9-]{15,80}$/.test(data.responseId)) throw new Error('回覆代碼不正確，請重新整理');
    if(typeof data.name!=='string' || !data.name.trim() || data.name.trim().length>30) throw new Error('請填寫姓名（最多 30 字）');
    locked=lock.tryLock(10000);
    if(!locked) throw new Error('目前填答人數較多，請稍後重試');
    const id=spreadsheetId_();
    const existing=Sheets.Spreadsheets.Values.batchGet(id,{ranges:["'回覆'!A1:T1","'回覆'!O2:O"],valueRenderOption:'FORMATTED_VALUE'}).valueRanges;
    if(!responseHeadersMatch_((existing[0].values || [])[0],HEADERS)) throw new Error('回覆欄位已變動，請聯絡主辦夥伴');
    if((existing[1].values || []).some(row=>row[0]===data.responseId)) return {ok:true,duplicate:true};
    const survey=readSurvey_();
    if(!survey.open) throw new Error('問卷已暫停收件');
    if(data.version!==survey.version) throw new Error('題目剛有更新，請重新整理網頁後再填寫');
    if(typeof data.club!=='string' || !survey.clubs.includes(data.club)) throw new Error('請選擇社團');
    if(data.ask!==undefined && typeof data.ask!=='string') throw new Error('想問講師的問題格式不正確');
    const ask=(data.ask||'').trim();
    if(ask.length>500) throw new Error('想問講師的問題最多 500 字');
    // 以台北時間的 Sheets 日期序號儲存，顯示與排序皆為日期資料。
    const row=[Date.now()/86400000+25569+8/24,data.name.trim(),data.club];
    let total=0;
    survey.questions.slice(0,3).forEach(q=>{
      const score=data[q.id+'_score'];
      if(!Number.isInteger(score) || score<1 || score>5) throw new Error('請完成所有題目');
      total+=score; row.push(score,q.title,q.options[score-1]);
    });
    row.push(total,survey.version,data.responseId);
    const breathing=survey.questions[3];
    const breathingChoice=data.q4_score;
    if(!Number.isInteger(breathingChoice) || breathingChoice<1 || breathingChoice>5) throw new Error('請選擇呼吸頻率');
    row.push(breathingChoice,breathing.title,breathing.options[breathingChoice-1],survey.ask.title,ask);
    // RAW 保證姓名或題目即使以 = 開頭也只當文字，不執行公式。
    Sheets.Spreadsheets.Values.append({values:[row]},id,"'回覆'!A:T",{valueInputOption:'RAW',insertDataOption:'OVERWRITE'});
    return {ok:true};
  } catch(e) {console.error(e);return {ok:false,error:e.message || '儲存失敗，請稍後重試。'};}
  finally {if(locked) lock.releaseLock();}
}

function json_(value) {return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);}
