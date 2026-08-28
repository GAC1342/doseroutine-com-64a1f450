import * as React from "react";
import { createAuthEmailHandler } from "@lovable.dev/email-js";
import { createFileRoute } from "@tanstack/react-router";
import { SignupEmail } from "@/lib/email-templates/signup";
import { InviteEmail } from "@/lib/email-templates/invite";
import { MagicLinkEmail } from "@/lib/email-templates/magic-link";
import { RecoveryEmail } from "@/lib/email-templates/recovery";
import { EmailChangeEmail } from "@/lib/email-templates/email-change";
import { ReauthenticationEmail } from "@/lib/email-templates/reauthentication";

// Configuration
const SITE_NAME = "DoseRoutine";
const SENDER_DOMAIN = "notify.doseroutine.com";
const ROOT_DOMAIN = "doseroutine.com";
const FROM_DOMAIN = "notify.doseroutine.com";
const SITE_URL = `https://${ROOT_DOMAIN}`;

// The SDK handler owns verification, dispatch, and retry semantics; this file
// owns only the email decisions: subjects, templates, and per-type props.
// NOTE: build this lazily inside the request handler. `process.env` is
// injected per-request on the Worker runtime, so reading it at module scope
// yields undefined and the SDK throws "Missing Lovable API key" while the SSR
// bundle is being imported — which takes every route down with a 500.
type AuthEmailHandler = ReturnType<typeof createAuthEmailHandler>;
let handlerInstance: AuthEmailHandler | null = null;

function getHandler(): AuthEmailHandler {
  if (handlerInstance) return handlerInstance;
  handlerInstance = createAuthEmailHandler({
    apiKey: process.env.LOVABLE_API_KEY!,
    from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
    senderDomain: SENDER_DOMAIN,
    sendUrl: process.env.LOVABLE_SEND_URL,
    emails: {
      signup: {
        subject: "Confirm your email",
        render: (data) =>
          React.createElement(SignupEmail, {
            siteName: SITE_NAME,
            siteUrl: SITE_URL,
            recipient: data.email,
            confirmationUrl: data.url,
          }),
      },
      invite: {
        subject: "You've been invited",
        render: (data) =>
          React.createElement(InviteEmail, {
            siteName: SITE_NAME,
            siteUrl: SITE_URL,
            confirmationUrl: data.url,
          }),
      },
      magiclink: {
        subject: "Your login link",
        render: (data) =>
          React.createElement(MagicLinkEmail, {
            siteName: SITE_NAME,
            confirmationUrl: data.url,
          }),
      },
      recovery: {
        subject: "Reset your password",
        render: (data) =>
          React.createElement(RecoveryEmail, {
            siteName: SITE_NAME,
            confirmationUrl: data.url,
          }),
      },
      email_change: {
        subject: "Confirm your new email",
        render: (data) =>
          React.createElement(EmailChangeEmail, {
            siteName: SITE_NAME,
            oldEmail: data.old_email ?? "",
            email: data.email,
            newEmail: data.new_email ?? "",
            confirmationUrl: data.url,
          }),
      },
      reauthentication: {
        subject: "Your verification code",
        render: (data) => React.createElement(ReauthenticationEmail, { token: data.token ?? "" }),
      },
    },
  });
  return handlerInstance;
}

export const Route = createFileRoute("/lovable/email/auth/webhook")({
  server: {
    handlers: {
      POST: ({ request }) => getHandler()(request),
    },
  },
});
