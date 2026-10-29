import VideoArchivePage from "../../../components/videos/VideoArchivePage";
import { getVideoArchiveStaticProps } from "../../../lib/videoArchive";

export default VideoArchivePage;

export function getStaticProps(context) {
  return getVideoArchiveStaticProps({ context, Page: VideoArchivePage, kind: "archive" });
}
