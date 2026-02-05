/**
 * Provider validation endpoint
 * Validates provider configuration without saving
 */

import { NextRequest, NextResponse } from 'next/server';
import { providerService } from '@/features/providers/services';
import type { ProviderInput } from '@/features/providers/types';

/**
 * POST /api/providers/validate
 * Validate provider configuration
 * 
 * @param req - Request with provider data to validate
 * @returns Validation result
 */
export async function POST(req: NextRequest) {
  try {
    const input: ProviderInput = await req.json();

    // Validate provider data
    const validation = providerService.validateProvider(input);

    return NextResponse.json({
      valid: validation.valid,
      errors: validation.errors,
    });
  } catch (error: any) {
    console.error('Error validating provider:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to validate provider' },
      { status: 500 }
    );
  }
}
