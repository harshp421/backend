import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import {
  RegisterBodySchema,
  LoginBodySchema,
  AuthResponseSchema,
} from './auth.types.js';

export function registerAuthDocs(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: 'post',
    path: '/auth/register',
    tags: ['Auth'],
    summary: 'Register a new user (farmer | platform | org)',
    request: {
      body: {
        content: { 'application/json': { schema: RegisterBodySchema } },
      },
    },
    responses: {
      201: {
        description: 'User created; returns user + JWT',
        content: { 'application/json': { schema: AuthResponseSchema } },
      },
      400: { description: 'Validation error' },
      409: { description: 'Email already registered' },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/auth/login',
    tags: ['Auth'],
    summary: 'Exchange credentials for a JWT',
    request: {
      body: {
        content: { 'application/json': { schema: LoginBodySchema } },
      },
    },
    responses: {
      200: {
        description: 'Authenticated; returns user + JWT',
        content: { 'application/json': { schema: AuthResponseSchema } },
      },
      400: { description: 'Validation error' },
      401: { description: 'Invalid credentials' },
    },
  });
}
