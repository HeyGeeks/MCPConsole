/**
 * Provider management API endpoints
 * Handles CRUD operations for AI provider configurations
 */

import { NextRequest, NextResponse } from 'next/server';
import { providerService } from '@/features/providers/services';
import type { ProviderInput } from '@/features/providers/types';

/**
 * GET /api/providers
 * List all providers
 * 
 * Note: Currently providers are stored client-side in localStorage.
 * This endpoint is a placeholder for future server-side storage.
 * 
 * @returns List of providers
 */
export async function GET() {
  try {
    // Placeholder - providers are currently stored client-side
    // In the future, this would fetch from a database
    return NextResponse.json({
      message: 'Providers are currently managed client-side',
      providers: [],
    });
  } catch (error: any) {
    console.error('Error listing providers:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list providers' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/providers
 * Create a new provider
 * 
 * @param req - Request with provider data
 * @returns Created provider with generated ID
 */
export async function POST(req: NextRequest) {
  try {
    const input: ProviderInput = await req.json();

    // Validate provider data
    const validation = providerService.validateProvider(input);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    // Create provider with generated ID
    const provider = providerService.createProvider(input);

    return NextResponse.json(provider, { status: 201 });
  } catch (error: any) {
    console.error('Error creating provider:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create provider' },
      { status: 500 }
    );
  }
}
