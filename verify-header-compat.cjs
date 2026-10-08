const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const source = fs.readFileSync(process.argv[2] || 'apps-script/Code.gs', 'utf8');
const sandbox = {
  console: {log() {}, error() {}},
  LockService: {getScriptLock: () => ({tryLock: () => true, releaseLock() {}})},
  PropertiesService: {getScriptProperties: () => ({getProperty: () => 'sheet-id'})},
  Sheets: {Spreadsheets: {Values: {}}}
};
vm.createContext(sandbox);
vm.runInContext(source, sandbox);
const base = JSON.parse(vm.runInContext('JSON.stringify(HEADERS)', sandbox));
const decorated = base.map((value, i) => [4, 7, 10, 16, 18].includes(i) ? value + '\n完整題目文字' : value);
const survey = {
  open: true, version: 'current', clubs: ['台大領袖社'],
  questions: ['q1', 'q2', 'q3', 'q4'].map(id => ({id, title: id + '完整題文', options: ['一', '二', '三', '四', '五']})),
  ask: {title: '想問講師的完整題文'}
};
sandbox.readSurvey_ = () => survey;
let headers = base;
let appended = [];
let duplicateIds = [];
sandbox.Sheets.Spreadsheets.Values.batchGet = () => ({valueRanges: [{values: [headers]}, {values: duplicateIds.map(id => [id])}]});
sandbox.Sheets.Spreadsheets.Values.append = () => {throw new Error('不得使用 Values.append');};
sandbox.Sheets.Spreadsheets.batchUpdate = body => appended.push(body.requests[0].appendCells.rows[0].values.map(c=>c.userEnteredValue.numberValue ?? c.userEnteredValue.stringValue));
const data = {responseId: 'header-compat-local-test', name: '本機測試', club: '台大領袖社', version: 'current', q1_score: 1, q2_score: 2, q3_score: 3, q4_score: 4, ask: '問題'};
const invoke = () => JSON.parse(JSON.stringify(sandbox.submitResponse(data)));
assert.deepEqual(invoke(), {ok: true});
const originalRow = appended[0].slice(1);
headers = decorated;
assert.deepEqual(invoke(), {ok: true}, '完整題文表頭應維持正常收件');
assert.deepEqual(appended[1].slice(1), originalRow, '欄位及寫入資料順序不變');
assert.equal(appended[1].length, 20);
for (const invalid of [base.slice(0, -1), [...base, '新增欄'], base.map((v, i) => i === 4 ? '錯誤欄位\n題目' : v), [base[1], base[0], ...base.slice(2)], undefined]) {
  headers = invalid;
  assert.equal(invoke().error, '回覆欄位已變動，請聯絡主辦夥伴');
}
headers = decorated;
duplicateIds = [data.responseId];
assert.deepEqual(invoke(), {ok: true, duplicate: true});
assert.equal(appended.length, 2, '錯誤欄位及重複資料不得寫入');
duplicateIds = [];
data.version = 'intentionally-invalid';
assert.equal(invoke().error, '題目剛有更新，請重新整理網頁後再填寫');
assert.equal(appended.length, 2, '版本不符不得寫入');
console.log('PASS: original/decorated headers, 20-column receipt, duplicate protection, invalid-header rejection, no-write version check');
