/* Our Journey — Google Drive bridge configuration
 *
 * The Google Client ID is public and safe to ship in a browser app.
 * The Cloudflare Worker URL is the only value you need to replace here.
 * NEVER place the Google OAuth Client Secret in this file.
 */
window.OUR_JOURNEY_CONFIG = Object.freeze({
  GOOGLE_CLIENT_ID: "352730696085-iq5q2o0uct9c44n96mfdvp9dmhjmq94o.apps.googleusercontent.com",
  DRIVE_API_BASE: "https://our-journey-drive-api.myintmoehein0115024.workers.dev"
});
