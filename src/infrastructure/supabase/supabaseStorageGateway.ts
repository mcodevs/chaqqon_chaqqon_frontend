import type { StorageGateway } from '@/application/ports';
import type { AppSupabaseClient } from './client';

export function createSupabaseStorageGateway(client: AppSupabaseClient): StorageGateway {
  /**
   * Uploads under the signed-in user's own id, which storage policies require, and hands back the
   * public URL that is stored on the record.
   */
  const upload = async (bucket: string, file: Blob): Promise<string> => {
    const { data: auth } = await client.auth.getSession();
    const ownerId = auth.session?.user.id;
    if (!ownerId) throw new Error('Not signed in');

    const extension = file.type === 'image/png' ? 'png' : 'jpg';
    const path = `${ownerId}/${Date.now()}.${extension}`;

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
    uploadAvatar: (file) => upload('avatars', file),
    uploadMarketImage: (file) => upload('market', file),
  };
}
