# 开发规范

## 文件/函数限制

- 单文件尽量 <= 500 行，超过 300 行时优先考虑拆分
- 单函数尽量 <= 50 行
- 避免超长 impl

## 代码规范

### 前端（React 19 + TypeScript）

- **组件**: 函数组件 + hooks，文件名 PascalCase（RenamePage.tsx）
- **状态管理**: Zustand store（v5），每个页面独立 store，不使用 React Context
- **样式**: Mantine UI 组件 + 内联样式，优先使用 Mantine 的 Flex/Box/Stack/Text 等布局组件和 style props，不写自定义 CSS
- **类型**: 所有 IPC 数据结构必须在 `types/index.ts` 中定义，匹配 Rust serde 结构
- **路径别名**: `@/` 指向 `frontend/src/`
- **图标**: 使用 lucide-react，不使用自定义 SVG
- **页面切换**: App.tsx 通过 display 属性切换页面（非路由），新增页面需在 App.tsx 中注册
- **API 调用**: invoke 必须统一封装，页面不得直接调用后端 command
- **UI 与状态逻辑分离**: hooks/composables 独立
- **表格**: 使用 @tanstack/react-table 实现复杂表格功能（排序、筛选、列配置等）

### 后端（Rust + Tauri）

- **模块组织**: commands/（Tauri 命令入口）、model/（数据模型）、utils/（业务逻辑）
- **职责分离**: command 仅做入口，business logic 放 utils，避免 command 层包含复杂逻辑
- **命名约定**: 结构体 PascalCase，函数 snake_case，文件 snake_case
- **IPC 模型**: 所有跨 IPC 结构必须 derive Serialize + Deserialize + `#[serde(rename_all = "camelCase")]`
- **异步命令**: CPU 密集操作使用 `tokio::task::spawn_blocking`
- **错误处理**: Tauri 命令返回 `Result<T, String>` 或直接返回值
- **条件编译**: 视频帧/视频工具功能通过 `#[cfg(feature = "video-frame")]` 控制
- **避免 pub 泛滥**: 仅暴露必要接口
- **避免 Arc<Mutex> 扩散**: 优先使用消息传递或 Tauri 状态管理
- **避免巨型 mod.rs**: 每个模块保持合理大小

### Mantine UI 组件

- 使用 `@mantine/core` 提供的组件（Button, TextInput, Select, Checkbox, Slider, Badge, Modal, Tabs, Tooltip, Menu, ScrollArea 等）
- 布局使用 Flex/Box/Stack/Group/Text 等 Mantine 组件，不使用 Tailwind 工具类
- 主题通过 `MantineProvider` 和 `useMantineTheme()` 管理
- 暗色模式通过 `useMantineColorScheme()` 管理
- 保留 `react-resizable-panels`（Mantine 无可调整面板组件）
- 保留 `react-virtuoso`（Mantine 无虚拟滚动组件）
- 保留 `@tanstack/react-table`（Mantine 无高级表格组件）

## 文件操作安全

- 重命名操作前必须有预览和确认弹窗
- `std::fs::rename()` 错误收集到 RenameResult.errors，不静默忽略
- 文件列表通过 `fs::read_dir` 获取，错误返回空列表

## 测试策略

- **Rust**: `cargo test`，保留 rename_logic.rs 的 8 个单元测试
- **前端**: 暂无测试框架，手动验证关键交互流程
- **端到端**: `npm run tauri dev` 手动验证所有功能

## 禁止事项

- 禁止在前端写自定义 CSS 文件（使用 Mantine 组件和 style props）
- 禁止引入 Tailwind CSS 工具类（项目已完全迁移到 Mantine）
- 禁止在 Rust 中使用 `unwrap()`（Tauri 命令中）
- 禁止引入与现有功能重复的依赖
- 禁止静默忽略文件系统错误（如 `let _ = fs::rename(...)`）
- 禁止新增路由库（当前使用 display 切换，无路由需求）

## 技术方案决策流程

新增功能时，必须按以下顺序评估：

1. **当前项目是否已有现成能力** — 搜索现有模块、工具函数、组件、store action
2. **是否已有可复用公共模块** — 检查 components/common/、utils/、hooks/、lib/ 等
3. **是否存在成熟稳定的第三方生态方案** — 优先选择社区主流、长期维护、生态稳定的库
4. **是否可以通过轻量封装实现需求** — 基于现有依赖做简单扩展
5. **最后才允许从零实现** — 仅当前四步都无法满足时

禁止默认直接手写完整功能。优先保证可维护性、一致性、可扩展性、长期演进能力和 AI 后续协作稳定性，而不是短期"能运行"。

## 生态方案优先级

对于以下通用基础能力，**优先使用成熟生态方案**，避免长期维护自定义实现：

- 虚拟渲染 → react-virtuoso
- 表格管理 → @tanstack/react-table
- 状态管理 → Zustand
- UI 组件库 → Mantine UI
- 图标库 → lucide-react
- 面板布局 → react-resizable-panels

如需引入新的通用能力（如拖拽、动画、命令系统、表单校验、序列化等），必须先评估成熟生态方案，而非手写实现。

## 依赖治理规则

引入新依赖前必须评估：

1. **是否已有同类依赖** — 避免功能重叠
2. **是否能复用现有技术栈** — 优先与 Mantine/Zustand/Tauri 生态兼容的方案
3. **包体积影响** — 评估是否明显增加构建产物大小
4. **社区活跃度** — GitHub stars、最近提交频率、issue 响应速度
5. **维护状态** — 是否有活跃维护者、是否定期发布新版本
6. **生态兼容性** — 与 React 19、Vite、TypeScript 的兼容性
7. **长期维护成本** — 是否有 breaking change 风险
8. **安全风险** — 是否有已知漏洞、依赖链是否安全
9. **是否存在更轻量方案** — 能满足需求时优先选择更轻量方案

避免无节制引入依赖。

## 生成代码前的检查清单

1. 先分析影响范围
2. 给出模块拆分方案
3. 判断是否需要新增文件
4. 避免造成架构膨胀
5. 不要为了速度牺牲架构质量
