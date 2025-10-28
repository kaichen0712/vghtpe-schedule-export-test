// import { useState, useEffect } from "react";
import { useState, useEffect } from "react";
import * as XLSX from "xlsx-js-style";

export default function App() {
  // 新增：頁簽狀態與文字內容
  const [tab, setTab] = useState(0); // 0: 編輯內容, 1: 使用說明, 2: 排序
  const [inputText, setInputText] = useState("");
  const [savedText, setSavedText] = useState("");
  const [filterText, setFilterText] = useState(""); // 過濾排序用
  const [missingNames, setMissingNames] = useState<string[]>([]);// 🟩 匯出後顯示沒比對到的人名

  // // 讀取 localStorage（如需自動載入先前內容，可開啟）
  // useEffect(() => {
  //   const saved = localStorage.getItem("mySavedText");
  //   if (saved !== null) {
  //     setSavedText(saved);
  //     setInputText(saved);
  //   }
  // }, []);
useEffect(() => {
    if (missingNames.length > 0) {
      setTab(2);
    }
  }, [missingNames]);


  // 儲存到 localStorage
  const handleSave = () => {
    setSavedText(inputText);
    localStorage.setItem("mySavedText", inputText); //localStorage key = "mySavedText"
  };
  // 清除輸入框資料
  const handleClear = () => {
  setInputText("");
  setSavedText("");
  localStorage.removeItem("mySavedText"); // 同時清掉 localStorage 的內容
  };
  //清除排序條件  
  const handleClearSort = () => {
  setFilterText("");
  localStorage.removeItem("scheduleSortList");
  alert("排序內容已清除！");
  };    

  // 解析 HTML table 並轉成 xlsx（支援紅字樣式、全表新細明體12pt）
  const handleExportHtmlTableToExcel = () => {
     const html = savedText || inputText;

      // 🔸若內容完全是空的
      if (!html.trim()) {
        alert("請先貼上內容或儲存表格再匯出！");
        return;
      }
    // 1. 解析 HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(savedText, "text/html");
    const table = doc.querySelector("table");
    if (!table) {
      alert("找不到 <table>，請確認內容有貼上 HTML 表格！");
      return;
    }

    // 2. 解析表格內容
    const rows: any[] = []; 
    for (const tr of table.querySelectorAll("tr")) {
      const row = [];
      for (const cell of tr.querySelectorAll("th,td")) {
        // 取 cell 文字（忽略 <img>）
        let text = "";
        for (const node of cell.childNodes) {
          if (node.nodeType === 1 && node.nodeName === "IMG") continue;
          text += node.textContent || "";
        }
        text = text.replace(/\s+/g, " ").trim();

        // 文字替換
        if (text === "例假" || text === "休假" || text === "休息日" || text === "特別休假") {
          text = "1";
        }

        // 是否包含 alt="長假預約"
        const hasLongVacation = Array.from(cell.querySelectorAll("img")).some(
          (img) => img.getAttribute("alt")?.includes("長假預約")
        );

        // 如果包含 alt="長假預約"，則設定文字為 "1"
        if (hasLongVacation) {
          text = "1";
        }

        // 收集 <img title="..."> 當成註解
        const imgTitles = Array.from(cell.querySelectorAll("img[title]"))
          .map((img) => img.getAttribute("title")?.trim() || "")
          .filter(Boolean);

        // 需要紅色字體（遇到長假預約）
        const isRedText = hasLongVacation;

        row.push({ text, imgTitles, isRedText });
      }
      rows.push(row);
    }
    // === 新增：根據排序清單重新排列 rows ===
     // === 根據排序清單重新排列 rows（簡化後修正版）===
      const savedSortText = localStorage.getItem("scheduleSortList");
      if (savedSortText) {
        // ⚠️ 直接使用使用者輸入的換行，不預先清理空白
        const sortList: string[] = savedSortText
          .split("\n")
          .map(x => x.trimEnd()); // 只去掉行尾空白，保留空白行

        const headerRows = rows.slice(0, 2);
        const dataRows = rows.slice(2);
        const sortedRows: any[] = [];
        const notFound: string[] = []; // 🟩 新增：紀錄沒比對到的人名
        let lastWasEmptyInOutput = false; // 新增：追蹤上一行是否為空白分區

        sortList.forEach((name) => {
          const trimmed = name.trim();

          // 🟦 若為純空白行 → 插入一行空白（但避免連續兩行）
          if (trimmed === "") {
            if (!lastWasEmptyInOutput) {
              const blankRow = new Array(rows[0]?.length || 1).fill(null).map(() => ({
                text: "",
                imgTitles: [],
                isRedText: false,
              }));
              sortedRows.push(blankRow);
              lastWasEmptyInOutput = true;
            }
            return;
          }

          // 🟦 若是純英數行 → 略過（不視為分區、不插空白）
          if (/^[A-Za-z0-9]+$/.test(trimmed)) {
            return;
          }

          // 🟩 嘗試在表格中比對姓名
          const matchedRow = dataRows.find((row) => {
            const firstCell = row[0]?.text?.trim?.() || "";
            return firstCell === trimmed;
          });

          if (matchedRow) {
            sortedRows.push(matchedRow);
            lastWasEmptyInOutput = false; // 有成功比對到人名 → 清除空白狀態
          } else {
            // 找不到人名 → 不輸出該列，但保留空白分隔
            if (!lastWasEmptyInOutput) {
              const blankRow = new Array(rows[0]?.length || 1).fill(null).map(() => ({
                text: "",
                imgTitles: [],
                isRedText: false,
              }));
              sortedRows.push(blankRow);
              lastWasEmptyInOutput = true;
            }

            // 記錄未匹配人名
            const isLikelyChineseName = /^[\u4e00-\u9fa5]{2,4}$/.test(trimmed);
            const nonNameKeywords = [
              "Leader", "新人", "上", "固定支援", "排班", "支援", "彈放",
              "實際人數", "上班人數", "行事曆", "日期", "姓名",
              "病房", "月初", "來班", "E", "N", "D"
            ];
            const isClearlyNonName =
              /^[0-9]+$/.test(trimmed) ||
              nonNameKeywords.some((kw) => trimmed.includes(kw));
            if (isLikelyChineseName && !isClearlyNonName) {
              notFound.push(trimmed);
            }
          }
        });

      // ✅ 合併回結果（修正版：分辨「只有分區/英數」vs「有人名但全找不到」）
      const hasChineseInSortList = sortList.some(line => /[\u4e00-\u9fa5]/.test(line));
      const hasAnyMatchedName = sortedRows.some(r => (r[0]?.text ?? "") !== ""); // true 表示至少有一列人名

      if (hasAnyMatchedName) {
        // 正常情況：有至少一個人名被加入
        rows.length = 0;
        rows.push(...headerRows, ...sortedRows);
        if (notFound.length > 0) {
          setMissingNames(notFound);
        } else {
          setMissingNames(["✅ 匯出成功！所有人名皆已匹配。"]);
        }
        setTab(2);
      } else {
        // 沒有任何人名被加入（sortedRows 可能只有空白分區，或完全沒有東西）
        if (!hasChineseInSortList) {
          // 例如：輸入「156」「Leader」或只有空行 —— 直接提醒並中止，不輸出
          alert("⚠️ 排序清單未包含任何中文姓名，請確認輸入是否正確。");
          return;
        } else {
          // 有中文但全找不到（例如：中文人名都不在 table）
          const confirmEmpty = window.confirm(
            "⚠️ 排序清單中的人名皆未在表格中找到。\n是否仍要匯出空白表格（只保留標題）？"
          );
          if (!confirmEmpty) return;

          rows.length = 0;
          rows.push(...headerRows);
          setMissingNames(
            notFound.length > 0
              ? notFound
              : ["⚠️ 清單人名皆未匹配，已輸出空白表格。"]
          );
          setTab(2);
        }
      }

    } else {
      // 沒設定排序：輸出完整原始表格
      setMissingNames(["✅ 匯出成功！（未設定排序，已完整輸出所有資料）"]);
      setTab(2);
    }
      
    // 3. 轉成 xlsx 的 sheet（先建立純值）
    const ws_data = rows.map((row: any[], idx: number) => {
      if (idx === 1) {
        return ["", ...row.map((cell: any) => cell.text)];
      }
      return row.map((cell: any) => cell.text);
    });
    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    // 4. 設定樣式（xlsx-js-style 使用 ARGB 色碼）
    const baseStyle = {
      font: {
        name: "新細明體",
        sz: 12,
        color: { rgb: "FF000000" } // 黑色
      }
    };
    const redStyle = {
      font: {
        name: "新細明體",
        sz: 12,
        color: { rgb: "FFFF0000" } // 紅色
      }
    };

    // 先套用紅字（長假預約）
    rows.forEach((row, r) => {
      row.forEach((cell: any, c: number) => {
        const colIdx = r === 1 ? c + 1 : c; // 與你原本邏輯一致
        const cellRef = XLSX.utils.encode_cell({ r, c: colIdx });
        if (!ws[cellRef]) ws[cellRef] = { t: "s", v: cell.text };

        if (cell.isRedText) {
          ws[cellRef].s = redStyle; // 紅色 + 新細明體 12
        }
      });
    });

    // 再確保其他沒指定樣式的 cell 用 baseStyle（新細明體 12）
    Object.keys(ws).forEach((cellRef) => {
      if (cellRef[0] === "!") return; // 跳過 metadata
      if (!ws[cellRef].s) {
        ws[cellRef].s = baseStyle;
      }
    });

    // 5. 加入註解（支援以 cell.c 寫入；部分 Excel 版本預設隱藏）
    rows.forEach((row, r) => {
      row.forEach((cell: any, c: number) => {
        const colIdx = r === 1 ? c + 1 : c;
        if (cell.imgTitles && cell.imgTitles.length > 0) {
          const cellRef = XLSX.utils.encode_cell({ r, c: colIdx });
          if (!ws[cellRef]) ws[cellRef] = { t: "s", v: cell.text };
          ws[cellRef].c = [
            {
              t: cell.imgTitles.join("\n"),
              a: "HTML",
              hidden: true, // 開啟檔案後如需顯示：Excel → 校閱 → 註解 → 顯示所有註解
            },
          ];
        }
      });
    });

    // 6. 欄寬
    ws["!cols"] = [{ wch: 16 }];

    // 7. 匯出
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "內容");

    // 取 #rptTitle 作為檔名
    const rptTitleElement = doc.querySelector("#rptTitle");
    const rptTitle = rptTitleElement ? rptTitleElement.textContent.trim() : "排版轉換";
    const fileName = `${rptTitle}.xlsx`;

    // 以 array → Blob 下載
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1000, // 加寬
          minWidth: 360,
          padding: "48px 40px",
          background: "#fff",
          borderRadius: 18,
          boxShadow: "0 6px 32px rgba(60,60,120,0.12)",
          margin: "32px 16px",
          boxSizing: "border-box",
        }}
      >
        <h1
          style={{
            fontSize: 36,
            fontWeight: 700,
            letterSpacing: 1,
            color: "#1976d2",
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          護理班表匯出工具
        </h1>
        <div
          style={{
            display: "flex",
            borderBottom: "2px solid #e3e8ee",
            marginBottom: 32,
            gap: 2,
            justifyContent: "center",
          }}
        >
          {/* 頁簽按鈕 */}
          <button
            style={{
              border: "none",
              background: tab === 0 ? "#e3f0fc" : "#f7fafd",
              padding: "12px 40px",
              cursor: "pointer",
              borderBottom: tab === 0 ? "3px solid #1976d2" : "none",
              fontWeight: tab === 0 ? "bold" : "normal",
              fontSize: 20,
              color: tab === 0 ? "#1976d2" : "#888",
              borderTopLeftRadius: 8,
              borderTopRightRadius: 8,
              transition: "all 0.2s",
            }}
            onClick={() => setTab(0)}
          >
            編輯內容
          </button>
          <button
            style={{
              border: "none",
              background: tab === 1 ? "#e3f0fc" : "#f7fafd",
              padding: "12px 40px",
              cursor: "pointer",
              borderBottom: tab === 1 ? "3px solid #1976d2" : "none",
              fontWeight: tab === 1 ? "bold" : "normal",
              fontSize: 20,
              color: tab === 1 ? "#1976d2" : "#888",
              borderTopLeftRadius: 8,
              borderTopRightRadius: 8,
              transition: "all 0.2s",
            }}
            onClick={() => setTab(1)}
          >
            過濾排序（選填）
          </button>
          <button
            style={{
              border: "none",
              background: tab === 2 ? "#e3f0fc" : "#f7fafd",
              padding: "12px 40px",
              cursor: "pointer",
              borderBottom: tab === 2 ? "3px solid #1976d2" : "none",
              fontWeight: tab === 2 ? "bold" : "normal",
              fontSize: 20,
              color: tab === 2 ? "#1976d2" : "#888",
              borderTopLeftRadius: 8,
              borderTopRightRadius: 8,
              transition: "all 0.2s",
            }}
            onClick={() => handleExportHtmlTableToExcel()}
          >
            匯出 Excel
          </button>
          <button
            style={{
              border: "none",
              background: tab === 3 ? "#e3f0fc" : "#f7fafd",
              padding: "12px 40px",
              cursor: "pointer",
              borderBottom: tab === 3 ? "3px solid #1976d2" : "none",
              fontWeight: tab === 3 ? "bold" : "normal",
              fontSize: 20,
              color: tab === 3 ? "#1976d2" : "#888",
              borderTopLeftRadius: 8,
              borderTopRightRadius: 8,
              transition: "all 0.2s",
            }}
            onClick={() => setTab(3)}
          >
            使用說明
          </button>
        </div>
        {/* 編輯內容頁簽 */}
        {tab === 0 && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 24, display: "flex", justifyContent: "center" }}>
         
               <div style={{ textAlign: "center", marginBottom: 24, display: "flex", justifyContent: "center" }}>
                <button
                  onClick={handleSave}
                  style={{
                    padding: "12px 40px",
                    fontSize: 20,
                    background: "#1976d2",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontWeight: 600,
                    letterSpacing: 1,
                    boxShadow: "0 2px 12px rgba(25,118,210,0.12)",
                    marginTop: 8,
                    transition: "all 0.2s",
                    display: "inline-block",
                  }}
                >
                  儲存
                </button>
                  <button
                    onClick={handleClear}
                    style={{
                      padding: "12px 40px",
                      fontSize: 20,
                      background: "#e53935", // 紅色
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontWeight: 600,
                      letterSpacing: 1,
                      boxShadow: "0 2px 12px rgba(229,57,53,0.12)",
                      marginTop: 8,
                      marginLeft: 16,
                      transition: "all 0.2s",
                      display: "inline-block",
                    }}
                  >
                    清除
                </button>
               </div>
            </div>
            <textarea
              style={{
                width: "100%",
                minHeight: 320,
                fontSize: 20,
                padding: 20,
                borderRadius: 12,
                border: "1.5px solid #b0bec5",
                background: "#fff",
                resize: "vertical",
                marginBottom: 24,
                boxSizing: "border-box",
                boxShadow: "0 2px 8px rgba(25,118,210,0.08)",
                outline: "2px solid #1976d2",
                transition: "all 0.2s",
              }}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="請貼上內容..."
            />
          </div>
        )}
        {/* 過濾排序(選填)頁簽  */}
        {tab === 1 && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 24, display: "flex", justifyContent: "center" }}>
            <button
              onClick={() => {
                // 🟩 儲存使用者輸入的排序條件到 localStorage
                // 🔸 Key 名稱：'scheduleSortList'
                // ⚠️ 注意：此 key 與「編輯內容」頁籤的 'mySavedText' 是不同的，不會互相覆蓋。
                // 🔸 儲存格式：多行文字（用換行符 \n 分隔），包含空行
                localStorage.setItem("scheduleSortList", filterText);
                // ✅ 提示使用者已儲存成功
                alert("排序條件已儲存！");
              }}
              style={{
                padding: "12px 40px",
                fontSize: 20,
                background: "#1976d2",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 600,
                letterSpacing: 1,
                boxShadow: "0 2px 12px rgba(25,118,210,0.12)",
                marginTop: 8,
                transition: "all 0.2s",
                display: "inline-block",
              }}
            >
              儲存排序
            </button> 
            <button
              onClick={handleClearSort}
              style={{
                padding: "12px 40px",
                fontSize: 20,
                background: "#e53935", // 紅色
                color: "#fff",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 600,
                letterSpacing: 1,
                boxShadow: "0 2px 12px rgba(25, 118, 210, 0.12)",
                marginTop: 8,
                transition: "all 0.2s",
                display: "inline-block",
                marginLeft: 12, 
              }}
            >
              清除排序
            </button> 
            </div>
            <div>
              <textarea
                placeholder="請貼上依序排列的姓名清單（可有空行代表分區）"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                style={{
                width: "100%",
                minHeight: 320,
                fontSize: 20,
                padding: 20,
                borderRadius: 12,
                border: "1.5px solid #b0bec5",
                background: "#fff",
                resize: "vertical",
                marginBottom: 24,
                boxSizing: "border-box",
                boxShadow: "0 2px 8px rgba(25,118,210,0.08)" ,
                outline: "2px solid #1976d2" ,
                transition: "all 0.2s",
                }}
              />
            </div>
          </div>
        )}
         {/* 匯出結果頁籤 */}
        {tab === 2 && (
          <div
            style={{
              background: "#f5f7fa",
              padding: 24,
              borderRadius: 12,
              fontSize: 20,
              border: "1.5px solid #e3e8ee",
              boxShadow: "0 2px 8px rgba(60,60,120,0.06)",
              minHeight: 300,
            }}
          >
            <h3 style={{ color: "#1976d2", marginTop: 0 }}>以下人名未在表格中找到：</h3>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                lineHeight: 1.8,
                color: missingNames[0]?.includes("✅") ? "green" : "black",
                fontWeight: missingNames[0]?.includes("✅") ? 600 : 400,
              }}
            >
              {missingNames.join("\n")}
            </pre>
          </div>
        )}
        {/* 使用說明頁簽 */}
        {tab === 3 && (
          <div>
            <div
              style={{
                minHeight: 380,
                background: "#f5f7fa",
                padding: 24,
                border: "1.5px solid #e3e8ee",
                borderRadius: 12,
                fontSize: 20,
                color: "#222",
                boxShadow: "0 2px 8px rgba(60,60,120,0.06)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                transition: "all 0.2s",
              }}
            >
              <pre style={{ margin: 0, background: "none", fontFamily: "inherit" }}>
                使用步驟：{'\n'}
                1.護理班表查詢功能選好月份後進行查詢，查詢結果顯現後，按 Ctrl+U，會開啓原始 Html 視窗。{'\n'}
                2.再按鍵盤 Ctrl+A 全選後，按 Ctrl+C 複製。{'\n'}
                3.在本程式（護理班表匯出工具）的「編輯内容」頁簽按Ctrl+V貼上內容，接著按儲存。{'\n'}
                4.切換到「過濾排序(選填)」頁籤，可選擇性貼上排序清單，然後按儲存排序。{'\n'}
                5.點擊頁籤「匯出 Excel」即可下載。{'\n'}
                6.Excel檔案會根據「過濾排序(選填)」頁籤的排序清單來排列人員，未列入清單者不會加入本次匯出。{'\n'}
                7.若排序清單有空行或英數字，則會在該列留白，不補人名。{'\n'}
                8.開啓匯出的 Excel，如要取消開啓的附註，「校閱-註解-顯示所有註解」這裡取消。{'\n'}
                {'\n'}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
