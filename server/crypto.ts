import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const DEFAULT_SECRET = process.env.ENCRYPTION_SECRET || 'mikrotik_multirouter_master_key_2026_secure!';

// Derive a 32-byte key from the secret
function getKey(): Buffer {
  return crypto.createHash('sha256').update(DEFAULT_SECRET).digest();
}

export interface EncryptedPayload {
  encrypted: string;
  iv: string;
  tag: string;
}

/**
 * Encrypt a plaintext string using AES-256-GCM
 */
export function encryptPassword(plainText: string): EncryptedPayload {
  if (!plainText) {
    return { encrypted: '', iv: '', tag: '' };
  }
  const key = getKey();
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag
  };
}

/**
 * Decrypt an AES-256-GCM encrypted payload back to plaintext
 */
export function decryptPassword(encrypted: string, iv: string, tag: string): string {
  if (!encrypted || !iv || !tag) {
    return '';
  }
  try {
    const key = getKey();
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(iv, 'hex')
    );
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Failed to decrypt router password:', error);
    return '';
  }
}
