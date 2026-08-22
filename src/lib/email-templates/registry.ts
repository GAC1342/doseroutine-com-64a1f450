import type { ComponentType } from "react";
import { template as doseReminderTemplate } from "./dose-reminder";
import { template as subscriptionWelcomeTemplate } from "./subscription-welcome";
import { template as libraryGenReportTemplate } from "./library-gen-report";
import { template as sitemapHealthReportTemplate } from "./sitemap-health-report";
import { template as robotsHealthReportTemplate } from "./robots-health-report";
import { template as schemaValidationReportTemplate } from "./schema-validation-report";
import { template as attributionCrawlReportTemplate } from "./attribution-crawl-report";

import { template as notfoundSpikeReportTemplate } from "./notfound-spike-report";
import { template as seoMonitorReportTemplate } from "./seo-monitor-report";
import { template as crawlBlockReportTemplate } from "./crawl-block-report";
import { template as redirectVerifyReportTemplate } from "./redirect-verify-report";
import { template as gscMonitorReportTemplate } from "./gsc-monitor-report";
import { template as testerSignupAlertTemplate } from "./tester-signup-alert";
import { template as testerTestBeginsTemplate } from "./tester-test-begins";
import { template as testerWelcomeTemplate } from "./tester-welcome";
import { template as testerInstallReminderTemplate } from "./tester-install-reminder";
import { template as testerFeedbackPromptTemplate } from "./tester-feedback-prompt";
import { template as testerWrapupTemplate } from "./tester-wrapup";
import { template as appLaunchConfirmationTemplate } from "./app-launch-confirmation";
import { template as appLaunchAlertTemplate } from "./app-launch-alert";
import { template as workoutReminderTemplate } from "./workout-reminder";
import { template as trialEndingTemplate } from "./trial-ending";
import { template as trialFinalDayTemplate } from "./trial-final-day";

export interface TemplateEntry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
  component: ComponentType<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
  subject: string | ((data: Record<string, any>) => string);
  displayName?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
  previewData?: Record<string, any>;
  to?: string;
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  "dose-reminder": doseReminderTemplate,
  "subscription-welcome": subscriptionWelcomeTemplate,
  "library-gen-report": libraryGenReportTemplate,
  "sitemap-health-report": sitemapHealthReportTemplate,
  "robots-health-report": robotsHealthReportTemplate,
  "schema-validation-report": schemaValidationReportTemplate,
  "attribution-crawl-report": attributionCrawlReportTemplate,

  "notfound-spike-report": notfoundSpikeReportTemplate,
  "seo-monitor-report": seoMonitorReportTemplate,
  "crawl-block-report": crawlBlockReportTemplate,
  "redirect-verify-report": redirectVerifyReportTemplate,
  "gsc-monitor-report": gscMonitorReportTemplate,
  "tester-signup-alert": testerSignupAlertTemplate,
  "tester-test-begins": testerTestBeginsTemplate,
  "tester-welcome": testerWelcomeTemplate,
  "tester-install-reminder": testerInstallReminderTemplate,
  "tester-feedback-prompt": testerFeedbackPromptTemplate,
  "tester-wrapup": testerWrapupTemplate,
  "app-launch-confirmation": appLaunchConfirmationTemplate,
  "app-launch-alert": appLaunchAlertTemplate,
  "workout-reminder": workoutReminderTemplate,
  "trial-ending": trialEndingTemplate,
  "trial-final-day": trialFinalDayTemplate,
};
