import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { parseAcceptLanguage, SUPPORTED_LOCALES, DEFAULT_LOCALE, type Locale } from "./i18n";

export const detectServerLocale = createServerFn({ method: "GET" }).handler(async () => {
  const req = getRequest();
  const url = new URL(req.url);
  const urlLang = url.searchParams.get("lang")?.split("-")[0].toLowerCase() as Locale;
  if (urlLang && SUPPORTED_LOCALES.includes(urlLang)) return urlLang;
  const acceptLanguage = req.headers.get("accept-language");
  return parseAcceptLanguage(acceptLanguage) as Locale;
});
