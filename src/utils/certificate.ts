import { randomUUID } from 'node:crypto';

// Human-readable certificate IDs: CERT-YYYYMMDD-XXXXXXXX
export function generateCertificateId(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
  return `CERT-${date}-${rand}`;
}
