const GITHUB_REPO = "mdbaldwin1/carvd-studio";

type Platform = "macos" | "windows";

function getPlatformFromUrl(url: URL): Platform | null {
  const platform = url.searchParams.get("platform");
  if (platform === "macos" || platform === "windows") {
    return platform;
  }
  return null;
}

export const config = {
  runtime: "edge",
};

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const platform = getPlatformFromUrl(url);
  const source = url.searchParams.get("source") ?? "unknown";

  if (!platform) {
    return Response.json(
      { error: "Missing or invalid platform. Use ?platform=macos|windows" },
      {
        status: 400,
        headers: {
          "X-Robots-Tag": "noindex, nofollow, noarchive",
        },
      },
    );
  }

  try {
    const releaseRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      {
        headers: {
          Accept: "application/vnd.github+json",
        },
      },
    );

    if (!releaseRes.ok) {
      throw new Error(
        `GitHub latest release request failed: ${releaseRes.status}`,
      );
    }

    const releaseData = (await releaseRes.json()) as {
      tag_name?: string;
      assets?: Array<{ name?: string; browser_download_url?: string }>;
    };

    const assets = releaseData.assets ?? [];
    const matcher =
      platform === "macos"
        ? (assetName: string) => assetName.endsWith("-arm64.dmg")
        : (assetName: string) => assetName.endsWith(".exe");

    const asset = assets.find(
      (a) => typeof a.name === "string" && matcher(a.name),
    );

    const fallbackReleaseUrl = `https://github.com/${GITHUB_REPO}/releases/latest`;
    const destination = asset?.browser_download_url || fallbackReleaseUrl;

    console.log(
      JSON.stringify({
        event: "download_redirect",
        platform,
        source,
        destination,
        userAgent: request.headers.get("user-agent"),
        referer: request.headers.get("referer"),
        timestamp: new Date().toISOString(),
        releaseTag: releaseData.tag_name ?? "unknown",
      }),
    );

    return new Response(null, {
      status: 302,
      headers: {
        Location: destination,
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    });
  } catch (error) {
    console.error("download_redirect_failed", {
      platform,
      source,
      error: error instanceof Error ? error.message : "unknown_error",
    });

    return new Response(null, {
      status: 302,
      headers: {
        Location: `https://github.com/${GITHUB_REPO}/releases/latest`,
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    });
  }
}
