import { type ChangeEvent, useState } from 'react';
import { useServices } from '../services/ServicesContext';
import styles from './AvatarPickerModal.module.css';
import { AVATAR_PRESETS } from './avatarPresets';

interface AvatarPickerModalProps {
  studentId: string;
  currentAvatarUrl?: string | null;
  onSelect: (avatarUrl: string) => Promise<void> | void;
  onClose: () => void;
}

export function AvatarPickerModal({
  studentId,
  currentAvatarUrl,
  onSelect,
  onClose,
}: AvatarPickerModalProps) {
  const { storage } = useServices();
  const [activeTab, setActiveTab] = useState<'boy' | 'girl'>('boy');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredPresets = AVATAR_PRESETS.filter((p) => p.category === activeTab);

  const handlePresetClick = async (presetId: string) => {
    try {
      setUploading(true);
      await onSelect(`preset:${presetId}`);
      onClose();
    } catch {
      setError('Rasmni saqlashda xatolik yuz berdi');
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError(null);
      const url = await storage.uploadAvatar(file, studentId);
      await onSelect(url);
      onClose();
    } catch {
      setError('Rasmni yuklashda xatolik yuz berdi');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>Profil rasmini tanlash</h3>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            ×
          </button>
        </div>

        {error && <div style={{ color: '#ef4444', fontSize: '0.85rem' }}>{error}</div>}

        {/* 1. Camera & Gallery buttons */}
        <div className={styles.uploadSection}>
          <label className={styles.uploadBtn}>
            <span className={styles.uploadIcon}>📷</span>
            <span>Rasmga olish</span>
            <input
              type="file"
              accept="image/*"
              capture="user"
              className={styles.hiddenInput}
              disabled={uploading}
              onChange={handleFileUpload}
            />
          </label>

          <label className={styles.uploadBtn}>
            <span className={styles.uploadIcon}>🖼</span>
            <span>Galereyadan</span>
            <input
              type="file"
              accept="image/*"
              className={styles.hiddenInput}
              disabled={uploading}
              onChange={handleFileUpload}
            />
          </label>
        </div>

        <div className={styles.divider}>yoki illustratsiyalardan biri</div>

        {/* 2. Gender Tabs */}
        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${activeTab === 'boy' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('boy')}
          >
            👦 O'g'il bola
          </button>
          <button
            type="button"
            className={`${styles.tab} ${activeTab === 'girl' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('girl')}
          >
            👧 Qiz bola
          </button>
        </div>

        {/* 3. Preset Grid */}
        {uploading ? (
          <div className={styles.loading}>Rasm yangilanmoqda...</div>
        ) : (
          <div className={styles.presetGrid}>
            {filteredPresets.map((preset) => {
              const isSelected = currentAvatarUrl === `preset:${preset.id}`;
              return (
                <button
                  key={preset.id}
                  type="button"
                  className={`${styles.presetItem} ${isSelected ? styles.presetSelected : ''}`}
                  onClick={() => handlePresetClick(preset.id)}
                >
                  {preset.render(56)}
                  <span className={styles.presetName}>{preset.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
