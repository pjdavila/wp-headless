import VideoArchivePage from "../../../../components/videos/VideoArchivePage";
import { getVideoArchiveStaticProps } from "../../../../lib/videoArchive";

export default VideoArchivePage;

export function getStaticProps(context) {
  return getVideoArchiveStaticProps({
    context,
    Page: VideoArchivePage,
    kind: "shorts",
    pageParam: context.params?.page,
  });
}

// Pages are generated on first request and refreshed every 60 s (ISR).
export function getStaticPaths() {
  return { paths: [], fallback: "blocking" };
}
