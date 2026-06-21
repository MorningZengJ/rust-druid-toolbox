import i18n from "@/i18n";

export function formatTime(seconds: number): string {
  const t = i18n.getFixedT(null, "common");

  if (seconds < 60) {
    return t("time.seconds", { count: seconds });
  }

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (secs > 0) {
    return t("time.minutesSeconds", { minutes: mins, seconds: secs });
  }

  return t("time.minutes", { minutes: mins });
}
