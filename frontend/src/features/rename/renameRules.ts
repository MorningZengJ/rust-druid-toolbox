import type { ReplaceInfo } from "@/types";

// ── Factory ──

export function createReplaceInfo(partial?: Partial<ReplaceInfo>): ReplaceInfo {
  return {
    id: crypto.randomUUID(),
    content: "",
    target: "",
    enable: true,
    isRegex: false,
    ...partial,
    isError: false,
  };
}

// ── History (lightweight) ──

const MAX_HISTORY = 50;

/** Push state snapshots onto history stack, capping at MAX_HISTORY. */
export function pushHistory(
  history: ReplaceInfo[][],
  rules: ReplaceInfo[],
): ReplaceInfo[][] {
  const next = [...history, [...rules]];
  return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
}

/** Pop the last entry from history; returns [previous rules, new history]. */
export function popHistory(
  history: ReplaceInfo[][],
  fallbackRules: ReplaceInfo[],
): [ReplaceInfo[], ReplaceInfo[][]] {
  if (history.length === 0) return [fallbackRules, history];
  const previous = history[history.length - 1];
  return [previous, history.slice(0, -1)];
}

// ── Rule mutations (pure – returns new arrays, doesn't touch store) ──

export function addRule(
  rules: ReplaceInfo[],
  history: ReplaceInfo[][],
): [ReplaceInfo[], ReplaceInfo[][]] {
  return [
    [...rules, createReplaceInfo()],
    pushHistory(history, rules),
  ];
}

export function removeRule(
  rules: ReplaceInfo[],
  history: ReplaceInfo[][],
  index: number,
): [ReplaceInfo[], ReplaceInfo[][]] {
  return [
    rules.filter((_, i) => i !== index),
    pushHistory(history, rules),
  ];
}

export function updateRule(
  rules: ReplaceInfo[],
  history: ReplaceInfo[][],
  index: number,
  updates: Partial<ReplaceInfo>,
): [ReplaceInfo[], ReplaceInfo[][]] {
  return [
    rules.map((info, i) => (i === index ? { ...info, ...updates } : info)),
    pushHistory(history, rules),
  ];
}

/** Pure helper: snapshot history before a template is applied. */
export function applyTemplate(
  rules: ReplaceInfo[],
  history: ReplaceInfo[][],
): [ReplaceInfo[], ReplaceInfo[][]] {
  return [rules, pushHistory(history, rules)];
}

export function clearRules(
  rules: ReplaceInfo[],
  history: ReplaceInfo[][],
): [ReplaceInfo[], ReplaceInfo[][]] {
  return [[], pushHistory(history, rules)];
}

export function undoRules(
  history: ReplaceInfo[][],
  fallbackRules: ReplaceInfo[],
): [ReplaceInfo[], ReplaceInfo[][]] {
  return popHistory(history, fallbackRules);
}
