# AI数据库表格处理工具

一个强大的AI驱动的数据库表格处理工具，支持自然语言创建、修改和管理表格。

## ✨ 特性

- 📝 **自然语言交互** - 用中文描述您的表格操作需求
- ✨ **智能分析** - AI分析当前表格结构并生成操作方案
- 🛡️ **安全确认** - 高风险操作需要用户确认
- 📊 **实时预览** - 变更预览展示
- 🔄 **多轮对话** - 支持逐步完善需求
- 💾 **历史记录** - 自动保存操作历史

## 📦 安装

### 通过GitHub安装（推荐）

1. 在Tavern的插件目录下克隆此仓库：
```bash
cd plugins
git clone https://github.com/your-username/ai-table-tool.git
```

2. 在Tavern设置中启用"AI数据库表格处理工具"插件

3. 刷新页面，右下角会出现"AI表格工具"按钮

### 手动安装

1. 下载最新版本的 `dist/` 文件夹
2. 将其放置到Tavern的 `plugins/ai-table-tool/` 目录
3. 在Tavern设置中启用插件

## 🚀 使用方法

1. 点击右下角的"AI表格工具"按钮
2. 在输入框中描述您的表格操作需求
3. 点击"发送"按钮，AI会生成操作方案
4. 查看预览后点击"应用到表格"按钮

### 示例需求

```
新增一张角色表，包含姓名、等级、职业列
删除当前表的年龄列
在用户表中新增邮箱字段
重命名"产品经理"列为"职位"
删除第二行数据
```

## 🎮 支持的操作

| 操作 | 说明 |
|------|------|
| `add_sheet` | 新增表 |
| `rename_sheet` | 重命名表 |
| `delete_sheet` | 删除表 |
| `move_sheet` | 移动表位置 |
| `patch_sheet_source_data` | 修改数据源配置 |
| `patch_sheet_update_config` | 修改更新配置 |
| `patch_sheet_export_config` | 修改导出配置 |
| `patch_sheet_content` | 修改表格内容 |
| `patch_sheet_schema` | 修改表结构 |
| `patch_sheet_locks` | 修改锁定状态 |

## 🛠️ 开发

### 环境要求

- Node.js >= 16
- npm >= 8

### 构建步骤

```bash
# 安装依赖
npm install

# 开发模式（热更新）
npm run dev

# 构建生产版本
npm run build
```

### 项目结构

```
ai-table-tool/
├── manifest.json          # 插件配置文件
├── package.json           # 依赖配置
├── rollup.config.js       # 构建配置
├── tsconfig.json          # TypeScript配置
├── src/
│   ├── index.ts           # 插件入口
│   ├── types.ts           # 类型定义
│   ├── utils.ts           # 工具函数
│   ├── service/
│   │   ├── ai-service.ts  # AI服务层
│   │   └── compiler.ts    # 编译器
│   └── ui/
│       └── chat-panel.ts  # 聊天面板组件
└── dist/
    ├── main.js            # 编译后的主文件
    └── style.css          # 样式文件
```

## 📝 更新日志

### v1.0.0 (2026-05-08)

- 🎉 首次发布
- ✅ 支持所有核心表格操作
- ✅ 完整的UI界面
- ✅ AI智能分析功能
- ✅ 安全确认机制

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🙏 致谢

感谢所有贡献者和用户的支持！

## 📮 联系方式

- GitHub Issues: [提交问题](https://github.com/your-username/ai-table-tool/issues)
- 邮箱: your-email@example.com
