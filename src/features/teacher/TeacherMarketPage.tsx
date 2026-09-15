import { useState, useMemo } from 'react';
import { useServices } from '@/shared/services/ServicesContext';
import { useMarketItems, useMarketOrders, useStudents } from '@/shared/services/queries';
import { toErrorMessage } from '@/shared/i18n/errorMessages';
import type { MarketItem, MarketOrder } from '@/domain/market';
import { LoadingScreen } from '@/shared/ui/LoadingScreen';
import styles from './TeacherMarketPage.module.css';

const PRESET_ICONS = ['🎁', '📚', '✏️', '🎨', '🍫', '🧸', '🏅', '🎒', '🧩', '🚀', '🎯', '⚽'];

export function TeacherMarketPage() {
  const { market } = useServices();

  const items = useMarketItems();
  const orders = useMarketOrders();
  const students = useStudents();

  // Form state
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [costStars, setCostStars] = useState(10);
  const [imageUrl, setImageUrl] = useState('🎁');
  const [stock, setStock] = useState<string>(''); // empty string means unlimited

  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'delivered' | 'cancelled'>('pending');
  const [submitting, setSubmitting] = useState(false);
  const [orderActionId, setOrderActionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const resetForm = () => {
    setIsEditing(null);
    setTitle('');
    setCostStars(10);
    setImageUrl('🎁');
    setStock('');
  };

  const handleEditItem = (item: MarketItem) => {
    setIsEditing(item.id);
    setTitle(item.title);
    setCostStars(item.costStars);
    setImageUrl(item.imageUrl || '🎁');
    setStock(item.stock === null ? '' : String(item.stock));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFeedback({ type: 'error', message: "Sovg'a nomini kiriting!" });
      return;
    }
    if (costStars <= 0) {
      setFeedback({ type: 'error', message: "Yulduzchalar soni kamida 1 bo'lishi kerak!" });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    const stockNumber = stock.trim() === '' ? null : Math.max(0, parseInt(stock, 10));

    try {
      await market.saveItem({
        id: isEditing || undefined,
        title: title.trim(),
        costStars,
        imageUrl: imageUrl.trim(),
        stock: stockNumber,
      });

      setFeedback({
        type: 'success',
        message: isEditing ? "Sovg'a ma'lumotlari yangilandi!" : "Yangi sovg'a do'konga qo'shildi!",
      });
      resetForm();
    } catch (err: unknown) {
      setFeedback({ type: 'error', message: toErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (itemId: string, itemTitle: string) => {
    if (!confirm(`Haqiqatan ham "${itemTitle}" sovg'asini o'chirmoqchimisiz?`)) return;
    try {
      await market.deleteItem(itemId);
      setFeedback({ type: 'success', message: `"${itemTitle}" o'chirildi.` });
      if (isEditing === itemId) resetForm();
    } catch (err: unknown) {
      setFeedback({ type: 'error', message: toErrorMessage(err) });
    }
  };

  const handleOrderStatus = async (orderId: string, status: 'delivered' | 'cancelled') => {
    setOrderActionId(orderId);
    try {
      await market.updateOrderStatus(orderId, status);
      setFeedback({
        type: 'success',
        message: status === 'delivered' ? "Sovg'a o'quvchiga topshirildi!" : 'Buyurtma bekor qilindi va yulduzchalar qaytarildi.',
      });
    } catch (err: unknown) {
      setFeedback({ type: 'error', message: toErrorMessage(err) });
    } finally {
      setOrderActionId(null);
    }
  };

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    const sorted = [...orders].sort((a: MarketOrder, b: MarketOrder) => b.createdAt.localeCompare(a.createdAt));
    if (filterStatus === 'all') return sorted;
    return sorted.filter((ord: MarketOrder) => ord.status === filterStatus);
  }, [orders, filterStatus]);

  const pendingCount = useMemo(() => {
    if (!orders) return 0;
    return orders.filter((o: MarketOrder) => o.status === 'pending').length;
  }, [orders]);

  if (!items || !orders || !students) {
    return <LoadingScreen />;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Do'kon Boshqaruvi</h1>
          <p className={styles.subtitle}>
            O'quvchilar uchun motivatsion sovg'alar yarating, yulduzchalar narxini belgilang va buyurtmalarni topshiring.
          </p>
        </div>
      </header>

      {feedback && (
        <div className={feedback.type === 'success' ? styles.successAlert : styles.errorAlert} role="alert">
          <span>{feedback.type === 'success' ? '✅' : '⚠️'} {feedback.message}</span>
          <button onClick={() => setFeedback(null)} className={styles.dismissBtn}>×</button>
        </div>
      )}

      {/* Grid: Left = Form, Right = Existing Items */}
      <div className={styles.managementGrid}>
        {/* Create/Edit Form */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            {isEditing ? "✏️ Sovg'ani Tahrirlash" : "➕ Yangi Sovg'a Qo'shish"}
          </h2>
          <form onSubmit={handleSubmitItem} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Sovg'a nomi *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Masalan: Shokolad yoki Chiroyli ruchka"
                className={styles.input}
                required
              />
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label}>Narxi (⭐ Yulduzcha) *</label>
                <input
                  type="number"
                  min="1"
                  value={costStars}
                  onChange={(e) => setCostStars(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className={styles.input}
                  required
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Soni (bo'sh qolsa cheksiz)</label>
                <input
                  type="number"
                  min="0"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  placeholder="Cheksiz"
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Belgi (Emoji) yoki Rasm URL</label>
              <div className={styles.presetIcons}>
                {PRESET_ICONS.map((ico) => (
                  <button
                    key={ico}
                    type="button"
                    onClick={() => setImageUrl(ico)}
                    className={`${styles.iconBtn} ${imageUrl === ico ? styles.iconBtnSelected : ''}`}
                  >
                    {ico}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Emoji yoki https://rasm-linki.png"
                className={styles.input}
              />
            </div>

            <div className={styles.formActions}>
              {isEditing && (
                <button type="button" onClick={resetForm} className={styles.cancelBtn}>
                  Bekor qilish
                </button>
              )}
              <button type="submit" disabled={submitting} className={styles.submitBtn}>
                {submitting ? 'Saqlanmoqda...' : isEditing ? 'Yangilash' : "Do'konga Qo'shish"}
              </button>
            </div>
          </form>
        </div>

        {/* Existing Items List */}
        <div className={styles.card}>
          <div className={styles.cardHeaderFlex}>
            <h2 className={styles.cardTitle}>Mavjud Sovg'alar ({items.length})</h2>
          </div>

          {items.length === 0 ? (
            <p className={styles.empty}>Hozircha hech qanday sovg'a qo'shilmagan.</p>
          ) : (
            <div className={styles.itemsList}>
              {items.map((item: MarketItem) => (
                <div key={item.id} className={styles.itemRow}>
                  <div className={styles.itemEmoji}>
                    {item.imageUrl && item.imageUrl.startsWith('http') ? (
                      <img src={item.imageUrl} alt={item.title} className={styles.itemThumb} />
                    ) : (
                      item.imageUrl || '🎁'
                    )}
                  </div>
                  <div className={styles.itemDetails}>
                    <div className={styles.itemRowTop}>
                      <span className={styles.itemTitle}>{item.title}</span>
                      <span className={styles.itemStars}>⭐ {item.costStars}</span>
                    </div>
                    <div className={styles.itemRowSub}>
                      <span>{item.stock === null ? 'Cheksiz' : `Qoldi: ${item.stock} ta`}</span>
                    </div>
                  </div>
                  <div className={styles.itemActions}>
                    <button
                      type="button"
                      onClick={() => handleEditItem(item)}
                      className={styles.editBtn}
                      title="Tahrirlash"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id, item.title)}
                      className={styles.deleteBtn}
                      title="O'chirish"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Orders Management */}
      <section className={styles.ordersSection}>
        <div className={styles.ordersHeader}>
          <div className={styles.ordersTitleFlex}>
            <h2 className={styles.sectionTitle}>O'quvchilar Buyurtmalari</h2>
            {pendingCount > 0 && (
              <span className={styles.pendingBadge}>{pendingCount} ta kutilmoqda</span>
            )}
          </div>

          {/* Filter Tabs */}
          <div className={styles.filterTabs}>
            <button
              className={`${styles.filterTab} ${filterStatus === 'pending' ? styles.filterTabActive : ''}`}
              onClick={() => setFilterStatus('pending')}
            >
              Kutilmoqda ({orders.filter((o: MarketOrder) => o.status === 'pending').length})
            </button>
            <button
              className={`${styles.filterTab} ${filterStatus === 'delivered' ? styles.filterTabActive : ''}`}
              onClick={() => setFilterStatus('delivered')}
            >
              Topshirilgan ({orders.filter((o: MarketOrder) => o.status === 'delivered').length})
            </button>
            <button
              className={`${styles.filterTab} ${filterStatus === 'cancelled' ? styles.filterTabActive : ''}`}
              onClick={() => setFilterStatus('cancelled')}
            >
              Bekor qilingan ({orders.filter((o: MarketOrder) => o.status === 'cancelled').length})
            </button>
            <button
              className={`${styles.filterTab} ${filterStatus === 'all' ? styles.filterTabActive : ''}`}
              onClick={() => setFilterStatus('all')}
            >
              Barchasi ({orders.length})
            </button>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className={styles.emptyBox}>
            <span>📦</span>
            <p>Ushbu bo'limda hech qanday buyurtma yo'q.</p>
          </div>
        ) : (
          <div className={styles.ordersTableWrapper}>
            <table className={styles.ordersTable}>
              <thead>
                <tr>
                  <th>Vaqt</th>
                  <th>O'quvchi</th>
                  <th>Sovg'a</th>
                  <th>Narxi</th>
                  <th>Holat</th>
                  <th>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order: MarketOrder) => {
                  const item = items.find((i: MarketItem) => i.id === order.itemId);
                  const student = students.find((s) => s.id === order.studentId);
                  const isActioning = orderActionId === order.id;

                  return (
                    <tr key={order.id}>
                      <td className={styles.tdDate}>
                        {new Date(order.createdAt).toLocaleDateString('uz-UZ', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className={styles.tdStudent}>
                        <strong>{student?.firstName || order.studentId}</strong>
                      </td>
                      <td>
                        <span className={styles.orderItemName}>
                          {item?.imageUrl || '🎁'} {order.itemTitle || item?.title || "Sovg'a"}
                        </span>
                      </td>
                      <td className={styles.tdStars}>⭐ {order.costStars}</td>
                      <td>
                        <span
                          className={`${styles.orderBadge} ${
                            order.status === 'pending'
                              ? styles.badgePending
                              : order.status === 'delivered'
                              ? styles.badgeDelivered
                              : styles.badgeCancelled
                          }`}
                        >
                          {order.status === 'pending'
                            ? 'Kutilmoqda'
                            : order.status === 'delivered'
                            ? 'Topshirildi'
                            : 'Bekor qilindi'}
                        </span>
                      </td>
                      <td>
                        {order.status === 'pending' ? (
                          <div className={styles.actionButtons}>
                            <button
                              type="button"
                              disabled={isActioning}
                              onClick={() => handleOrderStatus(order.id, 'delivered')}
                              className={styles.deliverBtn}
                              title="Sovg'ani topshirdim deb belgilash"
                            >
                              ✓ Topshirildi
                            </button>
                            <button
                              type="button"
                              disabled={isActioning}
                              onClick={() => handleOrderStatus(order.id, 'cancelled')}
                              className={styles.rejectBtn}
                              title="Bekor qilish va yulduzchalarni qaytarish"
                            >
                              ✕ Bekor qilish
                            </button>
                          </div>
                        ) : (
                          <span className={styles.completedLabel}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
