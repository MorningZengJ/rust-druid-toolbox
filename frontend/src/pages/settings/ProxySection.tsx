import { useState, useCallback } from "react";
import {
  Stack,
  Group,
  Text,
  Button,
  Select,
  TextInput,
  NumberInput,
  PasswordInput,
  Box,
  Collapse,
  Modal,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  ShieldOff,
  Monitor,
  SlidersHorizontal,
  Network,
  ChevronDown,
  Globe,
  Search,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useProxyStore } from "@/stores/proxyStore";
import type { ProxyConfig } from "@/lib/configValidator";
import type { ProxyTestResult } from "@/lib/tauri/proxyApi";
import ThemeCard from "@/components/theme/ThemeCard";

type ProxyMode = ProxyConfig["mode"];

/** i18next t 函数类型（接受可选插值参数） */
type TFunc = (key: string, options?: Record<string, unknown>) => string;

const inputStyles = {
  input: {
    backgroundColor: "var(--surface-panel)",
    borderColor: "var(--border-default)",
    color: "var(--text-primary)",
  },
};

// ── Helpers ──

function buildManualUrl(config: ProxyConfig): string | null {
  if (config.mode !== "manual" || !config.manual) return null;
  const { protocol, host, port } = config.manual;
  return `${protocol}://${host}:${port}`;
}

/** 根据错误分类返回对应的 i18n 键 */
function getErrorI18nKey(errorKind: string | null): string {
  const map: Record<string, string> = {
    timeout: "proxy.test.errors.timeout",
    dns: "proxy.test.errors.dns",
    connection_refused: "proxy.test.errors.connectionRefused",
    auth_failed: "proxy.test.errors.authFailed",
    tls_error: "proxy.test.errors.tlsError",
    proxy_refused: "proxy.test.errors.proxyRefused",
    http_error: "proxy.test.errors.httpError",
  };
  return map[errorKind ?? ""] ?? "proxy.test.errors.unknown";
}

/** 显示代理测试结果通知 */
function showTestNotification(result: ProxyTestResult, t: TFunc) {
  if (result.success) {
    notifications.show({
      title: t("proxy.test.successTitle"),
      message: t("proxy.test.successMessage", {
        latency: result.latencyMs,
        status: result.statusCode,
      }),
      color: "green",
      icon: <CheckCircle size={16} />,
    });
  } else {
    const errorKey = getErrorI18nKey(result.errorKind);
    notifications.show({
      title: t("proxy.test.failTitle"),
      message: t(errorKey, { error: result.error, status: result.statusCode }),
      color: "red",
      icon: <XCircle size={16} />,
    });
  }
}

// ── Sub-components ──

/** 模式切换按钮组 */
function ModeSelector({
  mode,
  onChange,
  t,
}: {
  mode: ProxyMode;
  onChange: (m: ProxyMode) => void;
  t: TFunc;
}) {
  const modes: { value: ProxyMode; label: string; desc: string; icon: React.ReactNode }[] = [
    { value: "direct", label: t("proxy.modes.direct"), desc: t("proxy.modes.directDesc"), icon: <ShieldOff size={14} /> },
    { value: "system", label: t("proxy.modes.system"), desc: t("proxy.modes.systemDesc"), icon: <Monitor size={14} /> },
    { value: "manual", label: t("proxy.modes.manual"), desc: t("proxy.modes.manualDesc"), icon: <SlidersHorizontal size={14} /> },
  ];

  return (
    <Group gap="xs">
      {modes.map((m) => (
        <Button
          key={m.value}
          variant={mode === m.value ? "light" : "default"}
          size="compact-sm"
          leftSection={m.icon}
          onClick={() => onChange(m.value)}
          radius="md"
          style={{
            transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
            ...(mode === m.value ? { boxShadow: "0 0 0 1px var(--accent-glow)" } : {}),
          }}
        >
          {m.label}
        </Button>
      ))}
    </Group>
  );
}

/** 手动代理配置面板 */
function ManualConfig({
  config,
  onChange,
  t,
}: {
  config: ProxyConfig;
  onChange: (c: ProxyConfig) => void;
  t: TFunc;
}) {
  const [authOpen, setAuthOpen] = useState(false);
  const manual = config.manual;

  const updateManual = useCallback(
    (patch: Partial<NonNullable<ProxyConfig["manual"]>>) => {
      if (!manual) return;
      onChange({ ...config, manual: { ...manual, ...patch } });
    },
    [config, manual, onChange],
  );

  // 初始化为 manual 模式但没有 manual 配置时，提供一个默认值
  if (!manual) {
    return (
      <Text size="xs" c="dimmed" ta="center" py="sm">
        {t("proxy.modes.manualDesc")}
      </Text>
    );
  }

  const proxyUrl = buildManualUrl(config);

  return (
    <Stack gap="sm">
      {/* 连接路径示意图 */}
      <ConnectionDiagram url={proxyUrl} mode="manual" />

      {/* 协议 + 主机 + 端口 */}
      <Group gap="xs" wrap="nowrap" align="start">
        <Select
          label={t("proxy.fields.protocol")}
          value={manual.protocol}
          onChange={(v) => {
            if (v === "http" || v === "socks5") updateManual({ protocol: v });
          }}
          data={[
            { value: "http", label: "HTTP" },
            { value: "socks5", label: "SOCKS5" },
          ]}
          w={120}
          radius="md"
          styles={inputStyles}
        />
        <TextInput
          label={t("proxy.fields.host")}
          placeholder={t("proxy.fields.hostPlaceholder")}
          value={manual.host}
          onChange={(e) => updateManual({ host: e.currentTarget.value })}
          error={
            config.mode === "manual" && manual.host.trim().length === 0
              ? t("proxy.validation.hostRequired")
              : undefined
          }
          style={{ flex: 1 }}
          radius="md"
          styles={inputStyles}
        />
        <NumberInput
          label={t("proxy.fields.port")}
          placeholder={t("proxy.fields.portPlaceholder")}
          value={manual.port}
          onChange={(v) => {
            if (typeof v === "number") updateManual({ port: v });
          }}
          min={1}
          max={65535}
          hideControls
          w={100}
          radius="md"
          styles={inputStyles}
        />
      </Group>

      {/* 身份验证折叠区 */}
      <Box>
        <Button
          variant="subtle"
          size="compact-xs"
          leftSection={
            <ChevronDown
              size={12}
              style={{
                transform: authOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 250ms ease",
              }}
            />
          }
          onClick={() => setAuthOpen(!authOpen)}
          px={0}
          styles={{ label: { color: "var(--text-secondary)" } }}
        >
          {t("proxy.auth.toggle")}
        </Button>
        <Collapse expanded={authOpen}>
          <Group gap="xs" mt="xs">
            <TextInput
              label={t("proxy.auth.username")}
              value={manual.username ?? ""}
              onChange={(e) => {
                const val = e.currentTarget.value;
                updateManual({ username: val.length > 0 ? val : undefined });
              }}
              style={{ flex: 1 }}
              radius="md"
              styles={inputStyles}
            />
            <PasswordInput
              label={t("proxy.auth.password")}
              value={manual.password ?? ""}
              onChange={(e) => {
                const val = e.currentTarget.value;
                updateManual({ password: val.length > 0 ? val : undefined });
              }}
              style={{ flex: 1 }}
              radius="md"
              styles={inputStyles}
            />
          </Group>
        </Collapse>
      </Box>
    </Stack>
  );
}

/** 连接路径示意图（装饰性） */
function ConnectionDiagram({
  url,
  mode,
}: {
  url: string | null;
  mode: ProxyMode;
}) {
  const segments: { label: React.ReactNode; key: string }[] = [];

  if (mode === "direct") {
    segments.push(
      { label: <Globe size={12} style={{ color: "var(--accent-primary)" }} />, key: "internet" },
    );
  } else if (mode === "system") {
    segments.push(
      { label: <Monitor size={12} style={{ color: "var(--text-secondary)" }} />, key: "system" },
      { label: <Globe size={12} style={{ color: "var(--accent-primary)" }} />, key: "internet" },
    );
  } else if (mode === "manual" && url) {
    segments.push(
      {
        label: (
          <Text span size="xs" ff="var(--font-mono)" c="var(--accent-primary)" fw={500}>
            {url}
          </Text>
        ),
        key: "proxy",
      },
      { label: <Globe size={12} style={{ color: "var(--accent-primary)" }} />, key: "internet" },
    );
  }

  return (
    <Group gap={4} wrap="nowrap" align="center" justify="center" py={4}>
      <Text span size="xs" fw={600} ff="var(--font-display)" c="var(--text-primary)">
        MToolbox
      </Text>
      {segments.map((seg, _i) => (
        <Group key={seg.key} gap={4} wrap="nowrap">
          <Box
            style={{
              width: 20,
              height: 1,
              borderTop: "1px dashed var(--border-default)",
              flexShrink: 0,
            }}
          />
          <Box
            style={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              backgroundColor: "var(--text-dimmed)",
              flexShrink: 0,
            }}
          />
          <Box
            style={{
              width: 20,
              height: 1,
              borderTop: "1px dashed var(--border-default)",
              flexShrink: 0,
            }}
          />
          {seg.label}
        </Group>
      ))}
    </Group>
  );
}

/** LED 状态指示灯 */
function StatusLed({ config, t }: { config: ProxyConfig; t: TFunc }) {
  let color = "var(--text-dimmed)";
  let text = "";

  if (config.mode === "manual") {
    const url = buildManualUrl(config);
    if (url) {
      color = "var(--status-success)";
      text = t("proxy.status.manual", { url });
    } else {
      color = "var(--status-warning, #f59e0b)";
      text = t("proxy.status.pending");
    }
  } else if (config.mode === "direct") {
    color = "var(--status-success)";
    text = t("proxy.status.direct");
  } else {
    color = "var(--status-success)";
    text = t("proxy.status.system");
  }

  return (
    <Group gap={6}>
      <Box
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: color,
          boxShadow: `0 0 6px ${color}`,
          flexShrink: 0,
        }}
      />
      <Text size="xs" c="dimmed">
        {text}
      </Text>
    </Group>
  );
}

// ── Main Component ──

export default function ProxySection() {
  const { t } = useTranslation("settings");
  const { config, setConfig, testing, testConnection } = useProxyStore();
  const [showRestartHint, setShowRestartHint] = useState(false);
  const [hintTimer, setHintTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // 测试连接 Modal 状态
  const [testModalOpen, { open: openTestModal, close: closeTestModal }] = useDisclosure(false);
  const [testUrlInput, setTestUrlInput] = useState(config.lastTestUrl ?? "https://www.google.com");

  const handleOpenTestModal = useCallback(() => {
    setTestUrlInput(config.lastTestUrl ?? "https://www.google.com");
    openTestModal();
  }, [config.lastTestUrl, openTestModal]);

  const handleModeChange = useCallback(
    (mode: ProxyMode) => {
      const newConfig: ProxyConfig =
        mode === "manual"
          ? { mode: "manual", manual: { protocol: "socks5", host: "127.0.0.1", port: 1080 } }
          : { mode, manual: null };
      setConfig(newConfig);

      // 显示重启提示（5 秒后自动消失）
      if (hintTimer) clearTimeout(hintTimer);
      setShowRestartHint(true);
      const timer = setTimeout(() => setShowRestartHint(false), 5000);
      setHintTimer(timer);
    },
    [setConfig, hintTimer],
  );

  const handleConfigChange = useCallback(
    (newConfig: ProxyConfig) => {
      setConfig(newConfig);
      // 显示重启提示
      if (hintTimer) clearTimeout(hintTimer);
      setShowRestartHint(true);
      const timer = setTimeout(() => setShowRestartHint(false), 5000);
      setHintTimer(timer);
    },
    [setConfig, hintTimer],
  );

  return (
    <ThemeCard
      icon={<Network size={16} />}
      title={t("proxy.title")}
    >
      <Stack gap="sm">
        {/* 说明文字 */}
        <Text size="xs" c="dimmed">
          {t("proxy.description")}
        </Text>

        {/* 模式选择 */}
        <ModeSelector mode={config.mode} onChange={handleModeChange} t={t} />

        {/* 手动配置面板 */}
        <Collapse expanded={config.mode === "manual"}>
          <Box
            mt="sm"
            p="sm"
            style={{
              borderRadius: 10,
              backgroundColor: "var(--surface-panel)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <ManualConfig config={config} onChange={handleConfigChange} t={t} />
          </Box>
        </Collapse>

        {/* 状态指示灯 */}
        <Group justify="space-between" align="center">
          <StatusLed config={config} t={t} />
        </Group>

        {/* 测试连接区域 — 所有模式均可用 */}
        <Box
          p="sm"
          style={{
            borderRadius: 10,
            backgroundColor: "var(--surface-panel)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <Group justify="space-between" align="center">
            {config.lastTestUrl ? (
              <Text size="xs" c="dimmed" truncate style={{ maxWidth: 220 }}>
                {t("proxy.test.lastUrl")}: {config.lastTestUrl}
              </Text>
            ) : (
              <Text size="xs" c="dimmed">{t("proxy.test.hint")}</Text>
            )}
            <Button
              size="compact-xs"
              variant="light"
              leftSection={<Search size={12} />}
              onClick={handleOpenTestModal}
              radius="md"
            >
              {t("proxy.test.button")}
            </Button>
          </Group>
        </Box>

        {/* 重启提示 */}
        <Collapse expanded={showRestartHint} transitionDuration={300}>
          <Box
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              backgroundColor: "var(--surface-panel)",
              borderLeft: "3px solid var(--status-warning, #f59e0b)",
            }}
          >
            <Text size="xs" c="dimmed">
              {t("proxy.restartHint")}
            </Text>
          </Box>
        </Collapse>
      </Stack>

      {/* 测试连接 Modal */}
      <Modal
        opened={testModalOpen}
        onClose={closeTestModal}
        title={t("proxy.test.modalTitle")}
        size="sm"
        radius="md"
        closeOnClickOutside={!testing}
      >
        <Stack gap="sm">
          <TextInput
            label={t("proxy.test.urlLabel")}
            placeholder={t("proxy.test.urlPlaceholder")}
            value={testUrlInput}
            onChange={(e) => setTestUrlInput(e.currentTarget.value)}
            disabled={testing}
            radius="md"
            styles={inputStyles}
            error={
              testUrlInput.length > 0 &&
              !/^https?:\/\/.+/.test(testUrlInput)
                ? t("proxy.test.invalidUrl")
                : undefined
            }
          />
          <Group justify="flex-end" gap="xs">
            <Button
              variant="default"
              onClick={closeTestModal}
              disabled={testing}
              radius="md"
            >
              {t("proxy.test.cancel")}
            </Button>
            <Button
              onClick={async () => {
                closeTestModal();
                try {
                  const result = await testConnection(testUrlInput);
                  showTestNotification(result, t);
                } catch (e) {
                  const errMsg =
                    e instanceof Error ? e.message : String(e ?? "");
                  console.error("[ProxySection] testConnection error:", errMsg);
                  notifications.show({
                    title: t("proxy.test.failTitle"),
                    message: errMsg || t("proxy.test.errors.unknown", { error: "" }),
                    color: "red",
                    icon: <XCircle size={16} />,
                  });
                }
              }}
              loading={testing}
              radius="md"
              disabled={
                !testUrlInput.trim() ||
                !/^https?:\/\/.+/.test(testUrlInput)
              }
            >
              {testing ? t("proxy.test.testing") : t("proxy.test.startTest")}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </ThemeCard>
  );
}
