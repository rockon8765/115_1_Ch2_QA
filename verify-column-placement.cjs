const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ctx = {console:{error(){},log(){}},PropertiesService:{getScriptProperties:()=>({getProperty:()=> 'test-sheet'})}};
let locked=false;
ctx.LockService={getScriptLock:()=>({tryLock:()=>{locked=true;return true;},releaseLock:()=>{locked=false;}})};
let headers, rows=[], hiddenColumnA=true;
ctx.Sheets={Spreadsheets:{Values:{
  batchGet:()=>({valueRanges:[{values:[headers]}, {values:rows.slice(1).map(r=>[r[14]])}]}),
  append(body){
    assert(locked);
    rows.push(hiddenColumnA ? ['',...body.values[0]] : body.values[0]);
  }
},batchUpdate(body){
  assert(locked);
  assert.equal(body.requests.length,1);
  const req=body.requests[0].appendCells;
  assert.equal(req.sheetId,2);
  assert.equal(req.fields,'userEnteredValue');
  assert.equal(req.rows.length,1);
  assert.equal(req.rows[0].values.length,20);
  const row=req.rows[0].values.map(c=>{
    assert(!('formulaValue' in c.userEnteredValue));
    return c.userEnteredValue.numberValue ?? c.userEnteredValue.stringValue;
  });
  rows.push(row);
}}};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('apps-script/Code.gs','utf8'),ctx);
headers=JSON.parse(vm.runInContext('JSON.stringify(HEADERS)',ctx));
const questions=JSON.parse(vm.runInContext('JSON.stringify(DEFAULT_QUESTIONS)',ctx)).map(r=>({id:r[0],title:r[2],options:r.slice(3,8)}));
ctx.readSurvey_=()=>({open:true,version:'current',clubs:['台科領袖社'],questions,ask:{title:'想問講師'}});
rows=[headers,Array(20).fill('existing'),[],['partial row without response ID']];
const previous=JSON.stringify(rows);
const data={responseId:'hidden-column-placement-test',version:'current',name:'=保留為文字',club:'台科領袖社',q1_score:1,q2_score:2,q3_score:3,q4_score:4,ask:'=SUM(1,2)'};
assert.equal(ctx.submitResponse(data).ok,true);
const written=rows.at(-1);
assert.equal(written.length,20,'隱藏 A 欄時仍必須由 A 寫到 T');
assert.equal(typeof written[0],'number','A 必須是時間戳');
assert.equal(written[1],data.name,'B 必須是姓名');
assert.equal(written[2],data.club);
assert.equal(written[12],6);
assert.equal(written[14],data.responseId);
assert.equal(written[19],data.ask);
assert.equal(JSON.stringify(rows.slice(0,-1)),previous,'不得覆蓋空洞前後的歷史或不完整資料');
assert.equal(ctx.submitResponse(data).duplicate,true);
hiddenColumnA=false;
assert.equal(ctx.submitResponse({...data,responseId:'visible-column-placement-test'}).ok,true);
assert.equal(rows.at(-1)[1],data.name);
assert.equal(locked,false);
console.log('PASS: hidden/visible A column, fixed A:T placement, gaps and partial rows preserved, RAW text, duplicate retry and lock');
