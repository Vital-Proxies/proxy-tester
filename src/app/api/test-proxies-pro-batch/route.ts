import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { proxies, options, concurrencyLimit = 10 } = body;

    if (!Array.isArray(proxies) || !options) {
      return NextResponse.json(
        { error: "Invalid request format" },
        { status: 400 }
      );
    }

    // Create ReadableStream for Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await fetch("http://127.0.0.1:3001/test-proxies-pro-batch", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ proxies, options, concurrencyLimit }),
          });

          if (!response.ok) {
            throw new Error(`Server response: ${response.status}`);
          }

          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error("No response body reader available");
          }

          const decoder = new TextDecoder();

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value);
              controller.enqueue(new TextEncoder().encode(chunk));
            }
          } finally {
            reader.releaseLock();
            controller.close();
          }
        } catch (error) {
          console.error("Pro Mode batch API error:", error);
          const errorData = `data: ${JSON.stringify({ 
            error: "Batch test failed",
            message: error instanceof Error ? error.message : "Unknown error"
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(errorData));
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Pro Mode batch API error:", error);
    return NextResponse.json(
      { 
        error: "Failed to start batch test",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
