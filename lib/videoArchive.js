import {
  ASTRO_PLAYLISTS,
  fetchFullPlaylist,
  isShortVideo,
} from "./astroPlaylist";

import { VIDEO_ARCHIVES } from "./videoArchiveConfig";

/** Server-side loaders: the full list of videos for each archive. */
const LOADERS = {
  archive: async () =>
    (await fetchFullPlaylist(ASTRO_PLAYLISTS.cbtv)).filter(
      (video) => !isShortVideo(video),
    ),
  shorts: () => fetchFullPlaylist(ASTRO_PLAYLISTS.shorts),
};

/**
 * getStaticProps body for an archive page. `pageParam` is undefined for the
 * base route. Out-of-range or malformed pages 404; /page/1/ redirects to the
 * base route. A failed fetch on the base route renders the empty state; on a
 * numbered page it throws so ISR keeps serving the last good version.
 */
export async function getVideoArchiveStaticProps({ context, Page, kind, pageParam }) {
  const config = VIDEO_ARCHIVES[kind];
  let page = 1;
  if (pageParam !== undefined) {
    if (!/^\d+$/.test(String(pageParam))) return { notFound: true };
    page = Number(pageParam);
    if (page < 1) return { notFound: true };
    if (page === 1) {
      return { redirect: { destination: config.basePath, permanent: true } };
    }
  }

  let videos = [];
  try {
    videos = await LOADERS[kind]();
  } catch (err) {
    console.error(`Video archive (${kind}) fetch error:`, err.message);
    if (page > 1) throw err;
  }

  const totalPages = Math.max(1, Math.ceil(videos.length / config.pageSize));
  if (page > totalPages) return { notFound: true };

  const start = (page - 1) * config.pageSize;
  const pageVideos = videos.slice(start, start + config.pageSize);

  const { getNextStaticProps } = await import("@faustwp/core");
  const faustProps = await getNextStaticProps(context, { Page, revalidate: 60 });

  return {
    ...faustProps,
    props: {
      ...(faustProps.props || {}),
      kind,
      videos: pageVideos,
      page,
      totalPages,
      total: videos.length,
    },
    revalidate: 60,
  };
}
