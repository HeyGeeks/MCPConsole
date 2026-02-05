/**
 * Google AI chat proxy endpoint
 * Proxies streaming requests to Google's Generative Language API
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/chat/google
 * Proxy streaming chat requests to Google AI
 * 
 * @param req - Request with model, apiKey, and body
 * @returns Streaming response from Google AI
 */
export async function POST(req: NextRequest) {
  try {
    const { model, apiKey, body } = await req.json();

    // Validate required parameters
    if (!model || !apiKey || !body) {
      return NextResponse.json(
        { error: 'Missing required parameters: model, apiKey, or body' },
        { status: 400 }
      );
    }

    // Build Google AI API URL
    const baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    const url = `${baseUrl}/models/${model}:streamGenerateContent?key=${apiKey}`;

    // Forward request to Google AI
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // Handle API errors
    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Google API Error: ${response.status} ${errorText}` },
        { status: response.status }
      );
    }

    // Stream the response back to the client
    const stream = new ReadableStream({
      async start(controller) {
        if (!response.body) {
          controller.close();
          return;
        }

        const reader = response.body.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
              break;
            }
            controller.enqueue(value);
          }
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    console.error('Google Proxy Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
