# 使用者操作說明-護理班表匯出工具

使用步驟：

1.護理班表查詢功能選好月份後進行查詢，查詢結果顯現後，按 Ctrl+U，會開啓原始 Html 視窗。

2.再按鍵盤 Ctrl+A 全選後，按 Ctrl+C 複製。

3.在本程式（護理班表匯出工具）的「編輯内容」頁簽裡按一下編輯，滑鼠點在文字方塊上，按 Ctrl+V 貼上，接著按儲存。

4.再按 "匯出 Excel" 即可。

5.開啓匯出的 Excel，如果要取消開啓的附註，「校閲-附註-顯示所有附註」這裏要取消。

# 工程師前端：React / Vite / TypeScript - 建立與啟動
```js
# 建立新專案，這裏應該改成colne這個專案 vghtpe-schedule-exporter
npm create vite@latest web -- --template react-ts 
cd web # 依據資料夾，這裏改vghtpe-schedule-exporter
npm install # 安裝node_modules
npm run dev # 預設 http://localhost:5173
```

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
