import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  // Only used for uploading source maps to Sentry, which we're skipping for
  // now (keeps setup simple, no auth token needed) - stack traces will just
  // point at minified code until this is revisited.
  silent: true,
});
