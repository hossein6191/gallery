// Minimal Twitter/X fetching, tuned to burn as little API quota as possible:
//  - Avatars everywhere: unavatar.io (free, no API key).
//  - Tweet content: fetched ONCE at submission time and stored in the DB.
//    If TWITTER_BEARER_TOKEN is set (Railway env var) the official v2 API is
//    used (text + image / video preview + tweet date). Otherwise the free
//    oEmbed endpoint supplies text and date so local dev needs no key.

export type FetchedTweet = {
  text: string | null;
  imageUrl: string | null;
  mediaType: "photo" | "video" | null;
  createdAt: string | null; // ISO date of the tweet itself
  authorHandle: string | null;
};

export function extractTweetId(url: string): string | null {
  const m = url.match(/(?:twitter\.com|x\.com)\/[^/]+\/status(?:es)?\/(\d+)/i);
  return m ? m[1] : null;
}

export function isTweetUrl(url: string): boolean {
  return extractTweetId(url) !== null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&hellip;/g, "…")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function cleanTweetText(raw: string): string {
  return decodeEntities(raw)
    .replace(/https?:\/\/t\.co\/\S+/g, "")
    .replace(/pic\.twitter\.com\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchViaApi(tweetId: string, token: string): Promise<FetchedTweet | null> {
  const params = new URLSearchParams({
    "tweet.fields": "text,created_at,attachments",
    expansions: "attachments.media_keys,author_id",
    "media.fields": "url,preview_image_url,type",
    "user.fields": "username",
  });
  const res = await fetch(`https://api.twitter.com/2/tweets/${tweetId}?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = await res.json();
  if (!json?.data) return null;

  const media: { type?: string; url?: string; preview_image_url?: string }[] =
    json.includes?.media ?? [];
  const photo = media.find((m) => m.type === "photo");
  const video = media.find((m) => m.type === "video" || m.type === "animated_gif");
  const author = json.includes?.users?.[0];

  return {
    text: json.data.text ? cleanTweetText(json.data.text) : null,
    imageUrl: photo?.url ?? video?.preview_image_url ?? null,
    mediaType: photo ? "photo" : video ? "video" : null,
    createdAt: json.data.created_at ?? null,
    authorHandle: author?.username ?? null,
  };
}

// Twitter's public syndication endpoint (what embedded tweets use). No API
// key, no quota — returns text, date, photos and the video poster.
const SYNDICATION_FEATURES = [
  "tfw_timeline_list:",
  "tfw_follower_count_sunset:true",
  "tfw_tweet_edit_backend:on",
  "tfw_refsrc_session:on",
  "tfw_fosnr_soft_interventions_enabled:on",
  "tfw_show_birdwatch_pivots_enabled:on",
  "tfw_show_business_verified_badge:on",
  "tfw_duplicate_scribes_to_settings:on",
  "tfw_use_profile_image_shape_enabled:on",
  "tfw_show_blue_verified_badge:on",
  "tfw_legacy_timeline_sunset:true",
  "tfw_show_gov_verified_badge:on",
  "tfw_show_business_affiliate_badge:on",
  "tfw_tweet_edit_frontend:on",
].join(";");

function syndicationToken(id: string): string {
  return ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, "");
}

async function fetchViaSyndication(tweetId: string): Promise<FetchedTweet | null> {
  try {
    const url = new URL("https://cdn.syndication.twimg.com/tweet-result");
    url.searchParams.set("id", tweetId);
    url.searchParams.set("lang", "en");
    url.searchParams.set("features", SYNDICATION_FEATURES);
    url.searchParams.set("token", syndicationToken(tweetId));
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; GenLayerGallery/1.0)" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json || json.__typename !== "Tweet" || typeof json.text !== "string") return null;

    const mediaOf = (t: Record<string, unknown> | undefined) => {
      if (!t) return { photo: null as string | null, poster: null as string | null, video: false };
      const photos = (Array.isArray(t.photos) ? t.photos : []) as { url?: string }[];
      const details = (Array.isArray(t.mediaDetails) ? t.mediaDetails : []) as {
        type?: string;
        media_url_https?: string;
      }[];
      const video = t.video as { poster?: string } | undefined;
      return {
        photo: photos[0]?.url ?? details.find((m) => m.type === "photo")?.media_url_https ?? null,
        poster: video?.poster ?? null,
        video: Boolean(video) || details.some((m) => m.type === "video" || m.type === "animated_gif"),
      };
    };

    const own = mediaOf(json);
    const quoted = mediaOf(json.quoted_tweet);
    // X Articles: the tweet text is only a link; the cover + preview live under `article`
    const article = json.article as
      | {
          title?: string;
          preview_text?: string;
          cover_media?: { media_info?: { original_img_url?: string } };
        }
      | undefined;
    const articleCover = article?.cover_media?.media_info?.original_img_url ?? null;

    // long tweets carry the full text in note_tweet
    let text = cleanTweetText(
      typeof json.note_tweet?.text === "string" ? json.note_tweet.text : json.text
    );
    if (!text && article) {
      text = [article.title, article.preview_text].filter(Boolean).join(" — ").trim();
    }
    if (!text && json.quoted_tweet?.text) {
      text = cleanTweetText(String(json.quoted_tweet.text));
    }

    const imageUrl = own.photo ?? own.poster ?? articleCover ?? quoted.photo ?? quoted.poster;
    const mediaType: FetchedTweet["mediaType"] =
      own.photo || articleCover || quoted.photo
        ? "photo"
        : own.video || quoted.video
          ? "video"
          : null;

    return {
      text: text || null,
      imageUrl,
      mediaType,
      createdAt: typeof json.created_at === "string" ? json.created_at : null,
      authorHandle: json.user?.screen_name ?? null,
    };
  } catch {
    return null;
  }
}

const MONTHS =
  "(January|February|March|April|May|June|July|August|September|October|November|December)";

async function fetchViaOEmbed(tweetUrl: string): Promise<FetchedTweet | null> {
  try {
    const res = await fetch(
      `https://publish.twitter.com/oembed?omit_script=true&url=${encodeURIComponent(tweetUrl)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const html: string = typeof json?.html === "string" ? json.html : "";

    // The tweet body lives in the <p> element; the trailing part is
    // "— Author (@handle) <a>Month D, YYYY</a>" which we use for the date.
    const pMatch = html.match(/<p[^>]*>([\s\S]*?)<\/p>/);
    const text = pMatch ? cleanTweetText(pMatch[1].replace(/<[^>]+>/g, " ")) : null;

    let createdAt: string | null = null;
    const dateMatch = html.match(new RegExp(`${MONTHS}\\s+(\\d{1,2}),\\s+(\\d{4})`));
    if (dateMatch) {
      const parsed = new Date(`${dateMatch[1]} ${dateMatch[2]}, ${dateMatch[3]} 12:00:00 UTC`);
      if (!Number.isNaN(parsed.getTime())) createdAt = parsed.toISOString();
    }

    const handle =
      typeof json?.author_url === "string"
        ? json.author_url.split("/").filter(Boolean).pop() ?? null
        : null;

    return { text, imageUrl: null, mediaType: null, createdAt, authorHandle: handle };
  } catch {
    return null;
  }
}

export async function fetchTweet(tweetUrl: string): Promise<FetchedTweet | null> {
  const id = extractTweetId(tweetUrl);
  if (!id) return null;

  // 1) free syndication endpoint (covers + date, zero quota)
  const viaSyndication = await fetchViaSyndication(id);
  if (viaSyndication) return viaSyndication;

  // 2) official API when a token is configured
  const token = process.env.TWITTER_BEARER_TOKEN;
  if (token) {
    const viaApi = await fetchViaApi(id, token);
    if (viaApi) return viaApi;
  }

  // 3) oEmbed — text + date only
  return fetchViaOEmbed(tweetUrl);
}
