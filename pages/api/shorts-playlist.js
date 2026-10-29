import { ASTRO_PLAYLISTS } from "../../lib/astroPlaylist";
import { createPlaylistHandler } from "../../lib/astroPlaylistHandler";

export default createPlaylistHandler(ASTRO_PLAYLISTS.shorts, "Shorts");
