# Agent 行为规则

## 必须遵守

1. **每次会话开始必须先通读 `.claude/system.md`、`.claude/policy.md`、`.claude/rule.md`。**
2. **有任何不确定，必须先从源码、配置、测试、部署脚本和已有文档中寻找依据。**
3. **找不到依据或存在冲突时，必须向用户询问，禁止模糊处理、臆测或把猜测当事实。**
4. **获得需求后必须先制定计划（plan），经用户明确同意后才执行计划。**
5. **禁止重复造轮子；已有公共能力、工具、约定或模块可复用时必须优先复用。**
6. **修改前先查已有实现，修改后说明验证结果或未验证原因。**
7. **生成代码前必须先分析影响范围、给出模块拆分方案、判断是否需要新增文件，并避免造成架构膨胀。**

## 代码修改规则

### 修改前

- 阅读目标文件及其依赖的相关代码
- 确认修改不会破坏现有的 IPC 接口和状态管理
- 检查是否有已有的工具函数、组件或 store action 可以复用
- 分析影响范围，判断是否需要新增文件或拆分模块

### 修改时

**前端：**
- 遵循 React 19 + TypeScript + Mantine UI 规范
- 使用 Mantine 组件（Flex/Box/Stack/Text/Button/TextInput/Select 等），不写自定义 CSS
- 使用 Zustand store（v5）管理状态，不使用 React Context
- 使用 lucide-react 图标
- 新页面创建独立的 store 和页面组件，并在 App.tsx 中注册
- invoke 必须统一封装，页面不得直接调用后端 command
- UI 与状态逻辑分离，hooks/composables 独立

**后端：**
- 遵循 Rust + Tauri 命令规范
- command 仅做入口，business logic 放 utils
- 所有 IPC 数据结构 derive Serialize + Deserialize + `#[serde(rename_all = "camelCase")]`
- CPU 密集操作使用 `tokio::task::spawn_blocking`
- 文件操作错误必须处理，不使用 `let _ =` 静默忽略
- 视频帧/视频工具相关代码使用 `#[cfg(feature = "video-frame")]` 条件编译
- 避免 pub 泛滥，避免 Arc<Mutex> 扩散
- 单文件 <= 500 行，单函数 <= 50 行，超过 300 行优先拆分

### 修改后

- 运行 `cd frontend && npm run build` 验证前端编译通过
- 运行 `cargo check --manifest-path src-tauri/Cargo.toml` 验证 Rust 编译通过
- 运行 `cargo test --manifest-path src-tauri/Cargo.toml` 验证测试通过
- 说明修改内容和验证结果
- 如果无法运行验证（如非 Windows 环境），明确说明未验证

## 工具使用规则

- 优先使用 Read/Edit/Write/Glob/Grep 等专用工具
- 仅在 shell 命令不可替代时使用 Bash（如 cargo/npm 命令、git 操作）
- 并行执行无依赖的工具调用以提高效率

## 沟通规则

- 使用中文回复（与项目 UI 语言一致）
- 回复简洁，不解释显而易见的内容
- 引用代码时标注文件路径和行号（如 `frontend/src/pages/rename/Toolbar.tsx:15`）
- 不在回复末尾添加工作总结（用户能看到 diff）

## 不确定性处理

遇到以下情况时必须向用户确认：
- 源码中存在矛盾的实现
- 需要选择架构方向（如新功能放在哪个模块）
- 修改可能影响现有行为但无法通过编译验证
- 用户需求不明确或有多种理解方式

标记方式：
- `Source-backed`：有源码依据
- `Needs confirmation`：需要用户确认
- `Known risk`：已知风险
- `Not found in source`：源码中未找到
