import jwt from 'jsonwebtoken';

// Environment variable validation
const METABASE_SITE_URL = process.env.METABASE_SITE_URL;
const METABASE_SECRET_KEY = process.env.METABASE_SECRET_KEY;

if (!METABASE_SITE_URL) {
  console.warn("METABASE_SITE_URL environment variable is not set. Using default value.");
}

if (!METABASE_SECRET_KEY) {
  console.warn("METABASE_SECRET_KEY environment variable is not set. Using default value.");
}

// Fallback values (should be removed in production)
const DEFAULT_SITE_URL = "https://agile-bass.metabaseapp.com";

const siteUrl = METABASE_SITE_URL || DEFAULT_SITE_URL;
const secretKey = METABASE_SECRET_KEY || '';

/**
 * Generates a Metabase iframe URL for embedding a dashboard
 * @param dashboardId - The ID of the Metabase dashboard to embed
 * @param expirationMinutes - Optional expiration time in minutes (default: 20 minutes)
 * @returns The iframe URL with embedded JWT token
 * @throws Error if dashboardId is invalid or JWT signing fails
 */
export function generateMetabaseIframeUrl(
  dashboardId: number, 
  expirationMinutes: number = 20
): string {
  if (!dashboardId || dashboardId <= 0) {
    throw new Error("Invalid dashboard ID");
  }

  if (expirationMinutes <= 0) {
    throw new Error("Expiration minutes must be greater than 0");
  }

  try {
    const payload = {
      resource: { dashboard: dashboardId },
      params: {},
      exp: Math.round(Date.now() / 1000) + (expirationMinutes * 60), // expiration in seconds
    };

    const token = jwt.sign(payload, secretKey);
    const iframeUrl = `${siteUrl}/embed/dashboard/${token}#bordered=true&titled=true`;

    return iframeUrl;
  } catch (error) {
    console.error("Error generating Metabase iframe URL:", error);
    throw new Error("Failed to generate dashboard URL");
  }
}

