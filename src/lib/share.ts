// UTM-tagged share links for outbound sharing to social platforms.
const BASE_URL = "https://doseroutine.com";

export type SharePlatform =
  | "x"
  | "facebook"
  | "linkedin"
  | "telegram"
  | "whatsapp"
  | "reddit"
  | "copy"
  | "native";

export function buildShareUrl(platform: SharePlatform, path = "/", campaign = "user_share") {
  const utm = new URLSearchParams({
    utm_source: platform,
    utm_medium: "share",
    utm_campaign: campaign,
  });
  return `${BASE_URL}${path}${path.includes("?") ? "&" : "?"}${utm.toString()}`;
}

export function shareIntentUrl(
  platform: SharePlatform,
  path = "/",
  text = "Track your supplements, hormones, and peptides — with real interaction checks.",
) {
  const url = buildShareUrl(platform, path);
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);
  switch (platform) {
    case "x":
      return `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
    case "telegram":
      return `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
    case "whatsapp":
      return `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
    case "reddit":
      return `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedText}`;
    default:
      return url;
  }
}

export async function nativeShare(
  path = "/",
  text = "DoseRoutine — track supplements, hormones, and peptides safely.",
) {
  const url = buildShareUrl("native", path);
  if (typeof navigator !== "undefined" && "share" in navigator) {
    try {
      await (navigator as Navigator).share({ title: "DoseRoutine", text, url });
      return true;
    } catch {
      return false;
    }
  }
  try {
    await (navigator as Navigator).clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}
