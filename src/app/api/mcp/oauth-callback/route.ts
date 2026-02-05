import { NextRequest, NextResponse } from 'next/server';
import { pkceStore } from '../oauth-authorize/route';
import { decodeState } from '@/lib/oauth-pkce';

export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        console.log(`[OAuth Callback] Received callback with state=${state?.substring(0, 20)}..., hasCode=${!!code}, error=${error}`);

        // Retrieve PKCE verifier - try stateless decode first, then fallback to memory
        let pkceData: { verifier: string; serverId: string } | undefined;
        
        if (state) {
            // Try to decode from encrypted state (serverless-compatible)
            const decodedState = decodeState(state);
            if (decodedState) {
                pkceData = { verifier: decodedState.verifier, serverId: decodedState.serverId };
                console.log(`[OAuth Callback] Decoded PKCE from state for serverId=${pkceData.serverId}`);
            } else {
                // Fallback to legacy in-memory store (for local dev)
                const stored = pkceStore.get(state);
                if (stored) {
                    pkceData = { verifier: stored.verifier, serverId: stored.serverId };
                    pkceStore.delete(state);
                    console.log(`[OAuth Callback] Found PKCE in memory for serverId=${pkceData.serverId}`);
                } else {
                    console.warn(`[OAuth Callback] No PKCE data found for state (neither decoded nor in memory)`);
                }
            }
        }

        // Return an HTML page that posts message to opener and closes
        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>OAuth Authorization</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container {
            text-align: center;
            padding: 2rem;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 1rem;
            backdrop-filter: blur(10px);
        }
        .spinner {
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-top: 3px solid white;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="spinner"></div>
        <h2>${error ? 'Authorization Failed' : 'Authorization Complete'}</h2>
        <p>${error ? 'An error occurred during authorization.' : 'Completing authorization...'}</p>
        <p id="closeMessage" style="display: none;">You can close this window.</p>
    </div>
    <script>
        (function() {
            const error = ${JSON.stringify(error)};
            const code = ${JSON.stringify(code)};
            const state = ${JSON.stringify(state)};
            const verifier = ${JSON.stringify(pkceData?.verifier)};
            const serverId = ${JSON.stringify(pkceData?.serverId)};

            // Show close message if no opener
            if (!error && !window.opener) {
                document.getElementById('closeMessage').style.display = 'block';
            }

            // Try to post message to opener
            if (window.opener && !window.opener.closed) {
                try {
                    window.opener.postMessage({
                        type: 'oauth-callback',
                        error,
                        code,
                        state,
                        verifier,
                        serverId
                    }, window.location.origin);
                    
                    // Close window after posting message
                    setTimeout(() => {
                        window.close();
                    }, 500);
                } catch (e) {
                    console.error('Failed to post message to opener:', e);
                    // Fallback: redirect to main page with params
                    if (!error && code && state && verifier && serverId) {
                        const redirectUrl = new URL('/settings/mcp', window.location.origin);
                        redirectUrl.searchParams.append('code', code);
                        redirectUrl.searchParams.append('state', state);
                        redirectUrl.searchParams.append('verifier', verifier);
                        redirectUrl.searchParams.append('serverId', serverId);
                        window.location.href = redirectUrl.toString();
                    } else if (error) {
                        window.location.href = '/settings/mcp?error=' + encodeURIComponent(error);
                    }
                }
            } else {
                // No opener - fallback to redirect
                if (error) {
                    window.location.href = '/settings/mcp?error=' + encodeURIComponent(error);
                } else if (!code || !state || !verifier || !serverId) {
                    window.location.href = '/settings/mcp?error=missing_parameters';
                } else {
                    const redirectUrl = new URL('/settings/mcp', window.location.origin);
                    redirectUrl.searchParams.append('code', code);
                    redirectUrl.searchParams.append('state', state);
                    redirectUrl.searchParams.append('verifier', verifier);
                    redirectUrl.searchParams.append('serverId', serverId);
                    window.location.href = redirectUrl.toString();
                }
            }
        })();
    </script>
</body>
</html>
        `;

        return new NextResponse(html, {
            headers: {
                'Content-Type': 'text/html',
            },
        });
    } catch (error: any) {
        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>OAuth Error</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background: #f44336;
            color: white;
        }
        .container {
            text-align: center;
            padding: 2rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <h2>Authorization Error</h2>
        <p>${error.message || 'An unexpected error occurred'}</p>
        <button onclick="window.close()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: white; color: #f44336; border: none; border-radius: 0.25rem; cursor: pointer;">Close</button>
    </div>
</body>
</html>
        `;

        return new NextResponse(html, {
            status: 500,
            headers: {
                'Content-Type': 'text/html',
            },
        });
    }
}
