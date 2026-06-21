# i18n 开发指南

## 🚀 快速开始

### 在组件中使用i18n

```typescript
import { useTranslation } from "react-i18next";

function MyComponent() {
  const { t } = useTranslation("命名空间");

  return (
    <div>
      <h1>{t("title")}</h1>
      <p>{t("description", { count: 5 })}</p>
    </div>
  );
}
```

### 在Store中使用i18n

```typescript
import i18n from "@/i18n";

// 在函数中使用
const errorMessage = i18n.t("errors:loadFilesFailed", { error: String(e) });

// 获取固定翻译函数
const t = i18n.getFixedT(null, "videoTool");
const label = t("codec.libx264.label");
```

---

## 📁 命名空间

| 命名空间 | 用途 | 示例 |
|---------|------|------|
| `common` | 通用文本 | 按钮、状态、标签 |
| `rename` | 重命名工具 | 规则、预览、过滤 |
| `asciiArt` | 字符画工具 | 渲染、导出、预览 |
| `videoTool` | 视频工具 | 合并、转换、抽帧 |
| `settings` | 设置页面 | 主题、语言、更新 |
| `errors` | 错误消息 | 所有错误提示 |

---

## 📝 添加新翻译

### 步骤 1: 添加到中文翻译文件

```json
// src/i18n/locales/zh-CN/videoTool.json
{
  "mySection": {
    "title": "我的标题",
    "description": "描述文本 {{param}}"
  }
}
```

### 步骤 2: 添加到英文翻译文件

```json
// src/i18n/locales/en-US/videoTool.json
{
  "mySection": {
    "title": "My Title",
    "description": "Description text {{param}}"
  }
}
```

### 步骤 3: 批量更新其他语言

```bash
node scripts/update-all-locales.cjs
```

### 步骤 4: 在代码中使用

```typescript
const { t } = useTranslation("videoTool");
return <h1>{t("mySection.title")}</h1>;
```

---

## 🎯 最佳实践

### ✅ Do

```typescript
// 1. 使用命名空间
const { t } = useTranslation("videoTool");
t("codec.libx264.label")

// 2. 使用插值参数
t("errors.mergeFailed", { error: String(e) })

// 3. 在Store中使用i18n
import i18n from "@/i18n";
i18n.t("errors:loadFilesFailed", { error: String(e) })

// 4. 使用getFixedT获取固定翻译函数
const t = i18n.getFixedT(null, "videoTool");
```

### ❌ Don't

```typescript
// 1. 禁止硬编码字符串
<Text>合并视频</Text>  // ❌
<Text>{t("merge.title")}</Text>  // ✅

// 2. 禁止在组件外直接使用t()
// 需要在组件内使用useTranslation hook

// 3. 禁止遗漏插值参数
t("errors.mergeFailed")  // ❌ 缺少error参数
t("errors.mergeFailed", { error: String(e) })  // ✅
```

---

## 🔧 常用命令

### 检查i18n完整性

```bash
# 检查所有语言的翻译key是否完整
node scripts/check-i18n.cjs

# 检查代码中的i18n使用情况
node scripts/check-i18n-usage.cjs

# 批量更新所有语言文件
node scripts/update-all-locales.cjs
```

### 添加新语言

1. 创建新的语言目录：
```bash
mkdir src/i18n/locales/xx-XX
```

2. 复制基准语言文件：
```bash
cp src/i18n/locales/zh-CN/*.json src/i18n/locales/xx-XX/
```

3. 翻译所有JSON文件

4. 创建index.ts：
```typescript
import common from "./common.json";
import rename from "./rename.json";
// ... 其他文件

export default { common, rename, ... };
```

5. 注册新语言：
```typescript
// src/i18n/index.ts
import xxXX from "./locales/xx-XX";

const resources = {
  // ... 其他语言
  'xx-XX': xxXX,
};

// src/i18n/types.ts
export type Language = 
  | 'zh-CN'
  // ... 其他语言
  | 'xx-XX';

export const languageNames: Record<Language, string> = {
  // ... 其他语言
  'xx-XX': '新语言名称',
};
```

---

## 🐛 常见问题

### Q: 翻译key找不到？

A: 检查以下几点：
1. key是否正确拼写
2. 命名空间是否正确
3. 翻译文件中是否存在该key
4. 运行 `node scripts/check-i18n.cjs` 检查

### Q: 动态参数不生效？

A: 确保使用双花括号语法：
```json
{
  "message": "文件 {{name}} 已存在"
}
```
```typescript
t("message", { name: "test.txt" })
```

### Q: 如何在Store中使用i18n？

A: 直接导入i18n实例：
```typescript
import i18n from "@/i18n";

// 使用点号分隔命名空间和key
const message = i18n.t("errors:loadFilesFailed", { error: String(e) });
```

### Q: 如何支持RTL语言？

A: 项目已内置RTL支持：
- 阿拉伯语 (ar-SA) 自动启用RTL
- 使用 `applyDirection(lang)` 切换方向
- 在CSS中使用逻辑属性（如 `margin-inline-start`）

---

## 📚 相关资源

- [i18next文档](https://www.i18next.com/)
- [react-i18next文档](https://react.i18next.com/)
- [i18next插值文档](https://www.i18next.com/translation-function/interpolation)

---

## 🎨 VS Code 插件推荐

安装 **i18n Ally** 插件，获得以下功能：
- 翻译key自动补全
- 内联显示翻译内容
- 快速跳转到翻译文件
- 翻译覆盖率统计

配置 `.vscode/settings.json`：
```json
{
  "i18n-ally.localesPaths": "src/i18n/locales",
  "i18n-ally.keystyle": "nested",
  "i18n-ally.namespace": true,
  "i18n-ally.defaultNamespace": "common"
}
```

---

**最后更新**: 2026-06-21
**维护者**: 开发团队
