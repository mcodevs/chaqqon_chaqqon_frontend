import type { StorageGateway } from '@/application/ports';
import type { AppSupabaseClient } from './client';

export function createSupabaseStorageGateway(client: AppSupabaseClient): StorageGateway {
  return {
    async uploadAvatar(file: Blob, studentId: string): Promise<string> {
      const extension = file.type === 'image/png' ? 'png' : 'jpg';
      const path = `${studentId}-${Date.now()}.${extension}`;

      const { error } = await client.storage.from('avatars').upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type || 'image/jpeg',
      });

      if (error) throw error;

      const { data } = client.storage.from('avatars').getPublicUrl(path);
      return data.publicUrl;
    },
  };
}
