/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Storage abstraction for uploaded binary assets. `StorageDriver` defines the contract that
 * every concrete backend must satisfy; `LocalDiskStorageDriver` is the development
 * implementation persisting to the filesystem. An S3 or Cloudflare R2 driver can be
 * substituted without touching calling code, because consumers depend on the interface
 * and persist only the driver-relative `storageKey`.
 *
 * IN SIMPLE WORDS:
 * Defines how files get saved and read back. Right now they go to a folder on disk, but
 * swapping in AWS S3 or Cloudflare R2 later only means writing a new driver — nothing
 * else in the app has to change.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { existsSync } from 'fs';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { dirname, join, resolve, sep } from 'path';
import { randomUUID } from 'crypto';

export interface StoredObject {
  /** Driver-relative identifier persisted on the Upload row. */
  storageKey: string;
  sizeBytes: number;
}

export abstract class StorageDriver {
  abstract put(
    buffer: Buffer,
    opts: { originalName: string; mimeType: string; prefix: string },
  ): Promise<StoredObject>;

  /**
   * Returns the whole object in memory. Uploads are capped at 8MB by `UploadsService`,
   * so buffering is bounded and avoids the response-stream lifecycle entirely.
   * If that cap is ever raised substantially, switch this to a streaming read.
   */
  abstract get(storageKey: string): Promise<Buffer>;

  abstract remove(storageKey: string): Promise<void>;
}

/** Root for local uploads; overridable so deployments can point at a mounted volume. */
const UPLOAD_ROOT = resolve(process.env.UPLOAD_DIR || './uploads');

@Injectable()
export class LocalDiskStorageDriver extends StorageDriver {
  async put(
    buffer: Buffer,
    opts: { originalName: string; mimeType: string; prefix: string },
  ): Promise<StoredObject> {
    // Randomised filename: never trust a client-supplied name on disk, and avoid collisions.
    const extension = opts.originalName.includes('.')
      ? `.${opts.originalName.split('.').pop()!.toLowerCase().replace(/[^a-z0-9]/g, '')}`
      : '';
    const storageKey = `${opts.prefix}/${randomUUID()}${extension}`;
    const absolute = this.resolveKey(storageKey);

    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, buffer);

    return { storageKey, sizeBytes: buffer.length };
  }

  async get(storageKey: string): Promise<Buffer> {
    const absolute = this.resolveKey(storageKey);
    if (!existsSync(absolute)) {
      throw new NotFoundException('Stored file is no longer available.');
    }
    return readFile(absolute);
  }

  async remove(storageKey: string): Promise<void> {
    const absolute = this.resolveKey(storageKey);
    if (existsSync(absolute)) await unlink(absolute);
  }

  /**
   * Resolves a key inside UPLOAD_ROOT, rejecting anything that escapes it.
   * Without this a crafted key such as "../../etc/passwd" would read outside the store.
   */
  private resolveKey(storageKey: string): string {
    const absolute = resolve(join(UPLOAD_ROOT, storageKey));
    if (absolute !== UPLOAD_ROOT && !absolute.startsWith(UPLOAD_ROOT + sep)) {
      throw new NotFoundException('Invalid storage key.');
    }
    return absolute;
  }
}
