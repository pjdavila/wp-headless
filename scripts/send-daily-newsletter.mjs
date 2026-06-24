import {
  fetchLeadPostsLast24h,
  buildDailyNewsletterHtml,
  sendDailyNewsletterCampaign,
  formatEnglishDate,
} from "../lib/dailyNewsletter.js";

const isDryRun = process.argv.includes("--dry-run");

async function main() {
  let posts;
  try {
    posts = await fetchLeadPostsLast24h();
  } catch (err) {
    console.error("[daily-newsletter] Failed to fetch posts:", err.message);
    process.exit(1);
  }

  if (!posts || posts.length === 0) {
    console.info(
      "[daily-newsletter] No portada/lead posts in last 24h — skipping send",
    );
    process.exit(0);
  }

  const now = new Date();
  const html = buildDailyNewsletterHtml({ posts, date: now });
  const subject = `Caribbean Business — Today's Top Stories (${formatEnglishDate(now)})`;

  if (isDryRun) {
    console.info(
      `[daily-newsletter] DRY RUN — ${posts.length} stories, subject: "${subject}", html ${html.length} chars. No campaign sent.`,
    );
    process.exit(0);
  }

  try {
    const { campaignId } = await sendDailyNewsletterCampaign({
      subject,
      html,
      date: now,
    });
    console.info(
      `[daily-newsletter] Sent campaign ${campaignId} with ${posts.length} stories`,
    );
    process.exit(0);
  } catch (err) {
    console.error("[daily-newsletter] Send failed:", err.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[daily-newsletter] Unexpected error:", err);
  process.exit(1);
});
