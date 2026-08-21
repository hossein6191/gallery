// Minimal Twitter/X fetching, tuned to burn as little API quota as possible:
//  - Avatars everywhere: unavatar.io (free, no API key).
//  - Tweet content: fetched ONCE at submission time and stored in the DB.
//    If TWITTER_BEARER_TOKEN is set (Railway env var) the official v2 API is
//    used (text + first image). Otherwise the free oEmbed endpoint supplies
//    the text so local dev works with no key at all.

export type FetchedTweet = {
  text: string | null;
  imageUrl: string | null;
  authorHandle: string | null;
};

export function extractTweetId(url: string): string | null {
  const m = url.match(/(?:twitter\.com|x\.com)\/[^/]+\/status(?:es)?\/(\d+)/i);
  return m ? m[1] : null;
}

export function isTweetUrl(url: string): boolean {
  return extractTweetId(url) !== null;
}

async function fetchViaApi(tweetId: string, token: string): Promise<FetchedTweet | null> {
  const params = new URLSearchParams({
    "tweet.fields": "text,attachments",
    expansions: "attachments.media_keys,author_id",
    "media.fields": "url,preview_image_url",
    "user.fields": "username",
  });
  const res = await fetch(`https://api.twitter.com/2/tweets/${tweetId}?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = await res.json();
  if (!json?.data) return null;
  const media = json.includes?.media?.[0];
  const author = json.includes?.users?.[0];
  return {
    text: json.data.text ?? null,
    imageUrl: media?.url ?? media?.preview_image_url ?? null,
    authorHandle: author?.username ?? null,
  };
}

async function fetchViaOEmbed(tweetUrl: string): Promise<FetchedTweet | null> {
  try {
    const res = await fetch(
      `https://publish.twitter.com/oembed?omit_script=true&url=${encodeURIComponent(tweetUrl)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const text =
      typeof json?.html === "string"
        ? json.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
        : null;
    const handle =
      typeof json?.author_url === "string"
        ? json.author_url.split("/").filter(Boolean).pop() ?? null
        : null;
    return { text, imageUrl: null, authorHandle: handle };
  } catch {
    return null;
  }
}

export async function fetchTweet(tweetUrl: string): Promise<FetchedTweet | null> {
  const id = extractTweetId(tweetUrl);
  if (!id) return null;
  const token = process.env.TWITTER_BEARER_TOKEN;
  if (token) {
    const viaApi = await fetchViaApi(id, token);
    if (viaApi) return viaApi;
  }
  return fetchViaOEmbed(tweetUrl);
}
