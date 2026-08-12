# WordPress plugins for the Caribbean Business headless frontend

Plugins in this folder are versioned here but run on the WordPress backend
(`cms.vnmedia.co/cbusiness`, hosted on WP Engine). The frontend degrades
gracefully when they are not installed, but the related features stay hidden
until they are.

## `cb-author-profiles`

Adds the fields the public author pages (`/author/<slug>/`) need, and exposes
them in WPGraphQL:

| Field on the WordPress user profile | GraphQL                            |
| ----------------------------------- | ---------------------------------- |
| Profile photo (media item or URL)   | `user.cbAuthorProfile.photoUrl`    |
| Job title                           | `user.cbAuthorProfile.jobTitle`    |
| Public email                        | `user.cbAuthorProfile.publicEmail` |
| LinkedIn                            | `user.cbAuthorProfile.linkedinUrl` |
| Biographical Info (WordPress core)  | `user.description`                 |

The **biography is the core "Biographical Info" field** that WordPress already
ships with — this plugin does not duplicate it. It is empty for every user
today, so bios only appear once an editor fills it in.

### Install on WP Engine

1. Zip the plugin folder: `cd wordpress-plugin && zip -r cb-author-profiles.zip cb-author-profiles`
2. In WordPress: **Plugins → Add New → Upload Plugin**, choose the zip, install
   and activate.
   (Alternatively, upload the `cb-author-profiles` folder to
   `wp-content/plugins/` over SFTP and activate it from the Plugins screen.)
3. WPGraphQL must be active — it already is on this install.
4. Verify the schema picked the field up:

   ```bash
   curl -s -X POST https://cms.vnmedia.co/cbusiness/graphql \
     -H 'Content-Type: application/json' \
     -d '{"query":"{ nodeByUri(uri:\"/author/philipe/\"){ ... on User { name description cbAuthorProfile { photoUrl jobTitle publicEmail linkedinUrl } } } }"}'
   ```

   Before the plugin is installed this returns a `Cannot query field
"cbAuthorProfile"` error, which the frontend swallows — the author page still
   renders with the name, bio and article archive.

### A note on the profile photo

Use the **Select image** button (Media Library) whenever you can — those images
are served from an allowlisted host and get resized and optimized by the
frontend.

Pasting an external URL also works, but images on hosts the frontend does not
know about are shown as-is, at full weight and without optimization. That
allowlist lives in `lib/imageHosts.js` in the frontend repo; adding a host there
(and redeploying) makes photos from that host optimized too. A value that is not
a valid `http(s)` URL is ignored and the author gets the initials avatar.

### Editing an author

**Users → All Users → (author) → Edit**, section **"Author profile (Caribbean
Business)"**: pick a photo, set the job title, public email and LinkedIn. Fill
the bio in the core **Biographical Info** box further down the same screen.
Empty fields are simply not rendered on the site.

Author pages are statically regenerated every 60 seconds, so changes show up on
the next revalidation.
