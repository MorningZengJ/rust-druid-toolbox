import { Button, TextInput, Checkbox, Group, Stack, ActionIcon, Text, useMantineTheme, useComputedColorScheme } from "@mantine/core";
import { ChevronDown, ChevronRight, Plus, Trash2, Filter } from "lucide-react";
import { useRenameStore } from "@/stores/renameStore";
import QuickFilters from "./QuickFilters";
import type { FilterItem } from "@/types";

export default function FilterSection() {
  const filterCollapsed = useRenameStore((s) => s.filterCollapsed);
  const setFilterCollapsed = useRenameStore((s) => s.setFilterCollapsed);
  const filterItems = useRenameStore((s) => s.filterItems);
  const setFilterItems = useRenameStore((s) => s.setFilterItems);

  const theme = useMantineTheme();
  const colorScheme = useComputedColorScheme();
  const isDark = colorScheme === "dark";

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
    <div style={{ borderBottom: `1px solid ${isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.04)"}` }}>
      <button
        style={{
          display: "flex",
          width: "100%",
          alignItems: "center",
          gap: 6,
          padding: "8px 12px",
          fontSize: 12,
          fontWeight: 600,
          color: isDark ? theme.colors.dark[1] : theme.colors.gray[7],
          background: "none",
          border: "none",
          cursor: "pointer",
          transition: "color 150ms ease",
        }}
        onClick={() => setFilterCollapsed(!filterCollapsed)}
      >
        {filterCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        <Filter size={14} />
        文件筛选
      </button>

      {!filterCollapsed && (
        <Stack gap="xs" px="sm" pb="xs">
          <QuickFilters />

          {filterItems.map((filter, index) => (
            <Group key={index} gap="xs" align="center">
              <TextInput
                style={{ flex: 1 }}
                size="xs"
                placeholder="关键词筛选..."
                value={filter.keyword}
                onChange={(e) => updateFilter(index, { keyword: e.currentTarget.value })}
                radius="md"
                styles={{
                  input: {
                    backgroundColor: isDark ? theme.colors.dark[6] : theme.white,
                    borderColor: isDark ? theme.colors.dark[4] : theme.colors.gray[3],
                  },
                }}
              />
              <Group gap={4} align="center">
                <Checkbox
                  checked={filter.isRegex}
                  onChange={(e) => updateFilter(index, { isRegex: e.currentTarget.checked })}
                  size="xs"
                  color={theme.primaryColor}
                />
                <Text size="xs" c="dimmed">正则</Text>
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
            添加筛选
          </Button>
        </Stack>
      )}
    </div>
  );
}
