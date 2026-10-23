import { NextResponse } from 'next/server';
import { UserRole } from '../types';
import { dbRepository } from '../db/storageAdapter';

export interface AuthContext {
  userId: string;
  role: UserRole;
  organizationId?: string;
  email: string;
}

export class Security {
  /**
   * Resolves authentication context from request headers or demo user switcher
   */
  static getAuthContext(request: Request): AuthContext {
    // In production with Firebase Auth, verify Bearer token in 'authorization' header
    // In local demo / development, read x-user-id or x-role headers, defaulting to Elena Rostova (Coordinator)
    const headerUserId = request.headers.get('x-user-id');
    const headerRole = request.headers.get('x-user-role') as UserRole | null;

    if (headerUserId) {
      const user = dbRepository.getUserById(headerUserId);
      if (user) {
        return {
          userId: user.id,
          role: user.role,
          organizationId: user.organizationId,
          email: user.email,
        };
      }
    }

    if (headerRole) {
      const user = dbRepository.listUsers().find(u => u.role === headerRole);
      if (user) {
        return {
          userId: user.id,
          role: user.role,
          organizationId: user.organizationId,
          email: user.email,
        };
      }
    }

    // Default demo session fallback: Elena Rostova (COORDINATOR)
    const defaultUser = dbRepository.getUserById('user_coordinator_1')!;
    return {
      userId: defaultUser.id,
      role: defaultUser.role,
      organizationId: defaultUser.organizationId,
      email: defaultUser.email,
    };
  }

  /**
   * Asserts that the authenticated actor has one of the required roles
   */
  static assertRole(auth: AuthContext, allowedRoles: UserRole[]): void {
    if (!allowedRoles.includes(auth.role)) {
      throw new Error(`Unauthorized: Role '${auth.role}' is not permitted to perform this operation. Allowed: ${allowedRoles.join(', ')}`);
    }
  }

  /**
   * Generates a safe API error response without leaking stack traces or internal secrets
   */
  static errorResponse(err: unknown, statusCode = 400) {
    const message = err instanceof Error ? err.message : 'An unexpected server error occurred';
    return NextResponse.json(
      {
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
      },
      { status: statusCode }
    );
  }
}
