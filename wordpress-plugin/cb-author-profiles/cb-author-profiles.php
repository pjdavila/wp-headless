<?php
/**
 * Plugin Name:       CB Author Profiles
 * Description:       Adds photo, job title, public email and LinkedIn fields to WordPress user profiles and exposes them (together with the core biography) through WPGraphQL, so the Caribbean Business headless frontend can render real author profile pages.
 * Version:           1.0.0
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * Author:            Caribbean Business
 * License:           GPL-2.0-or-later
 * Text Domain:       cb-author-profiles
 *
 * @package CB_Author_Profiles
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'CB_AUTHOR_PROFILES_VERSION', '1.0.0' );

/**
 * Meta keys written by this plugin.
 *
 * @return array<string,string>
 */
function cb_author_profiles_meta_keys() {
	return array(
		'photo_id'     => 'cb_author_photo_id',
		'photo_url'    => 'cb_author_photo_url',
		'job_title'    => 'cb_author_job_title',
		'public_email' => 'cb_author_public_email',
		'linkedin'     => 'cb_author_linkedin',
	);
}

/**
 * Resolve the profile photo URL for a user.
 *
 * Prefers a media library attachment; falls back to a manually typed URL.
 *
 * @param int $user_id User ID.
 * @return string Photo URL or empty string.
 */
function cb_author_profiles_get_photo_url( $user_id ) {
	$attachment_id = (int) get_user_meta( $user_id, 'cb_author_photo_id', true );

	if ( $attachment_id > 0 ) {
		$url = wp_get_attachment_image_url( $attachment_id, 'full' );
		if ( $url ) {
			return $url;
		}
	}

	$url = (string) get_user_meta( $user_id, 'cb_author_photo_url', true );

	return '' !== trim( $url ) ? trim( $url ) : '';
}

/**
 * Normalize a LinkedIn value into a full profile URL.
 *
 * Accepts a full URL, a "linkedin.com/in/foo" fragment, or a bare handle.
 *
 * @param string $value Raw stored value.
 * @return string Normalized URL or empty string.
 */
function cb_author_profiles_normalize_linkedin( $value ) {
	$value = trim( (string) $value );

	if ( '' === $value ) {
		return '';
	}

	if ( preg_match( '#^https?://#i', $value ) ) {
		return esc_url_raw( $value );
	}

	if ( preg_match( '#^(www\.)?linkedin\.com/#i', $value ) ) {
		return esc_url_raw( 'https://' . ltrim( $value, '/' ) );
	}

	return esc_url_raw( 'https://www.linkedin.com/in/' . ltrim( $value, '/' ) );
}

/* -------------------------------------------------------------------------
 * Admin: user profile fields
 * ---------------------------------------------------------------------- */

/**
 * Render the extra profile fields on the user edit screen.
 *
 * @param WP_User $user The user being edited.
 * @return void
 */
function cb_author_profiles_render_fields( $user ) {
	if ( ! current_user_can( 'edit_user', $user->ID ) ) {
		return;
	}

	$photo_id   = (int) get_user_meta( $user->ID, 'cb_author_photo_id', true );
	$photo_url  = (string) get_user_meta( $user->ID, 'cb_author_photo_url', true );
	$preview    = cb_author_profiles_get_photo_url( $user->ID );
	$job_title  = (string) get_user_meta( $user->ID, 'cb_author_job_title', true );
	$pub_email  = (string) get_user_meta( $user->ID, 'cb_author_public_email', true );
	$linkedin   = (string) get_user_meta( $user->ID, 'cb_author_linkedin', true );
	?>
	<h2 id="cb-author-profile"><?php esc_html_e( 'Author profile (Caribbean Business)', 'cb-author-profiles' ); ?></h2>
	<p class="description">
		<?php esc_html_e( 'These fields power the public author page on caribbean.business. Leave any field empty to hide it on the site. The biography shown on the profile page is the core "Biographical Info" field below.', 'cb-author-profiles' ); ?>
	</p>
	<?php wp_nonce_field( 'cb_author_profiles_save', 'cb_author_profiles_nonce' ); ?>
	<table class="form-table" role="presentation">
		<tr>
			<th><label for="cb_author_photo_url"><?php esc_html_e( 'Profile photo', 'cb-author-profiles' ); ?></label></th>
			<td>
				<div id="cb-author-photo-preview" style="margin-bottom:10px;">
					<?php if ( $preview ) : ?>
						<img src="<?php echo esc_url( $preview ); ?>" alt="" style="max-width:120px;height:auto;border-radius:6px;" />
					<?php endif; ?>
				</div>
				<input type="hidden" id="cb_author_photo_id" name="cb_author_photo_id" value="<?php echo esc_attr( $photo_id ? (string) $photo_id : '' ); ?>" />
				<input type="url" id="cb_author_photo_url" name="cb_author_photo_url" value="<?php echo esc_attr( $photo_url ); ?>" class="regular-text" placeholder="https://…" />
				<p>
					<button type="button" class="button" id="cb-author-photo-select"><?php esc_html_e( 'Select from Media Library', 'cb-author-profiles' ); ?></button>
					<button type="button" class="button" id="cb-author-photo-remove"><?php esc_html_e( 'Remove photo', 'cb-author-profiles' ); ?></button>
				</p>
				<p class="description"><?php esc_html_e( 'Pick an image from the Media Library, or paste an external image URL. A square photo of at least 400×400px works best.', 'cb-author-profiles' ); ?></p>
			</td>
		</tr>
		<tr>
			<th><label for="cb_author_job_title"><?php esc_html_e( 'Job title', 'cb-author-profiles' ); ?></label></th>
			<td>
				<input type="text" id="cb_author_job_title" name="cb_author_job_title" value="<?php echo esc_attr( $job_title ); ?>" class="regular-text" />
				<p class="description"><?php esc_html_e( 'For example: Senior Reporter, Editor-in-Chief.', 'cb-author-profiles' ); ?></p>
			</td>
		</tr>
		<tr>
			<th><label for="cb_author_public_email"><?php esc_html_e( 'Public email', 'cb-author-profiles' ); ?></label></th>
			<td>
				<input type="email" id="cb_author_public_email" name="cb_author_public_email" value="<?php echo esc_attr( $pub_email ); ?>" class="regular-text" />
				<p class="description"><?php esc_html_e( 'Shown publicly on the author page. Leave empty to hide it. This is separate from the account email above.', 'cb-author-profiles' ); ?></p>
			</td>
		</tr>
		<tr>
			<th><label for="cb_author_linkedin"><?php esc_html_e( 'LinkedIn', 'cb-author-profiles' ); ?></label></th>
			<td>
				<input type="text" id="cb_author_linkedin" name="cb_author_linkedin" value="<?php echo esc_attr( $linkedin ); ?>" class="regular-text" placeholder="https://www.linkedin.com/in/username" />
				<p class="description"><?php esc_html_e( 'Full profile URL or just the username.', 'cb-author-profiles' ); ?></p>
			</td>
		</tr>
	</table>
	<?php
}
add_action( 'show_user_profile', 'cb_author_profiles_render_fields' );
add_action( 'edit_user_profile', 'cb_author_profiles_render_fields' );

/**
 * Persist the extra profile fields.
 *
 * @param int $user_id User being saved.
 * @return void
 */
function cb_author_profiles_save_fields( $user_id ) {
	if ( ! current_user_can( 'edit_user', $user_id ) ) {
		return;
	}

	$nonce = isset( $_POST['cb_author_profiles_nonce'] )
		? sanitize_text_field( wp_unslash( $_POST['cb_author_profiles_nonce'] ) )
		: '';

	if ( ! wp_verify_nonce( $nonce, 'cb_author_profiles_save' ) ) {
		return;
	}

	$photo_id = isset( $_POST['cb_author_photo_id'] ) ? absint( wp_unslash( $_POST['cb_author_photo_id'] ) ) : 0;
	if ( $photo_id > 0 ) {
		update_user_meta( $user_id, 'cb_author_photo_id', $photo_id );
	} else {
		delete_user_meta( $user_id, 'cb_author_photo_id' );
	}

	$photo_url = isset( $_POST['cb_author_photo_url'] )
		? esc_url_raw( trim( wp_unslash( $_POST['cb_author_photo_url'] ) ) )
		: '';
	if ( '' !== $photo_url ) {
		update_user_meta( $user_id, 'cb_author_photo_url', $photo_url );
	} else {
		delete_user_meta( $user_id, 'cb_author_photo_url' );
	}

	$job_title = isset( $_POST['cb_author_job_title'] )
		? sanitize_text_field( wp_unslash( $_POST['cb_author_job_title'] ) )
		: '';
	if ( '' !== $job_title ) {
		update_user_meta( $user_id, 'cb_author_job_title', $job_title );
	} else {
		delete_user_meta( $user_id, 'cb_author_job_title' );
	}

	$public_email = isset( $_POST['cb_author_public_email'] )
		? sanitize_email( wp_unslash( $_POST['cb_author_public_email'] ) )
		: '';
	if ( '' !== $public_email && is_email( $public_email ) ) {
		update_user_meta( $user_id, 'cb_author_public_email', $public_email );
	} else {
		delete_user_meta( $user_id, 'cb_author_public_email' );
	}

	$linkedin = isset( $_POST['cb_author_linkedin'] )
		? cb_author_profiles_normalize_linkedin( wp_unslash( $_POST['cb_author_linkedin'] ) )
		: '';
	if ( '' !== $linkedin ) {
		update_user_meta( $user_id, 'cb_author_linkedin', $linkedin );
	} else {
		delete_user_meta( $user_id, 'cb_author_linkedin' );
	}
}
add_action( 'personal_options_update', 'cb_author_profiles_save_fields' );
add_action( 'edit_user_profile_update', 'cb_author_profiles_save_fields' );

/**
 * Load the media library picker on the user profile screens.
 *
 * @param string $hook Current admin page.
 * @return void
 */
function cb_author_profiles_admin_assets( $hook ) {
	if ( 'profile.php' !== $hook && 'user-edit.php' !== $hook ) {
		return;
	}

	wp_enqueue_media();
	add_action( 'admin_print_footer_scripts', 'cb_author_profiles_admin_script' );
}
add_action( 'admin_enqueue_scripts', 'cb_author_profiles_admin_assets' );

/**
 * Inline script wiring the media library picker to the photo fields.
 *
 * @return void
 */
function cb_author_profiles_admin_script() {
	?>
	<script>
	(function () {
		var selectBtn = document.getElementById('cb-author-photo-select');
		var removeBtn = document.getElementById('cb-author-photo-remove');
		var idInput = document.getElementById('cb_author_photo_id');
		var urlInput = document.getElementById('cb_author_photo_url');
		var preview = document.getElementById('cb-author-photo-preview');

		if (!selectBtn || !idInput || !urlInput || !preview) {
			return;
		}

		function renderPreview(src) {
			preview.innerHTML = '';
			if (!src) {
				return;
			}
			var img = document.createElement('img');
			img.src = src;
			img.alt = '';
			img.style.maxWidth = '120px';
			img.style.height = 'auto';
			img.style.borderRadius = '6px';
			preview.appendChild(img);
		}

		var frame;
		selectBtn.addEventListener('click', function (event) {
			event.preventDefault();

			if (!window.wp || !window.wp.media) {
				return;
			}

			if (!frame) {
				frame = window.wp.media({
					title: <?php echo wp_json_encode( __( 'Select author photo', 'cb-author-profiles' ) ); ?>,
					button: { text: <?php echo wp_json_encode( __( 'Use this photo', 'cb-author-profiles' ) ); ?> },
					library: { type: 'image' },
					multiple: false
				});

				frame.on('select', function () {
					var attachment = frame.state().get('selection').first().toJSON();
					idInput.value = attachment.id;
					urlInput.value = '';
					renderPreview(attachment.url);
				});
			}

			frame.open();
		});

		if (removeBtn) {
			removeBtn.addEventListener('click', function (event) {
				event.preventDefault();
				idInput.value = '';
				urlInput.value = '';
				renderPreview('');
			});
		}

		urlInput.addEventListener('change', function () {
			if (urlInput.value) {
				idInput.value = '';
				renderPreview(urlInput.value);
			}
		});
	})();
	</script>
	<?php
}

/* -------------------------------------------------------------------------
 * WPGraphQL
 * ---------------------------------------------------------------------- */

/**
 * Expose the author profile fields on the User type.
 *
 * The whole group is returned as a single `cbAuthorProfile` field so the
 * frontend only has to probe for one field to know whether this plugin is
 * installed.
 *
 * @return void
 */
function cb_author_profiles_register_graphql() {
	if ( ! function_exists( 'register_graphql_object_type' ) || ! function_exists( 'register_graphql_field' ) ) {
		return;
	}

	register_graphql_object_type(
		'CBAuthorProfile',
		array(
			'description' => __( 'Public author profile details managed in the WordPress user profile.', 'cb-author-profiles' ),
			'fields'      => array(
				'photoUrl'     => array(
					'type'        => 'String',
					'description' => __( 'URL of the author profile photo, or null when none is set.', 'cb-author-profiles' ),
				),
				'jobTitle'     => array(
					'type'        => 'String',
					'description' => __( 'Job title or role, e.g. "Senior Reporter".', 'cb-author-profiles' ),
				),
				'publicEmail'  => array(
					'type'        => 'String',
					'description' => __( 'Email address the author is happy to publish.', 'cb-author-profiles' ),
				),
				'linkedinUrl'  => array(
					'type'        => 'String',
					'description' => __( 'Full LinkedIn profile URL.', 'cb-author-profiles' ),
				),
			),
		)
	);

	register_graphql_field(
		'User',
		'cbAuthorProfile',
		array(
			'type'        => 'CBAuthorProfile',
			'description' => __( 'Public author profile details (photo, job title, public email, LinkedIn).', 'cb-author-profiles' ),
			'resolve'     => function ( $user ) {
				$user_id = isset( $user->databaseId ) ? (int) $user->databaseId : 0;

				if ( $user_id <= 0 ) {
					return null;
				}

				$photo        = cb_author_profiles_get_photo_url( $user_id );
				$job_title    = (string) get_user_meta( $user_id, 'cb_author_job_title', true );
				$public_email = (string) get_user_meta( $user_id, 'cb_author_public_email', true );
				$linkedin     = (string) get_user_meta( $user_id, 'cb_author_linkedin', true );

				return array(
					'photoUrl'    => '' !== $photo ? $photo : null,
					'jobTitle'    => '' !== $job_title ? $job_title : null,
					'publicEmail' => '' !== $public_email ? $public_email : null,
					'linkedinUrl' => '' !== $linkedin ? $linkedin : null,
				);
			},
		)
	);
}
add_action( 'graphql_register_types', 'cb_author_profiles_register_graphql' );
