/**
 * Paginated video archives (shared by the pages and the client component):
 *   /videos/archive/ (+ /page/<n>/) — every regular CB TV video (no shorts)
 *   /videos/shorts/  (+ /page/<n>/) — every video in the Short Videos playlist
 */
export const VIDEO_ARCHIVES = {
  archive: {
    basePath: "/videos/archive/",
    pageSize: 12,
    title: "All Videos",
    description:
      "Every Caribbean Business video: interviews, reports and business coverage from Puerto Rico.",
  },
  shorts: {
    basePath: "/videos/shorts/",
    pageSize: 20,
    title: "Short Videos",
    description: "Every short video clip from Caribbean Business.",
  },
};

export function archivePageHref(kind, page) {
  const { basePath } = VIDEO_ARCHIVES[kind];
  return page <= 1 ? basePath : `${basePath}page/${page}/`;
}
