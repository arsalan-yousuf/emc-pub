import jwt from 'jsonwebtoken';

const METABASE_SITE_URL = process.env.METABASE_SITE_URL || "https://agile-bass.metabaseapp.com";
const METABASE_SECRET_KEY = process.env.METABASE_SECRET_KEY || "28b7fa0e6462c8cb7a371e2a6e34564b00a9cc0ee66ec53120f2c21738a32139";

/**
 * Generates a Metabase iframe URL for embedding a dashboard
 * @param dashboardId - The ID of the Metabase dashboard to embed
 * @param expirationMinutes - Optional expiration time in minutes (default: 10 minutes)
 * @returns The iframe URL with embedded JWT token
 */
export function generateMetabaseIframeUrl(dashboardId: number, expirationMinutes: number = 10): string {
  console.log("generateMetabaseIframeUrl dashboardId: ", dashboardId);
  const payload = {
    resource: { dashboard: dashboardId },
    params: {},
    exp: Math.round(Date.now() / 1000) + (expirationMinutes * 60) // expiration in seconds
  };

  const token = jwt.sign(payload, METABASE_SECRET_KEY);
  const iframeUrl = `${METABASE_SITE_URL}/embed/dashboard/${token}#bordered=true&titled=true`;
  console.log("generateMetabaseIframeUrl iframeUrl: ", iframeUrl);

  return iframeUrl;
}

