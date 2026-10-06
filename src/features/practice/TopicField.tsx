import { useId } from 'react';
import { SECTION_IDS, type SectionId } from '@/domain/practice/config';
import { TOPIC_GROUPS, type TopicGroupId, getTopic, topicsForDigitCount } from '@/domain/practice/topics';
import styles from './Practice.module.css';
import { SECTION_META } from './sections';

/** Marks the "whole section, mixed" entries apart from topic ids in the one select. */
const SECTION_PREFIX = 'section:';

interface TopicFieldProps {
  section: SectionId;
  topicId: string | undefined;
  /** Only the topics that work with this many digits are offered. */
  digitCount: number;
  onPickSection: (section: SectionId) => void;
  onPickTopic: (topicId: string) => void;
}

/**
 * One select over the whole curriculum: the four sections mixed at the top, then the named topics
 * grouped the way they are taught. Shared by the practice form and the printed worksheet form.
 */
export function TopicField({ section, topicId, digitCount, onPickSection, onPickTopic }: TopicFieldProps) {
  const selectId = useId();
  const topics = topicsForDigitCount(digitCount);
  const selectedTopic = getTopic(topicId);
  const groups = Object.keys(TOPIC_GROUPS) as TopicGroupId[];

  return (
    <div className={styles.fieldBlock}>
      <label className={styles.fieldLabel} htmlFor={selectId}>
        Mavzu
      </label>
      <select
        id={selectId}
        className={styles.topicSelect}
        value={topicId ?? `${SECTION_PREFIX}${section}`}
        onChange={(event) => {
          const picked = event.target.value;
          if (picked.startsWith(SECTION_PREFIX)) {
            onPickSection(picked.slice(SECTION_PREFIX.length) as SectionId);
          } else {
            onPickTopic(picked);
          }
        }}
      >
        <optgroup label="Aralash (butun bo‘lim)">
          {SECTION_IDS.map((id) => (
            <option key={id} value={`${SECTION_PREFIX}${id}`}>
              {SECTION_META[id].label} — aralash
            </option>
          ))}
        </optgroup>
        {groups.map((group) => {
          const groupTopics = topics.filter((topic) => topic.group === group);
          if (groupTopics.length === 0) return null;
          return (
            <optgroup key={group} label={TOPIC_GROUPS[group].label}>
              {groupTopics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.label}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>
      <p className={styles.topicHint}>
        {selectedTopic ? TOPIC_GROUPS[selectedTopic.group].hint : SECTION_META[section].description}
      </p>
    </div>
  );
}
