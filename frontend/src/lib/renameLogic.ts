import type { ReplaceInfo } from "@/types";

/**
 * Apply replace rules to a filename (client-side preview logic).
 * Mirrors the Rust rename_logic::apply_replace_rules behavior.
 */
function applyReplaceRules(name: string, rules: ReplaceInfo[]): string {
  let result = name;

  for (const rule of rules) {
    if (!rule.enable || !rule.content) continue;

    if (rule.isRegex) {
      try {
        const regex = new RegExp(rule.content, "g");
        result = result.replace(regex, rule.target);
      } catch {
        // Invalid regex, skip this rule
      }
    } else {
      result = result.split(rule.content).join(rule.target);
    }
  }

  return result;
}

export const renameLogic = {
  applyReplaceRules,
};
