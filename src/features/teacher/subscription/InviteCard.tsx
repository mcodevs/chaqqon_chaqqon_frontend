import { useState } from 'react';
import { referralLink } from '@/domain/applications';
import { usePlatformSettings } from '@/shared/services/queries';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import styles from './Subscription.module.css';

const shareText = (trialDays: number) =>
  "Mental arifmetika ustozlari uchun platforma: mashqlar, uy vazifasi va to'lovlar bitta ilovada." +
  (trialDays > 0 ? ` ${trialDays} kun bepul sinab ko'rsa bo'ladi.` : '');

/**
 * A teacher's invite link. When a colleague who applied through it, or typed this login in the form,
 * gets an account, this teacher gets a free month; the colleague earns theirs by inviting in turn.
 * Hidden while the admin does not offer the reward.
 */
export function InviteCard({ username }: { username: string }) {
  const settings = usePlatformSettings();
  const [copied, setCopied] = useState(false);
  if (!settings?.referralEnabled) return null;

  const link = referralLink(window.location.origin, username);
  const canShare = typeof navigator.share === 'function';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const share = async () => {
    try {
      await navigator.share({ title: 'Chaqqon-chaqqon', text: shareText(settings.trialDays), url: link });
    } catch {
      // Closing the share sheet rejects too; there is nothing to report.
    }
  };

  return (
    <Card title="🤝 Hamkasbingizni taklif qiling">
      <p className={styles.inviteText}>
        Hamkasbingiz shu havola orqali ariza qoldirib, akkaunt ochsa — <strong>sizga 1 oy bepul</strong>. Har
        bir yangi ustoz uchun alohida, soni cheklanmagan.
      </p>
      <p className={styles.inviteLink}>{link}</p>
      <div className={styles.inviteActions}>
        {canShare && (
          <Button size="sm" variant="secondary" onClick={() => void share()}>
            Ulashish
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => void copy()}>
          {copied ? '✓ Nusxa olindi' : 'Havolani nusxalash'}
        </Button>
      </div>
      <p className={styles.hint}>Havolasiz ham bo'ladi: arizada loginingizni yozsin — @{username}.</p>
    </Card>
  );
}
