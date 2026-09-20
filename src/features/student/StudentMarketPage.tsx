import { useMemo, useState } from 'react';
import { useCurrentStudent } from './CurrentStudentContext';
import { useServices } from '@/shared/services/ServicesContext';
import { useMarketItems, useMarketOrders, useStudentStars } from '@/shared/services/queries';
import { canAfford, type MarketItem, type MarketOrder } from '@/domain/market';
import { toErrorMessage } from '@/shared/i18n/errorMessages';
import { LoadingScreen } from '@/shared/ui/LoadingScreen';
import styles from './StudentMarketPage.module.css';

export function StudentMarketPage() {
  const student = useCurrentStudent();
  const { market } = useServices();

  const starsData = useStudentStars(student.id);
  const items = useMarketItems();
  const orders = useMarketOrders();

  const [buyingItemId, setBuyingItemId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const balance = starsData?.balance ?? 0;

  const handleBuy = async (item: MarketItem) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setBuyingItemId(item.id);

    try {
      await market.buyItem(student.id, item.id);
      setSuccessMessage(`Tabriklaymiz! "${item.title}" muvaffaqiyatli xarid qilindi. O'qituvchingiz yaqin orada topshiradi!`);
    } catch (err: unknown) {
      setErrorMessage(toErrorMessage(err));
    } finally {
      setBuyingItemId(null);
    }
  };

  const studentOrders = useMemo(() => {
    if (!orders) return [];
    return orders
      .filter((o: MarketOrder) => o.studentId === student.id)
      .sort((a: MarketOrder, b: MarketOrder) => b.createdAt.localeCompare(a.createdAt));
  }, [orders, student.id]);

  if (!items || !orders) {
    return <LoadingScreen />;
  }

  return (
    <div className={styles.container}>
      {/* Banner / Balance Header */}
      <div className={styles.heroCard}>
        <div className={styles.heroContent}>
          <span className={styles.heroIcon}>🎁</span>
          <div>
            <h1 className={styles.title}>Yutuqlar Do'koni</h1>
            <p className={styles.subtitle}>
              Interaktiv vazifalarda qatnashing, har 40 ta to'g'ri ishlangan misol uchun yulduzchalar to'plang va ajoyib sovg'alarga ega bo'ling!
            </p>
          </div>
        </div>

        <div className={styles.balanceBox}>
          <span className={styles.balanceLabel}>Mening balansim</span>
          <div className={styles.balanceValue}>
            <span className={styles.starIcon}>⭐</span>
            <span className={styles.balanceNum}>
              {starsData ? balance : '...'}
            </span>
          </div>
          <div className={styles.starsBreakdown}>
            <span>Jami to'plangan: <strong>{starsData?.earnedStars ?? 0} ⭐</strong></span>
            <span>Sarflangan: <strong>{starsData?.spentStars ?? 0} ⭐</strong></span>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className={styles.successAlert} role="alert">
          <span>🎉 {successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className={styles.dismissBtn}>×</button>
        </div>
      )}

      {errorMessage && (
        <div className={styles.errorAlert} role="alert">
          <span>⚠️ {errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className={styles.dismissBtn}>×</button>
        </div>
      )}

      {/* Items Showcase */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Mavjud Sovg'alar</h2>

        {items.length === 0 ? (
          <div className={styles.emptyCard}>
            <span className={styles.emptyIcon}>🛍️</span>
            <h3>Hozircha sovg'alar yo'q</h3>
            <p>O'qituvchingiz tez orada do'konga yangi sovg'alar qo'shadi!</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {items.map((item: MarketItem) => {
              const affordable = canAfford(balance, item);
              const isOutOfStock = item.stock !== null && item.stock <= 0;
              const isBuying = buyingItemId === item.id;
              const starsNeeded = Math.max(0, item.costStars - balance);

              return (
                <div key={item.id} className={`${styles.itemCard} ${isOutOfStock ? styles.outOfStock : ''}`}>
                  <div className={styles.itemImageWrapper}>
                    {item.imageUrl && item.imageUrl.startsWith('http') ? (
                      <img src={item.imageUrl} alt={item.title} className={styles.itemImg} />
                    ) : (
                      <div className={styles.itemEmoji}>
                        {item.imageUrl || '🎁'}
                      </div>
                    )}
                    <span className={styles.costBadge}>
                      ⭐ {item.costStars}
                    </span>
                  </div>

                  <div className={styles.itemBody}>
                    <h3 className={styles.itemTitle}>{item.title}</h3>

                    <div className={styles.stockInfo}>
                      {item.stock === null ? (
                        <span className={styles.inStock}>Cheksiz mavjud</span>
                      ) : item.stock > 0 ? (
                        <span className={styles.stockCount}>Qoldi: {item.stock} ta</span>
                      ) : (
                        <span className={styles.noStock}>Tugagan</span>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={!affordable || isOutOfStock || isBuying}
                      onClick={() => handleBuy(item)}
                      className={`${styles.buyBtn} ${affordable && !isOutOfStock ? styles.canBuy : ''}`}
                    >
                      {isBuying ? (
                        'Xarid qilinmoqda...'
                      ) : isOutOfStock ? (
                        'Tugagan'
                      ) : affordable ? (
                        'Sotib olish'
                      ) : (
                        `Yana ${starsNeeded} ⭐ kerak`
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Orders History */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Mening Buyurtmalarim</h2>
        {studentOrders.length === 0 ? (
          <div className={styles.emptySub}>Hozircha hech narsa xarid qilmagansiz.</div>
        ) : (
          <div className={styles.ordersList}>
            {studentOrders.map((order: MarketOrder) => {
              const item = items.find((it: MarketItem) => it.id === order.itemId);
              const statusMap: Record<string, { label: string; className: string }> = {
                pending: { label: 'Kutilmoqda', className: styles.statusPending },
                delivered: { label: 'Topshirildi ✓', className: styles.statusDelivered },
                cancelled: { label: 'Bekor qilingan (⭐ qaytarilgan)', className: styles.statusCancelled },
              };
              const statusInfo = statusMap[order.status] ?? { label: order.status, className: '' };

              return (
                <div key={order.id} className={styles.orderCard}>
                  <div className={styles.orderLeft}>
                    <span className={styles.orderEmoji}>{item?.imageUrl || '🎁'}</span>
                    <div>
                      <h4 className={styles.orderTitle}>{order.itemTitle || item?.title || "Sovg'a"}</h4>
                      <span className={styles.orderDate}>
                        {new Date(order.createdAt).toLocaleDateString('uz-UZ', {
                          day: 'numeric',
                          month: 'long',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                  <div className={styles.orderRight}>
                    <span className={styles.orderStars}>⭐ {order.costStars}</span>
                    <span className={`${styles.statusBadge} ${statusInfo.className}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
