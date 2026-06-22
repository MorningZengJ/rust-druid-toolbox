# 开发规范

## 文件/函数限制

- 单文件尽量 <= 500 行，超过 300 行时优先评估能否拆分
- 单函数尽量 <= 50 行
- 避免超长 impl 块

## 代码规范

### 前端（React 19 + TypeScript）

- **组件**: 函数组件 + hooks，文件名 PascalCase（RenamePage.tsx）
- **状态管理**: Zustand store（v5），每个页面独立 store，不使用 React Context
- **样式**: 优先使用 Mantine 组件（Flex/Box/Stack/Text/Button 等）和 style props
- **CSS 变量**: 页面/组件内使用 `var(--surface-*)`/`var(--text-*)`/`var(--border-*)`/`var(--accent-*)`/`var(--shadow-*)`/`var(--status-*)` 设计令牌，避免硬编码颜色值
- **`globals.css`**：仅包含设计令牌变量定义、字体引入、全局伪元素样式和关键帧动画；页面组件不得添加新的全局 CSS 文件
- **字体**: 正文 `var(--font-body)`（DM Sans）、标题/展示 `var(--font-display)`（JetBrains Mono）、等宽 `var(--font-mono)`（JetBrains Mono）
- **类型**: 所有 IPC 数据结构必须在 `types/index.ts` 中定义，匹配 Rust serde 结构
- **路径别名**: `@/` 指向 `frontend/src/`
- **图标**: 使用 lucide-react
- **页面切换**: App.tsx 通过 display 属性切换页面（非路由），新增页面需在 App.tsx 的 Page 联合类型中注册，并在 navItems 和 content area 添加对应项
- **API 调用**: invoke 应统一封装在 lib/ 或 store 中，页面组件不直接调用 invoke
- **UI 与状态逻辑分离**: hooks/composables 独立
- **表格**: 使用 @tanstack/react-table

### 国际化（i18n）

- **框架**: 使用 i18next + react-i18next + `useTranslation()`
- **namespace**: 新增功能按所属页面使用对应 namespace（common/rename/asciiArt/videoTool/settings/errors），避免将所有文本放在 common 或其他 namespace
- **新增文本**: 在对应 namespace 的 JSON 中添加键值对，必须同步更新所有 18 种语言的 JSON 文件（至少添加中文和英文）
- **动态文本**: 使用 `t("key", { variable })` 透传插值，不在组件内拼字符串
- **RTL 感知**: 涉及方向性的布局（padding-left/right、margin-start/end）需兼容 RTL
- **locale 文件位置**: `frontend/src/i18n/locales/{locale}/{namespace}.json`
- **langaugeNames**: 新增语言必须在 `i18n/types.ts` 的 `languageNames` 中添加显示名

### 设计令牌

- 组件内使用 CSS 变量获取颜色/阴影/间距，不硬编码颜色值
- 变量分类：
  - `--surface-*`：表面层（base/raised/overlay/panel）
  - `--text-*`：文字色（primary/secondary/muted/disabled）
  - `--border-*`：边框（subtle/default/strong）
  - `--accent-*`：主色调（primary/light/dark/glow）
  - `--shadow-*`：阴影（sm/md/lg）
  - `--status-*`：状态色（success/error/warning + bg/border）
  - `--font-*`：字体族（body/display/mono）
- 新颜色变量应在 `globals.css` 的 `:root` 和 `[data-mantine-color-scheme="dark"]` 中成对定义，并在 `ThemeProvider` 的 `CssVariableSync` 中同步运行时更新

### 后端（Rust + Tauri）

- **模块组织**: commands/（Tauri 命令入口）、model/（数据模型）、utils/（业务逻辑）
- **职责分离**: command 仅做入口，business logic 放 utils
- **命名**: 结构体 PascalCase，函数 snake_case，文件 snake_case
- **IPC 模型**: 所有跨 IPC 结构必须 derive Serialize + Deserialize + `#[serde(rename_all = "camelCase")]`
- **异步命令**: CPU 密集操作使用 `tokio::task::spawn_blocking`
- **错误处理**: Tauri 命令返回 `Result<T, String>`
- **条件编译**: 视频功能通过 `#[cfg(feature = "video-frame")]` 控制（默认启用）
- **避免 pub 泛滥**: 仅暴露必要接口
- **避免 Arc<Mutex> 扩散**: 优先消息传递或 Tauri 状态管理
- **避免巨型 mod.rs**

### Mantine UI 组件

- 使用 `@mantine/core` 提供的组件（Button, TextInput, Select, Checkbox, Slider, Badge, Modal, Tabs, Tooltip, Menu, ScrollArea 等）
- 布局使用 Flex/Box/Stack/Group/Text 等 Mantine 组件
- 主题通过 `MantineProvider` 和 `useMantineTheme()` 管理
- 暗色模式通过 `useMantineColorScheme()` 管理
- 保留的外部库（Mantine 无替代）：
  - `react-resizable-panels` — 可调整面板
  - `react-virtuoso` — 虚拟滚动
  - `@tanstack/react-table` — 高级表格
- 新增 UI 功能时，优先检查 Mantine 是否提供内置组件，再考虑外部库

## 文件操作安全

- 重命名操作前必须有预览和确认弹窗
- `std::fs::rename()` 错误收集到 RenameResult.errors，不静默忽略
- 文件列表通过 `fs::read_dir` 获取，错误返回空列表

## 测试策略

- **Rust**: `cargo test`，保留 rename_logic.rs 的 8 个单元测试，新增业务逻辑应补充测试
- **前端**: 暂无测试框架，手动验证关键交互流程
- **端到端**: `cargo tauri dev` 手动验证所有功能

## 禁止事项

- 禁止在前端添加新的全局 CSS 文件（`globals.css` 是唯一全局样式文件）
- 禁止引入 Tailwind CSS
- 禁止在 Rust Tauri 命令中使用 `unwrap()`
- 禁止引入与现有功能重复的依赖
- 禁止静默忽略文件系统错误（如 `let _ = fs::rename(...)`）
- 禁止新增路由库（当前使用 display 切换）
- 禁止覆盖已有语言 locale 时仅更新中文
- 禁止在其他文件创建新的 CSS 变量 — 定义在 `globals.css`，运行时同步在 `ThemeProvider`

## 技术方案决策流程

新增功能时，按以下顺序评估：

1. **当前项目是否已有现成能力** — 搜索现有模块、工具函数、组件、store action
2. **是否已有可复用公共模块** — 检查 components/ui/、utils/、hooks/、lib/
3. **是否存在成熟稳定的第三方生态方案** — 社区主流、长期维护、生态稳定的库
4. **是否可以通过轻量封装实现需求** — 基于现有依赖做简单扩展
5. **最后才允许从零实现**

禁止默认直接手写完整功能。优先保证可维护性、一致性、可扩展性、长期演进能力和 AI 后续协作稳定性。

## 生态方案优先级

通用基础能力优先使用成熟生态方案：

- 虚拟渲染 → react-virtuoso
- 表格管理 → @tanstack/react-table
- 状态管理 → Zustand
- UI 组件库 → Mantine UI
- 图标库 → lucide-react
- 面板布局 → react-resizable-panels
- 国际化 → i18next + react-i18next

## 依赖治理规则

引入新依赖前必须评估：

1. **是否已有同类依赖** — 避免功能重叠
2. **是否能复用现有技术栈** — 优先与 Mantine/Zustand/Tauri/i18next 生态兼容
3. **包体积影响** — 评估构建产物增量
4. **社区活跃度** — GitHub stars、提交频率、issue 响应
5. **维护状态** — 活跃维护者、发布频率
6. **生态兼容性** — React 19 / Vite / TypeScript 兼容
7. **长期维护成本** — breaking change 风险
8. **安全风险** — 已知漏洞、依赖链
9. **是否存在更轻量方案**

避免无节制引入依赖。避免为省依赖而维护高复杂度自定义基础设施。

## 生成代码前的检查清单

1. 分析影响范围（IPC 接口、store、组件树）
2. 给出模块拆分方案
3. 判断是否需要新增文件
4. 检查所有 18 种语言的 locale 是否需要同步更新
5. 避免造成架构膨胀
6. 不要为了速度牺牲架构质量
