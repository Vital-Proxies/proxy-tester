import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { proxy, options } = body;

    if (!proxy || !options) {
      return NextResponse.json(
        { error: "Missing required fields: proxy and options" },
        { status: 400 }
      );
    }

    // Forward to the Express server
    const response = await fetch("http://127.0.0.1:3001/test-proxy-pro", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ proxy, options }),
    });

    if (!response.ok) {
      throw new Error(`Server response: ${response.status}`);
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Pro Mode API error:", error);
    return NextResponse.json(
      { 
        error: "Failed to test proxy in Pro Mode",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
