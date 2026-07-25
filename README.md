# code2img

用 **Tauri + React + TypeScript** 开发的桌面应用：把代码导出成带语法高亮主题的 PNG 图片。

## 功能

- **多节点画布**：多个代码卡片自由排布
- **弧线连线**：从节点四边圆点拖到另一节点，三次贝塞尔弧线关联
- 连线可选颜色 / 标签，支持选中删除
- 粘贴 / 编辑每个节点的代码
- **Tab** 增加缩进，**Shift+Tab** 减少缩进（支持多行选区）
- 20+ 代码主题、多语言高亮
- 可调内边距、圆角、背景色、行号、窗口装饰
- **导出节点** 或 **导出整图**（含弧线，2x PNG）

## 开发

```bash
cd X:\1_2026_project\code2img
npm install
npm run tauri dev
```

仅前端预览（浏览器）：

```bash
npm run dev
```

打包安装包：

```bash
npm run tauri build
```

产物位置：

- 可执行文件：`src-tauri/target/release/code2img.exe`
- 安装包：`src-tauri/target/release/bundle/nsis/code2img_0.1.0_x64-setup.exe`

### 使用提示

1. 左侧粘贴或编写代码
2. **Tab** 增加缩进，**Shift+Tab** 减少缩进（支持多行选中）
3. 选择语言与主题，调整内边距 / 圆角 / 背景 / 行号 / 窗口样式
4. 点击 **导出 PNG**（2x 清晰度）

## 技术栈

| 层 | 技术 |
|---|---|
| 桌面壳 | Tauri 2 |
| UI | React 19 + Vite |
| 高亮 | Shiki |
| 截图 | modern-screenshot |
