"use client";

import HelpBase from "@/modules/shared/HelpBase";
import { useI18n } from "@/i18n";

export default function SoporteAyudaPage() {
  const { t } = useI18n();

  return (
    <HelpBase
      endpoint="/support/help"
      context="private"
      title={t("support.help.title")}
      subtitle={t("support.help.subtitle")}
      loadingLabel={t("support.help.loading")}
      loadedSubtitle={t("support.help.subtitleLoaded")}
      systemStatusLabel={t("support.help.systemStatus")}
      backHref="/dashboard"
      backLabel={t("shared.actions.back")}
      privateFeedbackLabel={t("account.menu.feedback")}
      privateSuggestionsLabel={t("account.menu.suggestions")}
    />
  );
}
