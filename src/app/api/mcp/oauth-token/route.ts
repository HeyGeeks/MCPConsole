import { NextRequest, NextResponse } from 'next/server';
import { getEnvConfig } from '@/shared/config/env';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { tokenUrl, code, verifier, clientId, clientSecret, redirectUri } = body;

        console.log('[oauth-token] Token exchange request:', {
            tokenUrl,
            hasCode: !!code,
            hasVerifier: !!verifier,
            clientId,
            hasClientSecret: !!clientSecret,
            redirectUri
        });

        if (!tokenUrl || !code || !clientId) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        const { appUrl } = getEnvConfig();
        console.log('[oauth-token] App URL from config:', appUrl);
        
        const fallbackOrigin = req.headers.get('origin') || appUrl;
        const resolvedRedirect = redirectUri || `${fallbackOrigin}/api/mcp/oauth-callback`;
        
        console.log('[oauth-token] Using redirect URI:', resolvedRedirect);

        // For PKCE flow (public clients), don't send client_secret
        // Only use client_secret if explicitly provided AND no PKCE verifier
        const isPublicClient = !!verifier && !clientSecret;

        // Exchange authorization code for access token
        const params = new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            client_id: clientId,
            redirect_uri: resolvedRedirect,
        });

        // Add PKCE verifier if provided
        if (verifier) {
            params.append('code_verifier', verifier);
        }

        // Set up headers
        const headers: Record<string, string> = {
            'Content-Type': 'application/x-www-form-urlencoded',
        };

        // For public clients with PKCE, don't add any client authentication
        // For confidential clients, try Basic auth first
        if (clientSecret && !isPublicClient) {
            const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
            headers['Authorization'] = `Basic ${credentials}`;
            console.log('[oauth-token] Using Basic auth for confidential client');
        } else {
            console.log('[oauth-token] Public client with PKCE - no client authentication');
        }

        console.log('[oauth-token] Sending token request to:', tokenUrl);
        let response = await fetch(tokenUrl, {
            method: 'POST',
            headers,
            body: params.toString(),
        });

        let responseText = '';
        
        // If Basic auth failed and we have client_secret, try with client_secret in body
        if (!response.ok && clientSecret) {
            responseText = await response.text();
            console.log('[oauth-token] First attempt failed:', response.status, responseText);
            
            // Check if it's a client authentication error - try body method
            if (response.status === 401 || responseText.includes('invalid_client')) {
                console.log('[oauth-token] Trying client_secret in body');
                
                params.append('client_secret', clientSecret);
                
                response = await fetch(tokenUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: params.toString(),
                });
                
                if (!response.ok) {
                    responseText = await response.text();
                    console.log('[oauth-token] Second attempt failed:', response.status, responseText);
                }
            }
        }

        if (!response.ok) {
            if (!responseText) {
                responseText = await response.text();
            }
            console.error('[oauth-token] Token exchange failed:', response.status, responseText);
            throw new Error(`Token exchange failed: ${response.status} - ${responseText}`);
        }

        const tokenData = await response.json();
        console.log('[oauth-token] Token exchange successful');

        return NextResponse.json({
            access_token: tokenData.access_token,
            token_type: tokenData.token_type || 'Bearer',
            expires_in: tokenData.expires_in || 3600,
            refresh_token: tokenData.refresh_token,
            scope: tokenData.scope
        });
    } catch (error: any) {
        console.error('[oauth-token] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
