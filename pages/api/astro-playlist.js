import { ASTRO_PLAYLISTS } from "../../lib/astroPlaylist";
import { createPlaylistHandler } from "../../lib/astroPlaylistHandler";

// CB TV playlist (same feed as the /videos page).
export default createPlaylistHandler(ASTRO_PLAYLISTS.cbtv, "Astro");
