import { Button, TextInput, Checkbox, Group, Stack, ActionIcon, Text } from "@mantine/core";
import { ChevronDown, ChevronRight, Plus, Trash2, Filter } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useRenameStore } from "@/stores/renameStore";
import QuickFilters from "./QuickFilters";
import type { FilterItem } from "@/types";

export default function FilterSection() {
  const { t } = useTranslation("rename");
  const filterCollapsed = useRenameStore((s) => s.filterCollapsed);
  const setFilterCollapsed = useRenameStore((s) => s.setFilterCollapsed);
  const filterItems = useRenameStore((s) => s.filterItems);
  const setFilterItems = useRenameStore((s) => s.setFilterItems);

  const addFilter = () => {
    setFilterItems([...filterItems, { keyword: "", isRegex: false }]);
  };

  const removeFilter = (index: number) => {
    const newItems = filterItems.filter((_, i) => i !== index);
    if (newItems.length === 0) newItems.push({ keyword: "", isRegex: false });
    setFilterItems(newItems);
  };

  const updateFilter = (index: number, updates: Partial<FilterItem>) => {
    const newItems = filterItems.map((item, i) =>
      i === index ? { ...item, ...updates } : item
    );
    setFilterItems(newItems);
  };

  return (
    <div style={{ borderBottom: "1px solid var(--border-subtle)" }}>
      <button
        style={{
          display: "flex",
          width: "100%",
          alignItems: "center",
          gap: 6,
          padding: "8px 12px",
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text-secondary)",
          background: "none",
          border: "none",
          cursor: "pointer",
          transition: "color 200ms ease",
          fontFamily: "var(--font-body)",
        }}
        onClick={() => setFilterCollapsed(!filterCollapsed)}
      >
        {filterCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        <Filter size={14} />
        {t("filter.title")}
      </button>

      {!filterCollapsed && (
        <Stack gap="xs" px="sm" pb="xs">
          <QuickFilters />

          {filterItems.map((filter, index) => (
            <Group key={index} gap="xs" align="center">
              <TextInput
                style={{ flex: 1 }}
                size="xs"
                placeholder={t("filter.placeholder")}
                value={filter.keyword}
                onChange={(e) => updateFilter(index, { keyword: e.currentTarget.value })}
                radius="md"
                styles={{
                  input: {
                    fontFamily: "var(--font-mono)",
                    backgroundColor: "var(--surface-overlay)",
                    borderColor: "var(--border-default)",
                    color: "var(--text-primary)",
                  },
                }}
              />
              <Group gap={4} align="center">
                <Checkbox
                  checked={filter.isRegex}
                  onChange={(e) => updateFilter(index, { isRegex: e.currentTarget.checked })}
                  size="xs"
                />
                <Text size="xs" c="dimmed">{t("rules.regex")}</Text>
              </Group>
              <ActionIcon
                variant="subtle"
                size="sm"
                color="gray"
                radius="sm"
                onClick={() => removeFilter(index)}
              >
                <Trash2 size={14} />
              </ActionIcon>
            </Group>
          ))}

          <Button
            variant="subtle"
            size="compact-xs"
            leftSection={<Plus size={12} />}
            onClick={addFilter}
            radius="md"
          >
            {t("filter.quickFilters.byExtension")}
          </Button>
        </Stack>
      )}
    </div>
  );
}
