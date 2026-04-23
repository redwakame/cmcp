# 提案草稿：為什麼 AI Agent 需要一層正交於模型訓練的記憶政策協定

收件角色：OpenAI Agents / Platform 產品與工程負責人

我想提出的不是另一套 memory feature，而是一層比 feature 更底的協定：**Continuity Memory Contract Plus (CMCP)**。它處理的問題是，當 agent 開始跨 session、跨工具、跨宿主持續工作時，系統到底**可以記住什麼、應該怎麼升級、什麼絕不能寫、使用者怎麼修正**。今天大多數 agent 系統把這些規則散落在 prompt、工具程式、產品文案、資料庫欄位與模型行為裡，結果就是可用，但不可治理；能 demo，但不能穩定擴張。

我認為這件事不應主要靠模型訓練解。模型可以更會摘要、更會抽取，但**不能單靠訓練去決定產品層的記憶權限**。因為這是 runtime policy 問題，不是能力不足問題。相同一句使用者輸入，在不同表面、不同 invocation area、不同宿主環境下，可能應該進 `session`、`staged`、`tracked`、`daily memory`，也可能必須直接拒寫。這個決策需要可檢查、可驗證、可覆蓋、可被使用者糾正，而不是隱含在模型權重或模糊 prompt 裡。

CMCP 想做的，是把這層決策抽成一份平台可採納的契約。它至少定義：

- 新 session 如何只承接有效 continuity，而不是整段舊對話重播
- 什麼只留在 session，什麼才有資格進 staged / tracked
- 哪些 daily memory 只能是 derived writeback，不能反客為主
- 哪些 profile 類資訊可以升成長期個人化記憶
- 哪些內容永遠不能寫
- 使用者 correction 如何蓋過舊記憶與推論
- host、UI、installer、addon 如何映射同一套規則

這份提案的重點不是理論。我已經把它做成一個可驗證的 runtime bundle：有 canonical contract、有 guard、有 storage adapter boundary、有 host integration spec，也有多宿主、多版本、多模態的接線取樣驗證。換句話說，CMCP 不是「建議 AI 應該更有記性」，而是「把 agent memory 變成可治理介面」。

如果 OpenAI 正在思考更長期的 agents platform，我建議把 memory policy contract 視為與 tool calling、auth、sandboxing 同級的基礎層。沒有這一層，agent 會越來越能做事，但也越來越難回答：它為什麼記住這件事、為什麼忘記那件事、為什麼在這個宿主能寫、在另一個宿主不能寫。

我是以獨立實作者身分，把這件事先做成一個可以跑、可以驗、可以挑錯的原型。如果你們願意，我希望下一步不是先談品牌合作，而是先對齊一個更小的問題：**agent memory policy 是否值得成為平台層的顯式契約，而不只是產品實作細節。**
