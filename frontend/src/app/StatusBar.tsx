import { memo } from "react";
import { Flex, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";

interface StatusBarProps {
  /** 当前激活页面的描述文本 */
  pageDescription: string;
  /** 当前版本号，为空时不显示 */
  currentVersion: string;
}

function StatusBar({ pageDescription, currentVersion }: StatusBarProps) {
  const { t } = useTranslation("common");

  return (
    <Flex
      h={28}
      px="md"
      align="center"
      justify="space-between"
      style={{
        borderTop: "1px solid var(--border-subtle)",
        backgroundColor: "var(--surface-base)",
        flexShrink: 0,
      }}
    >
      <Flex align="center" gap="md">
        <Text
          size="xs"
          style={{
            color: "var(--text-muted)",
            fontFamily: "var(--font-body)",
            fontSize: 11,
          }}
        >
          {pageDescription}
        </Text>
      </Flex>
      <Flex align="center" gap="md">
        <Text
          size="xs"
          style={{
            color: "var(--text-muted)",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.02em",
          }}
        >
          {t("brand.name")}{currentVersion ? ` v${currentVersion}` : ""}
        </Text>
      </Flex>
    </Flex>
  );
}

export default memo(StatusBar);
