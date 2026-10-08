const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const code = fs.readFileSync('apps-script/Code.gs', 'utf8');
const sheets = {};
let locked = false;
function sheet(name, data) {
  return { data, getLastRow() { return this.data.length; }, getRange(row, col, rows, cols) {
    return { getDisplayValues: () => Array.from({length:rows}, (_, r) => Array.from({length:cols}, (_, c) => String(data[row-1+r]?.[col-1+c] ?? ''))),
      createTextFinder: text => ({matchEntireCell: () => ({findNext: () => data.slice(row-1).some(r => r[col-1] === text) ? {} : null})}) };
  }, appendRow(row) { assert.equal(locked, true); data.push(row); } };
}
const Sheets = {Spreadsheets:{Values:{
  batchGet(id, options) { return {valueRanges:options.ranges.map(range=>{
    if(range.includes('設定')) return {values:sheets['設定'].data.slice(1)};
    if(range.includes('題目')) return {values:sheets['題目'].data.slice(1)};
    if(/A1:[OT]1/.test(range)) return {values:[sheets['回覆'].data[0]]};
    if(range.includes('O2:O')) return {values:sheets['回覆'].data.slice(1).map(row=>[row[14]])};
    throw new Error('Unexpected range '+range);
  })}; },
  append(body,id,range,options) {assert.equal(options.valueInputOption,'RAW'); sheets['回覆'].appendRow(body.values[0]);}
}}};
const ctx = vm.createContext({console: {log(){},error(){}}, Session: { getActiveUser: () => ({getEmail:()=>'someone-else@example.com'}) }, PropertiesService: {getScriptProperties: () => ({getProperty:()=> 'test-sheet'})}, Sheets, LockService: {getScriptLock:()=>({tryLock:()=>{locked=true;return true;},releaseLock:()=>{locked=false;}})}, Utilities:{DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},computeDigest:(_,v)=>crypto.createHash('sha256').update(v).digest(),base64EncodeWebSafe:v=>Buffer.from(v).toString('base64url')}});
vm.runInContext(code, ctx);
const originals = JSON.parse(vm.runInContext('JSON.stringify(DEFAULT_QUESTIONS)', ctx));
sheets['設定'] = sheet('設定', [['設定項目','內容'],['問卷標題','課前 QA：專注力自我覺察'],['主辦社團','台大領袖社 × 台科領袖社'],['填答說明','測試說明'],['完成訊息','謝謝填答'],['開放收件','是'],['社團選項','台大領袖社\n台科領袖社'],['修改方式',''],['Q7 題目','有沒有特別想要問講師的，也歡迎提出~'],['Q7 輸入提示','寫下你的問題']]);
sheets['題目'] = sheet('題目', [Array(10).fill('header'),...originals.map(row=>row.slice())]);
const headers = JSON.parse(vm.runInContext('JSON.stringify(HEADERS)',ctx));
sheets['回覆'] = sheet('回覆', [headers]);
const cfg=ctx.getSurvey(); assert.equal(cfg.ok,true); assert.equal(cfg.survey.questions.length,4,'Q6 呼吸頻率必須載入');
assert.equal(cfg.survey.questions[3].showScore,false);
assert.equal(cfg.survey.ask.required,false); assert.equal(cfg.survey.ask.maxLength,500);
const data = {responseId:'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',version:cfg.survey.version,name:'測試夥伴',club:'台大領袖社',q1_score:1,q2_score:3,q3_score:5,q4_score:5,ask:'  我想知道如何專注？  ',q1_answer:'偽造選項',q4_answer:'偽造呼吸選項'};
assert.equal(ctx.submitResponse(data).ok,true);
assert.equal(sheets['回覆'].data[1][12],9);
assert.equal(sheets['回覆'].data[1][5],originals[0][3]);
assert.equal(sheets['回覆'].data[1][15],5);
assert.equal(sheets['回覆'].data[1][17],'5 下以內');
assert.equal(sheets['回覆'].data[1][19],'我想知道如何專注？');
assert.equal(ctx.submitResponse(data).duplicate,true); assert.equal(sheets['回覆'].data.length,2);
for (const change of [{club:'不存在的社團'},{q1_score:1.5},{version:'old'},{name:' '},{q2_score:null},{q4_score:null},{q4_score:2.5},{ask:'字'.repeat(501)},{ask:{text:'bad'}}]) {
  assert.equal(ctx.submitResponse({...data,responseId:crypto.randomUUID(),...change}).ok,false);
  assert.equal(sheets['回覆'].data.length,2);
}
assert.equal(ctx.submitResponse({...data,responseId:crypto.randomUUID(),name:'=HYPERLINK("bad")',ask:'=SUM(1,2)'}).ok,true);
assert.equal(sheets['回覆'].data[2][1],'=HYPERLINK("bad")'); // RAW option above prevents formula interpretation.
assert.equal(sheets['回覆'].data[2][19],'=SUM(1,2)');
assert.equal(ctx.submitResponse({...data,responseId:crypto.randomUUID(),ask:''}).ok,true);
assert.equal(sheets['回覆'].data[3][19],'');
assert.equal(ctx.submitResponse({...data,responseId:crypto.randomUUID(),ask:'字'.repeat(500)}).ok,true);
assert.equal(sheets['回覆'].data[4][19].length,500);
sheets['題目'].data[1][2]='更新題目';
assert.equal(ctx.submitResponse({...data,responseId:crypto.randomUUID()}).ok,false);
assert.equal(sheets['回覆'].data[1][4],originals[0][2]);
sheets['設定'].data[5][1]='否';
assert.equal(ctx.submitResponse({...data,responseId:crypto.randomUUID(),version:ctx.getSurvey().survey.version}).ok,false);
assert.throws(()=>ctx.initializeBackend(),/限後台管理者/);
assert.equal(locked,false);
console.log('PASS: Q6 required, Q6 excluded from total, Q7 optional/500 chars, safe text, duplicate retry, invalid club/score/version/name, snapshots, closed survey, admin restriction');
