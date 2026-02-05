
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { model, apiKey, body } = await req.json();

        if (!model || !apiKey || !body) {
            return NextResponse.json({ error: 'Missing model, apiKey, or body' }, { status: 400 });
        }

        const baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
        const url = `${baseUrl}/models/${model}:streamGenerateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json({ error: `Google API Error: ${response.status} ${errorText}` }, { status: response.status });
        }

        // Stream the response back to the client
        const stream = new ReadableStream({
            async start(controller) {
                if (!response.body) {
                    controller.close();
                    return;
                }
                const reader = response.body.getReader();
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        controller.close();
                        break;
                    }
                    controller.enqueue(value);
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
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
