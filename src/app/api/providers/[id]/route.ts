/**
 * Individual provider API endpoints
 * Handles operations on specific provider by ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { providerService } from '@/features/providers/services';
import type { Provider } from '@/features/providers/types';

/**
 * GET /api/providers/[id]
 * Get a specific provider by ID
 * 
 * @param req - Request object
 * @param params - Route parameters with provider ID
 * @returns Provider data
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Provider ID is required' },
        { status: 400 }
      );
    }

    // Placeholder - providers are currently stored client-side
    return NextResponse.json({
      message: 'Providers are currently managed client-side',
      id,
    });
  } catch (error: any) {
    console.error('Error fetching provider:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch provider' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/providers/[id]
 * Update a specific provider
 * 
 * @param req - Request with updated provider data
 * @param params - Route parameters with provider ID
 * @returns Updated provider
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updatedProvider: Provider = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Provider ID is required' },
        { status: 400 }
      );
    }

    if (updatedProvider.id !== id) {
      return NextResponse.json(
        { error: 'Provider ID mismatch' },
        { status: 400 }
      );
    }

    // Validate provider data
    const validation = providerService.validateProvider(updatedProvider);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    // Placeholder - providers are currently stored client-side
    return NextResponse.json(updatedProvider);
  } catch (error: any) {
    console.error('Error updating provider:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update provider' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/providers/[id]
 * Delete a specific provider
 * 
 * @param req - Request object
 * @param params - Route parameters with provider ID
 * @returns Success response
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Provider ID is required' },
        { status: 400 }
      );
    }

    // Placeholder - providers are currently stored client-side
    return NextResponse.json({
      success: true,
      message: 'Provider deleted',
      id,
    });
  } catch (error: any) {
    console.error('Error deleting provider:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete provider' },
      { status: 500 }
    );
  }
}
