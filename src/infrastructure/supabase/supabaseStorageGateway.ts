import type { StorageGateway } from '@/application/ports';
import type { AppSupabaseClient } from './client';

export function createSupabaseStorageGateway(client: AppSupabaseClient): StorageGateway {
  /** Uploads under a unique name and hands back the public URL that is stored on the record. */
  const upload = async (bucket: string, prefix: string, file: Blob): Promise<string> => {
    const extension = file.type === 'image/png' ? 'png' : 'jpg';
    const path = `${prefix}-${Date.now()}.${extension}`;

    const { error } = await client.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type || 'image/jpeg',
    });

    if (error) throw error;

    const { data } = client.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  };

  return {
    uploadAvatar: (file, studentId) => upload('avatars', studentId, file),
    uploadMarketImage: (file) => upload('market', 'item', file),
  };
}
