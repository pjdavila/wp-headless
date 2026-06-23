import { normalizeImageUrl } from "./normalizeImageUrl";
import { rewriteWpImageSrc } from "./rewriteWpContentImageUrls";

const WP_URL =
  process.env.NEXT_PUBLIC_WORDPRESS_URL || "https://cms.vnmedia.co/cbusiness";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://caribbean.business";
const LOGO_URL = "https://img.caribbean.business/Logo-CB-White.png";
const EXCERPT_MAX = 420;

const LEAD_POSTS_QUERY = `
  query DailyLeadPosts {
    posts(first: 50, where: { tag: "lead", orderby: { field: DATE, order: DESC } }) {
      nodes {
        id
        title
        uri
        excerpt
        content
        dateGmt
        featuredImage {
          node {
            sourceUrl
            altText
          }
        }
      }
    }
  }
`;

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripHtml(html) {
  if (!html || typeof html !== "string") return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#8217;|&#039;|&#39;|&rsquo;/gi, "'")
    .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#8211;|&#8212;|&ndash;|&mdash;/gi, "-")
    .replace(/&hellip;/gi, "...")
    .replace(/&[a-z0-9#]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(text, max) {
  if (!text) return "";
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  const base = lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice;
  return base.replace(/[\s.,;:!-]+$/, "") + "…";
}

function buildExcerpt(post) {
  const source = stripHtml(post.excerpt) || stripHtml(post.content);
  return truncate(source, EXCERPT_MAX);
}

function formatEnglishDate(date) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "America/Puerto_Rico",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export async function fetchLeadPostsLast24h() {
  let resp;
  try {
    resp = await fetch(`${WP_URL}/graphql`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: LEAD_POSTS_QUERY }),
    });
  } catch (err) {
    console.error("[daily-newsletter] WP fetch failed:", err.message);
    throw new Error("wp-fetch-failed");
  }

  if (!resp.ok) {
    const body = await resp.text();
    console.error("[daily-newsletter] WP responded", resp.status, body.slice(0, 300));
    throw new Error("wp-fetch-failed");
  }

  const json = await resp.json();

  if (json?.errors?.length) {
    console.error(
      "[daily-newsletter] WP GraphQL errors:",
      JSON.stringify(json.errors).slice(0, 300)
    );
    throw new Error("wp-graphql-errors");
  }

  if (!json?.data?.posts || !Array.isArray(json.data.posts.nodes)) {
    console.error("[daily-newsletter] WP returned unexpected shape");
    throw new Error("wp-unexpected-shape");
  }

  const nodes = json.data.posts.nodes;
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;

  return nodes.filter((post) => {
    if (!post.dateGmt) return false;
    const ts = Date.parse(`${post.dateGmt}Z`);
    return Number.isFinite(ts) && ts >= cutoff && ts <= Date.now() + 5 * 60 * 1000;
  });
}

function buildStoryRow(post) {
  const title = escapeHtml(post.title || "Untitled");
  const excerpt = escapeHtml(buildExcerpt(post));
  const permalink = `${SITE_URL}${post.uri || "/"}`;
  const rawImg = post.featuredImage?.node?.sourceUrl;
  const imgSrc = rawImg ? normalizeImageUrl(rewriteWpImageSrc(rawImg)) : "";
  const alt = escapeHtml(post.featuredImage?.node?.altText || post.title || "");

  const imageBlock = imgSrc
    ? `
              <tr>
                <td style="padding:0 0 18px;line-height:0;">
                  <a href="${permalink}" target="_blank" style="display:block;">
                    <img src="${imgSrc}" alt="${alt}" width="520" style="display:block;width:100%;max-width:520px;height:auto;aspect-ratio:16/9;object-fit:cover;border:0;border-radius:8px;" />
                  </a>
                </td>
              </tr>`
    : "";

  return `
      <tr>
        <td style="padding:0 40px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${imageBlock}
            <tr>
              <td>
                <a href="${permalink}" target="_blank" style="text-decoration:none;">
                  <h3 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:700;line-height:1.3;color:#ffffff;">
                    ${title}
                  </h3>
                </a>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#b0b3bf;">
                  ${excerpt}
                </p>
                <a href="${permalink}" target="_blank" style="display:inline-block;font-size:14px;font-weight:600;color:#2a9d6a;text-decoration:none;letter-spacing:0.02em;">
                  Read full story &rarr;
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:0 40px;">
          <div style="height:1px;background-color:#252836;margin-bottom:32px;"></div>
        </td>
      </tr>`;
}

export function buildDailyNewsletterHtml({ posts, date = new Date() }) {
  const year = date.getFullYear();
  const dateLabel = formatEnglishDate(date);
  const stories = posts.map(buildStoryRow).join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background-color:#0d0e12;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d0e12;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#151720;border-radius:12px;overflow:hidden;">
          <tr>
            <td align="center" style="padding:36px 40px 8px;">
              <a href="https://caribbean.business" target="_blank" style="display:inline-block;">
                <img src="${LOGO_URL}" alt="Caribbean Business" width="260" style="display:block;width:100%;max-width:260px;height:auto;border:0;" />
              </a>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 40px 8px;">
              <p style="margin:0;font-size:12px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#2a9d6a;">
                Today's Top Stories
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 40px 28px;">
              <p style="margin:0;font-size:13px;color:#6b6e7a;text-transform:capitalize;">
                ${dateLabel}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 32px;">
              <div style="height:1px;background-color:#252836;"></div>
            </td>
          </tr>
          ${stories}
          <tr>
            <td align="center" style="padding:8px 40px 36px;">
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="background-color:#2a9d6a;border-radius:8px;">
                    <a href="https://caribbean.business" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.02em;">
                      See all news
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #252836;text-align:center;">
              <p style="margin:0;font-size:13px;color:#6b6e7a;line-height:1.5;">
                &copy; ${year} Caribbean Business &mdash; A Vision News Media Publication
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:#4e5060;">
                <a href="https://caribbean.business" style="color:#2a9d6a;text-decoration:none;">caribbean.business</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

async function moosendPost(path, body) {
  const apiKey = process.env.MOOSEND_API_KEY;
  const url = `https://api.moosend.com/v3/${path}?apikey=${encodeURIComponent(apiKey)}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await resp.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    /* non-JSON */
  }
  return { ok: resp.ok, status: resp.status, data, text };
}

export async function sendDailyNewsletterCampaign({ subject, html, date = new Date() }) {
  const apiKey = process.env.MOOSEND_API_KEY;
  const listId = process.env.MOOSEND_LIST_ID;
  const senderEmail = process.env.MOOSEND_NEWSLETTER_SENDER_EMAIL;

  if (!apiKey || !listId) {
    throw new Error("missing-moosend-config");
  }
  if (!senderEmail) {
    throw new Error("missing-sender-email");
  }

  const name = `Daily Lead Newsletter - ${date.toISOString()}`;

  const created = await moosendPost("campaigns/create.json", {
    Name: name,
    Subject: subject,
    SenderEmail: senderEmail,
    MailingLists: [{ MailingListID: listId }],
    HTMLContent: html,
  });

  if (!created.ok || !created.data || created.data.Code !== 0) {
    console.error(
      "[daily-newsletter] Moosend create failed:",
      created.status,
      created.text.slice(0, 300)
    );
    throw new Error("moosend-create-failed");
  }

  const campaignId = created.data.Context;
  if (!campaignId) {
    throw new Error("moosend-no-campaign-id");
  }

  const sent = await moosendPost(`campaigns/${encodeURIComponent(campaignId)}/send.json`, {});

  if (!sent.ok || !sent.data || sent.data.Code !== 0) {
    console.error(
      "[daily-newsletter] Moosend send failed:",
      sent.status,
      sent.text.slice(0, 300)
    );
    throw new Error("moosend-send-failed");
  }

  return { campaignId };
}
