import { useId } from 'react';
import {
  PRACTICE_LIMITS,
  type PracticeConfig,
  SECTION_IDS,
  normalizePracticeConfig,
} from '@/domain/practice/config';
import { TOPIC_GROUPS, type TopicGroupId, getTopic, topicsForDigitCount } from '@/domain/practice/topics';
import { formatSeconds } from '@/shared/format';
import { ChoiceField } from '@/shared/ui/ChoiceField';
import { numberChoices } from '@/shared/ui/choiceOptions';
import { SliderField } from '@/shared/ui/SliderField';
import styles from './Practice.module.css';
import { SECTION_META } from './sections';

/** Marks the "whole section, mixed" entries apart from topic ids in the one select. */
const SECTION_PREFIX = 'section:';

/* Small, fixed sets read better as chips: every option is visible and one tap wide. */
const DIGIT_CHOICES = numberChoices(PRACTICE_LIMITS.digitCount, (n) => `${n} xonali`);
const ROW_CHOICES = numberChoices(PRACTICE_LIMITS.rowCount);
const PROBLEM_CHOICES = numberChoices(PRACTICE_LIMITS.problemCount);

interface PracticeConfigFieldsProps {
  value: PracticeConfig;
  onChange: (value: PracticeConfig) => void;
}

export function PracticeConfigFields({ value, onChange }: PracticeConfigFieldsProps) {
  const set = <K extends keyof PracticeConfig>(key: K, next: PracticeConfig[K]) =>
    onChange(normalizePracticeConfig({ ...value, [key]: next }));

  /** A topic owns its section and digit count, so picking either of those leaves the topic. */
  const leaveTopic = <K extends keyof PracticeConfig>(key: K, next: PracticeConfig[K]) =>
    onChange(normalizePracticeConfig({ ...value, topicId: undefined, [key]: next }));

  const topicSelectId = useId();
  const topics = topicsForDigitCount(value.digitCount);
  const selectedTopic = getTopic(value.topicId);
  const groups = Object.keys(TOPIC_GROUPS) as TopicGroupId[];

  return (
    <>
      <div className={styles.fieldBlock}>
        <label className={styles.fieldLabel} htmlFor={topicSelectId}>
          Mavzu
        </label>
        <select
          id={topicSelectId}
          className={styles.topicSelect}
          value={value.topicId ?? `${SECTION_PREFIX}${value.section}`}
          onChange={(event) => {
            const picked = event.target.value;
            if (picked.startsWith(SECTION_PREFIX)) {
              leaveTopic('section', picked.slice(SECTION_PREFIX.length) as PracticeConfig['section']);
            } else {
              set('topicId', picked);
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
          {selectedTopic ? TOPIC_GROUPS[selectedTopic.group].hint : SECTION_META[value.section].description}
        </p>
      </div>

      <ChoiceField
        label="Xonalar soni"
        options={DIGIT_CHOICES}
        value={value.digitCount}
        onChange={(n) => leaveTopic('digitCount', n)}
      />
      <ChoiceField
        label="Qator soni (necha son)"
        options={ROW_CHOICES}
        value={value.rowCount}
        onChange={(n) => set('rowCount', n)}
      />
      <ChoiceField
        label="Misollar soni"
        options={PROBLEM_CHOICES}
        value={value.problemCount}
        onChange={(n) => set('problemCount', n)}
      />
      {/* 0,3–7 s in tenths is a real range, so it keeps a slider — with buttons for the fine steps. */}
      <SliderField
        label="Har bir son uchun vaqt (soniya)"
        {...PRACTICE_LIMITS.secondsPerNumber}
        formatValue={formatSeconds}
        stepper
        value={value.secondsPerNumber}
        onChange={(n) => set('secondsPerNumber', n)}
      />
    </>
  );
}
