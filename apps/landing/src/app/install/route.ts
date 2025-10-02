import { NextResponse } from "next/server";

export async function GET() {
  // Serve the install script from a stable release tag
  const installScriptUrl =
    "https://raw.githubusercontent.com/shunkakinoki/open-composer/main/install.sh";

  try {
    // Fetch the install script from GitHub with timeout
    const response = await fetch(installScriptUrl, {
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      return new NextResponse("Failed to fetch install script", {
        status: 500,
      });
    }

    const script = await response.text();

    // Return the script with appropriate headers
    return new NextResponse(script, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=300", // Cache for 5 minutes
      },
    });
  } catch {
    console.error("Error fetching install script");
    return new NextResponse("Error fetching install script", { status: 500 });
  }
}
