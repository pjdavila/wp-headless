import {
  fetchLeadPostsLast24h,
  buildDailyNewsletterHtml,
  sendDailyNewsletterCampaign,
} from "../../lib/dailyNewsletter";

function isAuthorized(req) {
  const expected = process.env.NEWSLETTER_CRON_TOKEN;
  if (!expected) return false;
  const header = req.headers["authorization"] || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const provided = bearer || req.query.token || req.headers["x-cron-token"] || "";
  return provided === expected;
}

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  let posts;
  try {
    posts = await fetchLeadPostsLast24h();
  } catch (err) {
    return res.status(502).json({ ok: false, error: err.message });
  }

  if (!posts || posts.length === 0) {
    console.info("[daily-newsletter] No lead posts in last 24h — skipping send");
    return res.status(200).json({ ok: true, sent: false, reason: "no-lead-posts" });
  }

  const now = new Date();
  const html = buildDailyNewsletterHtml({ posts, date: now });
  const subject = "Caribbean Business — Lo más importante de hoy";

  try {
    const { campaignId } = await sendDailyNewsletterCampaign({
      subject,
      html,
      date: now,
    });
    console.info(
      `[daily-newsletter] Sent campaign ${campaignId} with ${posts.length} stories`
    );
    return res
      .status(200)
      .json({ ok: true, sent: true, count: posts.length, campaignId });
  } catch (err) {
    return res.status(502).json({ ok: false, sent: false, error: err.message });
  }
}
