import type { NextConfig } from "next";
import { FREE_COURSE_BASE_PATH, LEGACY_FREE_COURSE_BASE_PATH } from "./src/lib/freeCourseAccess";

const nextConfig: NextConfig = {
  redirects() {
    return [
      // Group links already shared under the old path keep working; the page still checks the code.
      {
        source: `${LEGACY_FREE_COURSE_BASE_PATH}/:code`,
        destination: `${FREE_COURSE_BASE_PATH}/:code`,
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
