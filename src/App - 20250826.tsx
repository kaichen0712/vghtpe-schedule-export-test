import { useState, useEffect } from "react";
import * as XLSX from "xlsx";

export default function App() {
  // 新增：頁簽狀態與文字內容
  const [tab, setTab] = useState(0); // 0: 輸入, 1: 顯示
  const [inputText, setInputText] = useState("");
  const [savedText, setSavedText] = useState("");
  const [isEditing, setIsEditing] = useState(false); // 新增：編輯狀態

  // 讀取 localStorage
  useEffect(() => {
    const saved = localStorage.getItem("mySavedText");
    if (saved !== null) {
      setSavedText(saved);
      setInputText(saved);
    }
  }, []);

  // 儲存到 localStorage
  const handleSave = () => {
    setSavedText(inputText);
    setIsEditing(false);
    localStorage.setItem("mySavedText", inputText);
  };

  // 解析 HTML table 並轉成 xlsx
  const handleExportHtmlTableToExcel = () => {
    if (!savedText) return;

    // 1. 解析 HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(savedText, "text/html");
    const table = doc.querySelector("table");
    if (!table) {
      alert("找不到 <table>，請確認內容有貼上 HTML 表格！");
      return;
    }

    // 2. 解析表格內容
    const rows = [];
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

        // 這裡做替換
        if (text === "例假" || text === "休假") {
          text = "1";
        }

        // 收集 <img title="...">
        const imgTitles = Array.from(cell.querySelectorAll("img[title]")).map(img =>
          img.getAttribute("title")?.trim() || ""
        ).filter(Boolean);

        row.push({ text, imgTitles });
      }
      rows.push(row);
    }

    // 3. 轉成 xlsx
    const ws_data = rows.map((row, idx) => {
      if (idx === 1) {
        return ["", ...row.map(cell => cell.text)];
      }
      return row.map(cell => cell.text);
    });
    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    // 4. 加入註解
    rows.forEach((row, r) => {
      row.forEach((cell, c) => {
        const colIdx = (r === 1) ? c + 1 : c;
        if (cell.imgTitles && cell.imgTitles.length > 0) {
          const cellRef = XLSX.utils.encode_cell({ r, c: colIdx });
          if (!ws[cellRef]) ws[cellRef] = { t: 's', v: cell.text };
          ws[cellRef].c = [{
            t: cell.imgTitles.join('\n'),
            a: "HTML",
            hidden: true
          }];
        }
      });
    });

    // 5. 設定第一欄寬
    ws["!cols"] = [{ wch: 16 }];

    // 6. 匯出
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "內容");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "排版轉換.xlsx"; // 這裡改檔名
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
            textAlign: "center"
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
            justifyContent: "center"
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
              transition: "all 0.2s"
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
              transition: "all 0.2s"
            }}
            onClick={() => setTab(1)}
          >
            使用說明
          </button>
        </div>
        {/* 編輯內容頁簽 */}
        {tab === 0 && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 24, display: "flex", justifyContent: "center" }}>
              {!isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    style={{
                      padding: "12px 40px",
                      fontSize: 20,
                      background: "#b0bec5",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontWeight: 600,
                      letterSpacing: 1,
                      boxShadow: "0 2px 8px rgba(60,60,120,0.08)",
                      marginTop: 8,
                      transition: "all 0.2s",
                      display: "inline-block"
                    }}
                  >
                    編輯
                  </button>
                  <button
                    onClick={handleExportHtmlTableToExcel}
                    style={{
                      padding: "12px 40px",
                      fontSize: 20,
                      background: "#43a047",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontWeight: 600,
                      letterSpacing: 1,
                      boxShadow: "0 2px 12px rgba(67,160,71,0.12)",
                      marginTop: 8,
                      marginLeft: 16,
                      transition: "all 0.2s",
                      display: "inline-block"
                    }}
                    disabled={!savedText}
                  >
                    匯出 Excel
                  </button>
                </>
              ) : (
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
                    display: "inline-block"
                  }}
                >
                  儲存
                </button>
              )}
            </div>
            <textarea
              style={{
                width: "100%",
                minHeight: 320,
                fontSize: 20,
                padding: 20,
                borderRadius: 12,
                border: "1.5px solid #b0bec5",
                background: isEditing ? "#fff" : "#f5f7fa",
                resize: "vertical",
                marginBottom: 24,
                boxSizing: "border-box",
                boxShadow: isEditing ? "0 2px 8px rgba(25,118,210,0.08)" : "none",
                outline: isEditing ? "2px solid #1976d2" : "none",
                transition: "all 0.2s"
              }}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="請貼上內容..."
              disabled={!isEditing}
            />
          </div>
        )}
        {/* 使用說明頁簽 */}
        {tab === 1 && (
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
                transition: "all 0.2s"
              }}
            >
              <pre style={{ margin: 0, background: "none", fontFamily: "inherit" }}>
                使用步驟：<br></br>
                1.護理班表查詢功能選好月份後進行查詢，查詢結果顯現後，按 Ctrl+U，會開啓原始 Html 視窗。<br></br>
                2.再按鍵盤 Ctrl+A 全選後，按 Ctrl+C 複製。<br></br>
                3.在本程式（護理班表匯出工具）的「編輯内容」頁簽裡按一下編輯，滑鼠點在文字方塊上，<br></br>
                &nbsp;&nbsp;&nbsp;按 Ctrl+V 貼上，接著按儲存。<br></br>
                4.再按 "匯出 Excel" 即可。<br></br>
                5.開啓匯出的 Excel，如果要取消開啓的附註，「校閲-附註-顯示所有附註」這裏要取消。<br></br>
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}