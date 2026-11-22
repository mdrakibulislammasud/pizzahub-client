import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const baseUrl =
      process.env.API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://127.0.0.1:5000";

    const url = new URL(
      `${baseUrl.replace(/\/+$/, "")}/api/menu`
    );

    if (url.hostname === "localhost") {
      url.hostname = "127.0.0.1";
    }

    url.search = request.nextUrl.search;

    const response = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Menu API proxy error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to connect to the PizzaHub backend.",
        data: [],
      },
      { status: 502 }
    );
  }
}