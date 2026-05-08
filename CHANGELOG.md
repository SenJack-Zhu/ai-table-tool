# Bug 修复记录

本文档记录项目迭代过程中的 bug 分析与解决方案。

---

## v1.0.1

**发布日期**: 2026-05-08

**Tag**: `v1.0.1`

### Bug #1: 扩展名称不显示

**现象**
- 扩展安装后，在 SillyTavern 扩展列表中只显示版本号 `(main-xxxxxxx)`
- 扩展名称 "AI数据库表格处理工具" 未正确显示

**原因分析**
- `manifest.json` 缺少 SillyTavern 规范的 `display_name` 字段
- SillyTavern 需要 `display_name` 字段来显示扩展名称

**Debug 方案**
1. 参考 SillyTavern 官方文档 `https://docs.sillytavern.app/for-contributors/writing-extensions/`
2. 参考项目 `参考项目目录-shujuku/manifest.json` 发现使用 `display_name` 字段
3. 在 `manifest.json` 中添加 `"display_name": "AI数据库表格处理工具"` 字段

**修改文件**
- `manifest.json` - 添加 `display_name` 字段
- `package.json` - 添加 `clean` 脚本确保构建前清理旧产物

**状态**: ✅ 已修复，已推送

---

## v1.0.0

**发布日期**: 2026-05-08

**Tag**: `v1.0.0`

### 初始版本

**内容**
- 完成 SillyTavern 扩展框架搭建
- 实现 `index.ts` 入口文件，符合 SillyTavern API 规范
- 实现 `ChatPanel` UI 组件
- 实现 AI 服务层 (`ai-service.ts`)
- 实现编译器 (`compiler.ts`)

**状态**: ✅ 已推送

---

## 版本号规范

遵循语义化版本 (Semantic Versioning):
- **Major.Minor.Patch** (如 `1.0.1`)
- `Major`: 主版本号，不兼容的重大变更
- `Minor`: 次版本号，向后兼容的功能新增
- `Patch`: 修订号，向后兼容的 bug 修复

## 迭代流程

1. 在本地开发分支完成功能开发和 bug 修复
2. 构建: `npm run build`
3. 提交: `git add -A && git commit -m "描述"`
4. 打 tag: `git tag v{x.y.z}`
5. 推送: `git push origin main --tags`
