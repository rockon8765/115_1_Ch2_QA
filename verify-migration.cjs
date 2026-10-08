const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const properties = {SPREADSHEET_ID:'existing-sheet',INITIALIZED:'yes',RESPONSE_FORMAT_VERSION:'1'};
const rows = {};
const rangeParts = range => {
  const [,name,first,last] = range.match(/^'([^']+)'!([A-Z]+\d+)(?::([A-Z]+\d+))?$/);
  const point = cell => {const [,col,row]=cell.match(/^([A-Z]+)(\d+)$/); return [Number(row)-1, [...col].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0)-1];};
  return {name,start:point(first),end:point(last||first)};
};
const api = {Values:{
  get(id,range) {
    const {name,start,end}=rangeParts(range);
    const values=rows[name].slice(start[0],end[0]+1).map(row=>row.slice(start[1],end[1]+1));
    return {values:values.some(row=>row.some(v=>v!==''&&v!==undefined))?values:[]};
  },
  batchUpdate(body) {
    assert.equal(body.valueInputOption,'RAW');
    for(const item of body.data) {
      const {name,start}=rangeParts(item.range);
      item.values.forEach((row,r)=>row.forEach((value,c)=>{rows[name][start[0]+r] ||= []; rows[name][start[0]+r][start[1]+c]=value;}));
    }
  }
},batchUpdate(){},get(){return {spreadsheetUrl:'https://example.test/existing-sheet'};}};
const ctx=vm.createContext({console:{log(){}},Session:{getActiveUser:()=>({getEmail:()=>'rockon8765@gmail.com'})},PropertiesService:{getScriptProperties:()=>({getProperty:k=>properties[k],setProperty:(k,v)=>{properties[k]=v;}})},Sheets:{Spreadsheets:api}});
vm.runInContext(fs.readFileSync('apps-script/Code.gs','utf8'),ctx);
rows['設定']=[['設定項目','內容'],['問卷標題','主辦修改過的標題'],['主辦社團','台大領袖社 × 台科領袖社'],['填答說明','既有說明'],['完成訊息','既有訊息'],['開放收件','是'],['社團選項','台大領袖社\n台科領袖社'],['修改方式','原使用說明']];
rows['題目']=[['題目代碼','主題','題目'],...JSON.parse(vm.runInContext('JSON.stringify(DEFAULT_QUESTIONS.slice(0,3))',ctx))];
const oldHeaders=JSON.parse(vm.runInContext('JSON.stringify(HEADERS.slice(0,15))',ctx));
const oldRow=[46302,'既有夥伴','台大領袖社',1,'原題一','原選項一',3,'原題二','原選項二',5,'原題三','原選項三',9,'舊版本','existing-response-id'];
rows['回覆']=[oldHeaders.slice(),oldRow.slice()];
ctx.initializeBackend();
assert.equal(rows['題目'].length,5,'保留三道舊量表並補第六題');
assert.equal(rows['題目'][4][0],'q4');
assert.equal(rows['回覆'][0].length,20,'新欄位附加到最後，不搬移舊欄位');
assert.deepEqual(rows['回覆'][0].slice(0,15),oldHeaders);
assert.deepEqual(rows['回覆'][1],oldRow,'歷史回覆保持完整');
assert.equal(rows['設定'][1][1],'主辦修改過的標題');
assert.equal(rows['設定'][8][1],'有沒有特別想要問講師的，也歡迎提出~');
rows['題目'][4][2]='管理者微調過的呼吸題';
rows['設定'][8][1]='管理者微調過的講師題';
ctx.initializeBackend();
assert.equal(rows['題目'][4][2],'管理者微調過的呼吸題');
assert.equal(rows['設定'][8][1],'管理者微調過的講師題');
assert.deepEqual(rows['回覆'][1],oldRow);
console.log('PASS: migration preserves existing answers/settings, appends five columns, seeds Q6/Q7, and is idempotent');
