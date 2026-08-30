import net from 'net';
import tls from 'tls';
import crypto from 'crypto';

export interface RouterOSResponse {
  type: '!re' | '!done' | '!trap' | '!fatal';
  attributes: Record<string, string>;
  message?: string;
}

export interface RouterOSConnectionOptions {
  host: string;
  port: number;
  useSsl: boolean;
  username: string;
  password?: string;
  timeoutMs?: number;
}

/**
 * Pure Node.js implementation of the MikroTik RouterOS API protocol
 * Supports:
 * - API (8728) & API-SSL (8729)
 * - RouterOS v6 MD5 challenge-response & RouterOS v7 plaintext /login
 * - Length encoding (1, 2, 3, 4, and 5 byte formats)
 * - Sentence parsing & trap/error diagnostics
 */
export class MikroTikClient {
  private socket: net.Socket | tls.TLSSocket | null = null;
  private options: RouterOSConnectionOptions;
  private buffer: Buffer = Buffer.alloc(0);
  private connected = false;
  private loggedIn = false;

  constructor(options: RouterOSConnectionOptions) {
    this.options = {
      timeoutMs: 5000,
      ...options
    };
  }

  public async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      let isSettled = false;
      const timer = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          this.close();
          const err = new Error(
            `Connection timeout. Unable to reach ${this.options.host}:${this.options.port} (${this.options.useSsl ? 'API-SSL' : 'API'}). Verify firewall rules and IP reachability.`
          );
          (err as any).code = 'ETIMEDOUT';
          reject(err);
        }
      }, this.options.timeoutMs);

      const onConnect = () => {
        this.connected = true;
        this.socket?.on('data', (chunk) => this.onData(chunk));
        
        // Authenticate with RouterOS
        this.login()
          .then(() => {
            if (!isSettled) {
              isSettled = true;
              clearTimeout(timer);
              resolve();
            }
          })
          .catch((loginErr) => {
            if (!isSettled) {
              isSettled = true;
              clearTimeout(timer);
              this.close();
              reject(loginErr);
            }
          });
      };

      const onError = (err: Error) => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timer);
          this.close();
          reject(err);
        }
      };

      try {
        if (this.options.useSsl) {
          this.socket = tls.connect(
            {
              host: this.options.host,
              port: this.options.port,
              rejectUnauthorized: false // Allow self-signed RouterOS SSL certificates
            },
            onConnect
          );
        } else {
          this.socket = net.connect(
            {
              host: this.options.host,
              port: this.options.port
            },
            onConnect
          );
        }

        this.socket.on('error', onError);
        this.socket.on('close', () => {
          this.connected = false;
          this.loggedIn = false;
        });
      } catch (err: any) {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timer);
          reject(err);
        }
      }
    });
  }

  private onData(chunk: Buffer) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
  }

  /**
   * RouterOS Login workflow:
   * 1. Try v7 /login with name and password in first sentence
   * 2. If challenge returned (v6), compute MD5 challenge hash and send response
   */
  private async login(): Promise<void> {
    const user = this.options.username || 'admin';
    const pass = this.options.password || '';

    // Attempt v7 direct login
    const resp = await this.writeSentence(['/login', `=name=${user}`, `=password=${pass}`]);

    if (resp.some((r) => r.type === '!trap')) {
      const trap = resp.find((r) => r.type === '!trap');
      throw new Error(trap?.message || trap?.attributes?.message || 'Authentication failed: Invalid username or password.');
    }

    const done = resp.find((r) => r.type === '!done');
    if (done && done.attributes && done.attributes.ret) {
      // RouterOS v6 Challenge-Response required
      const challengeHex = done.attributes.ret;
      const challengeBuf = Buffer.from(challengeHex, 'hex');
      const zeroBuf = Buffer.alloc(1, 0);
      const passBuf = Buffer.from(pass, 'utf8');

      // Hash: MD5(0x00 + password + challenge)
      const md5 = crypto.createHash('md5');
      md5.update(zeroBuf);
      md5.update(passBuf);
      md5.update(challengeBuf);
      const digestHex = '00' + md5.digest('hex');

      const v6Resp = await this.writeSentence(['/login', `=name=${user}`, `=response=${digestHex}`]);
      if (v6Resp.some((r) => r.type === '!trap')) {
        const trap = v6Resp.find((r) => r.type === '!trap');
        throw new Error(trap?.message || trap?.attributes?.message || 'Authentication failed on RouterOS v6 challenge.');
      }
    }

    this.loggedIn = true;
  }

  /**
   * Send a sentence of words to RouterOS and await the response sentence array
   */
  public async writeSentence(words: string[]): Promise<RouterOSResponse[]> {
    if (!this.socket || (!this.connected && !words[0]?.startsWith('/login'))) {
      throw new Error('RouterOS socket not connected.');
    }

    // Encode each word with length prefix
    const buffers: Buffer[] = [];
    for (const word of words) {
      const wordBuf = Buffer.from(word, 'utf8');
      const lenBuf = this.encodeLength(wordBuf.length);
      buffers.push(lenBuf, wordBuf);
    }
    // End of sentence empty word
    buffers.push(Buffer.alloc(1, 0));

    const payload = Buffer.concat(buffers);
    this.socket.write(payload);

    return this.readSentenceResponse();
  }

  /**
   * Read incoming sentence stream until !done, !trap, or !fatal
   */
  private async readSentenceResponse(): Promise<RouterOSResponse[]> {
    const responses: RouterOSResponse[] = [];
    let currentAttrs: Record<string, string> = {};
    let currentType: '!re' | '!done' | '!trap' | '!fatal' = '!done';

    while (true) {
      const word = await this.readWord();
      if (word === null) {
        // Socket closed or EOF
        break;
      }

      if (word === '') {
        // End of sentence
        if (currentType) {
          responses.push({
            type: currentType,
            attributes: currentAttrs,
            message: currentAttrs.message || currentAttrs['=message']
          });
        }
        if (currentType === '!done' || currentType === '!trap' || currentType === '!fatal') {
          break;
        }
        currentAttrs = {};
        continue;
      }

      if (word.startsWith('!')) {
        currentType = word as any;
      } else if (word.startsWith('=')) {
        const eqIdx = word.indexOf('=', 1);
        if (eqIdx !== -1) {
          const key = word.substring(1, eqIdx);
          const val = word.substring(eqIdx + 1);
          currentAttrs[key] = val;
        } else {
          currentAttrs[word.substring(1)] = '';
        }
      }
    }

    return responses;
  }

  private async readWord(): Promise<string | null> {
    while (true) {
      if (this.buffer.length === 0) {
        if (!this.connected) return null;
        await new Promise((r) => setTimeout(r, 10));
        continue;
      }

      // Check if we have enough bytes for length prefix
      const lenResult = this.decodeLength(this.buffer);
      if (lenResult === null) {
        if (!this.connected) return null;
        await new Promise((r) => setTimeout(r, 10));
        continue;
      }

      const { length, offset } = lenResult;
      if (this.buffer.length < offset + length) {
        if (!this.connected) return null;
        await new Promise((r) => setTimeout(r, 10));
        continue;
      }

      const wordBuf = this.buffer.subarray(offset, offset + length);
      this.buffer = this.buffer.subarray(offset + length);
      return wordBuf.toString('utf8');
    }
  }

  private encodeLength(len: number): Buffer {
    if (len < 0x80) {
      return Buffer.from([len]);
    } else if (len < 0x4000) {
      const b1 = (len >> 8) | 0x80;
      const b2 = len & 0xff;
      return Buffer.from([b1, b2]);
    } else if (len < 0x200000) {
      const b1 = (len >> 16) | 0xc0;
      const b2 = (len >> 8) & 0xff;
      const b3 = len & 0xff;
      return Buffer.from([b1, b2, b3]);
    } else if (len < 0x10000000) {
      const b1 = (len >> 24) | 0xe0;
      const b2 = (len >> 16) & 0xff;
      const b3 = (len >> 8) & 0xff;
      const b4 = len & 0xff;
      return Buffer.from([b1, b2, b3, b4]);
    } else {
      const buf = Buffer.alloc(5);
      buf[0] = 0xf0;
      buf.writeUInt32BE(len, 1);
      return buf;
    }
  }

  private decodeLength(buf: Buffer): { length: number; offset: number } | null {
    if (buf.length === 0) return null;
    const b1 = buf[0];
    if ((b1 & 0x80) === 0x00) {
      return { length: b1, offset: 1 };
    } else if ((b1 & 0xc0) === 0x80) {
      if (buf.length < 2) return null;
      return { length: ((b1 & 0x3f) << 8) | buf[1], offset: 2 };
    } else if ((b1 & 0xe0) === 0xc0) {
      if (buf.length < 3) return null;
      return { length: ((b1 & 0x1f) << 16) | (buf[1] << 8) | buf[2], offset: 3 };
    } else if ((b1 & 0xf0) === 0xe0) {
      if (buf.length < 4) return null;
      return { length: ((b1 & 0x0f) << 24) | (buf[1] << 16) | (buf[2] << 8) | buf[3], offset: 4 };
    } else if (b1 === 0xf0) {
      if (buf.length < 5) return null;
      return { length: buf.readUInt32BE(1), offset: 5 };
    }
    return null;
  }

  public close() {
    if (this.socket) {
      try {
        this.socket.destroy();
      } catch (e) {
        // ignore
      }
      this.socket = null;
    }
    this.connected = false;
    this.loggedIn = false;
  }
}
