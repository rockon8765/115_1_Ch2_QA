# 台大領袖社 × 台科領袖社｜聯合社課課前問卷

提供課程學員填寫的專注力自我覺察問卷。前端為靜態 HTML，題目與選項從 Google 試算表讀取，透過 Apps Script 收件。

## 使用中的網站與後台

- [公開填答網站（Sites）](https://zen-club-qa-yoga-20261007.ntustleader70.chatgpt.site/)
- [Google 試算表後台](https://docs.google.com/spreadsheets/d/1hhVqZYsvuN9pnQiHXUFSVimPIIKBb0zuun4X-T-Fs2g/edit)：維持私人權限。
- [修改題目](https://docs.google.com/spreadsheets/d/1hhVqZYsvuN9pnQiHXUFSVimPIIKBb0zuun4X-T-Fs2g/edit#gid=1)
- [查看回覆](https://docs.google.com/spreadsheets/d/1hhVqZYsvuN9pnQiHXUFSVimPIIKBb0zuun4X-T-Fs2g/edit#gid=2)
- [Apps Script 專案](https://script.google.com/home/projects/1fG7E0lyqVELjOvEDZDRUzNGOgjZgqpDjLKdF-opZeZnCyu_SbhqKc58i/edit)

Apps Script `/exec` 網址已填入靜態前端的 `SCRIPT_URL`。Git 推送只同步原始碼；Apps Script 程式的後續變更仍須在 Google 編輯器更新既有部署，Sites 發佈也有自己的部署流程。

## 問卷內容與操作

- 姓名與社團必填，社團選項為「台大領袖社」「台科領袖社」。
- 三道專注力題目各為 1–5 分，總分 3–15。
- 第六題為呼吸頻率，程式代碼為 `q4`，必填但不加入前三題總分。
- 第七題為想問講師的問題，選填、最多 500 字。
- 按「開始填寫」進入問卷，並在這次點擊中嘗試播放背景音樂；可用音樂按鈕開關。音樂無法播放時仍可填答。
- 「沒有標準答案，選最接近你「最近一週」實際情況的選項就好。」另起一行顯示。

靜態網站目前將簡答題顯示為「有沒有想問講師的問題呢~」；後台與歷史回覆保留設定中的題文。若日後要一起調整，請同時檢查前端 `ASK` 的顯示文字與「設定」分頁的 Q7 題目。

## 檔案用途

| 路徑 | 用途 |
| --- | --- |
| `index.html`、`assets/background-music.mp3` | GitHub Pages 根目錄版本 |
| `dist/index.html`、`dist/assets/background-music.mp3` | 已發佈 Sites 的靜態版本，與根目錄前端內容相同 |
| `.openai/hosting.json` | 既有 Sites 專案設定，靜態輸出目錄為 `dist` |
| `apps-script/Code.gs` | 已部署第 5 版的收件、固定 A:T 欄位寫入、資料遷移與表頭相容程式 |
| `apps-script/appsscript.json` | Apps Script V8、台北時區、Advanced Sheets Service 與授權範圍 |
| `apps-script/index.html` | Google HtmlService 既有備援前端，支援四道單選題與簡答；未加入 Sites 的開始入口與背景音樂 |
| `verify-backend.cjs` | 收件與驗證邏輯測試 |
| `verify-migration.cjs` | 舊 15 欄遷移至 20 欄、保留資料與重複執行測試 |
| `verify-header-compat.cjs` | 原表頭、換行題文表頭與錯誤欄位檢查 |
| `verify-column-placement.cjs` | 隱藏 A 欄時的 A:T 寫入、歷史列與文字型別檢查 |

日後調整靜態前端時，請同步 `index.html` 與 `dist/index.html`；音樂檔的相對路徑可用於 GitHub Pages 的專案子目錄。HtmlService 不會供應這些相對靜態資產，因此備援前端獨立保存。

## 平常修改題目

- 「設定」分頁：標題、主辦社團、填答說明、完成訊息、開放收件、社團選項，以及 Q7 題目與輸入提示。
- 「題目」分頁：四道單選題的主題、題文、五個選項與量尺提示。保留 `q1`、`q2`、`q3`、`q4` 代碼與每題五個選項。
- 「回覆」分頁：每筆填答一列，保存題文、選項、問卷版本與去重代碼。歷史題文與選項是填答當時的快照。

修改設定或題目後，填答網站重新整理即可讀到更新；已開啟的舊版表單會被版本檢查提醒重新整理。

### 完整題文表頭

現有回覆表的 E1、H1、K1、Q1、S1 已使用「原欄名＋換行＋完整題文」，並開啟換行、增加列高。程式檢查第一行的欄位識別、完整欄數與順序，允許後續行顯示題文。

第一行的 `Q1 題目`、`Q2 題目`、`Q3 題目`、`Q6 題目`、`Q7 題目` 及其他欄名仍須保留。題目文字若有修改，可同步更新這五格第二行以後的顯示文字；不要搬移或插入回覆欄位。

完整題文是既有試算表的顯示設定；新建後台不會自動加入這些表頭題文。Apps Script 部署第 5 版與程式內的 `QUESTIONNAIRE_SCHEMA_VERSION = '2'` 是不同的版本計數。

可隱藏 A 欄時間戳。收件使用 `appendCells` 依 A:T 的固定欄位順序追加到工作表最後有資料的列之後，避免 `values.append` 的邏輯表格偵測改變起始欄。字串以 `stringValue` 寫入，公式樣式的姓名或簡答仍保留為文字。

## 重新建立獨立後台

若只是維護現有問卷，沿用原專案與部署即可。以下步驟用於另建後台；它不會自動接管舊範例的試算表。

1. 用目前程式指定的管理者帳號 `rockon8765@gmail.com` 建立 Apps Script 專案。若是另一位管理者，先調整 `initializeBackend` 的帳號檢查。
2. 貼入 `apps-script/Code.gs`，啟用資訊清單顯示並貼入 `apps-script/appsscript.json`；啟用 Advanced Sheets Service。沿用 `drive.file` 範圍，僅操作此程式建立的檔案。
3. 新增名稱為 `index` 的 HTML 檔案，貼入 `apps-script/index.html`，供 Google 備援網頁使用。
4. 執行 `initializeBackend` 並完成授權，建立含「設定」「題目」「回覆」的獨立試算表。重複執行保留既有設定與資料。
5. 部署網頁應用程式，執行身分選「我」，存取選「所有人」；試算表本身保持私人。
6. 將新部署的 `/exec` 網址填入 `index.html` 與 `dist/index.html` 的 `SCRIPT_URL`。

更新既有程式時，使用「部署 → 管理部署作業 → 編輯 → 建立新版本」更新同一部署，保留填答網站使用的 `/exec` 網址。

## GitHub Pages 與 Sites

GitHub Pages 可使用 `main` 分支、`/ (root)`，由根目錄 `index.html` 提供網站。Sites 則使用 `.openai/hosting.json` 指向的 `dist`。兩者均連接同一 Apps Script 後台，無需將回覆資料放進 GitHub。

## 本機驗證

只需 Node.js，無須安裝套件。從儲存庫根目錄執行：

```sh
node verify-backend.cjs
node verify-migration.cjs
node verify-header-compat.cjs
node verify-column-placement.cjs
```

測試使用本機假資料與 mock Google Sheets，不會向正式後台新增回覆。涵蓋必填、整數範圍、社團白名單、Q6 不計入總分、Q7 選填與字數限制、去重、問卷版本、純文字寫入、歷史快照、遷移保留資料、收件開關及表頭相容性。

本儲存庫僅保存程式、音樂資產與使用說明，不包含學員回覆、試算表匯出或登入憑證。

原始問卷參考：[rockon8765/115_1_Ch2_QA](https://github.com/rockon8765/115_1_Ch2_QA)。
