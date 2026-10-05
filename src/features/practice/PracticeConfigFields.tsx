import { useId } from 'react';
import {
  PRACTICE_KINDS,
  PRACTICE_LIMITS,
  type PracticeConfig,
  type PracticeKind,
  SECTION_IDS,
  defaultConfigFor,
  limitsFor,
  normalizePracticeConfig,
} from '@/domain/practice/config';
import { TOPIC_GROUPS, type TopicGroupId, getTopic, topicsForDigitCount } from '@/domain/practice/topics';
import { formatSeconds } from '@/shared/format';
import { ChoiceField } from '@/shared/ui/ChoiceField';
import { numberChoices } from '@/shared/ui/choiceOptions';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { SliderField } from '@/shared/ui/SliderField';
import styles from './Practice.module.css';
import { DRILL_META, SECTION_META } from './sections';

/** Marks the "whole section, mixed" entries apart from topic ids in the one select. */
const SECTION_PREFIX = 'section:';

/* Small, fixed sets read better as chips: every option is visible and one tap wide. */
const ROW_CHOICES = numberChoices(PRACTICE_LIMITS.rowCount);
const PROBLEM_CHOICES = numberChoices(PRACTICE_LIMITS.problemCount);

const kindOptions = (kinds: readonly PracticeKind[]) =>
  kinds.map((kind) => ({ value: kind, label: DRILL_META[kind].short }));

interface PracticeConfigFieldsProps {
  value: PracticeConfig;
  onChange: (value: PracticeConfig) => void;
  /** The drills this form may offer; all of them unless a screen narrows the list. */
  kinds?: readonly PracticeKind[];
}

export function PracticeConfigFields({ value, onChange, kinds = PRACTICE_KINDS }: PracticeConfigFieldsProps) {
  const set = <K extends keyof PracticeConfig>(key: K, next: PracticeConfig[K]) =>
    onChange(normalizePracticeConfig({ ...value, [key]: next }));

  /** A topic owns its section and digit count, so picking either of those leaves the topic. */
  const leaveTopic = <K extends keyof PracticeConfig>(key: K, next: PracticeConfig[K]) =>
    onChange(normalizePracticeConfig({ ...value, topicId: undefined, [key]: next }));

  // The two drills share no settings worth carrying over: an anzan's 6 seconds a number would
  // leave a card sitting on screen, so switching starts that drill from its own defaults.
  const setKind = (kind: PracticeKind) => {
    if (kind !== value.kind) onChange(defaultConfigFor(kind));
  };

  const topicSelectId = useId();
  const limits = limitsFor(value.kind);
  // The column drill adds the same numbers as an anzan, so it takes the same settings — minus the
  // timing, which belongs to a flash.
  const isAdding = value.kind !== 'soroban';
  const digitChoices = numberChoices(limits.digitCount, (n) => `${n} xonali`);

  return (
    <>
      <div className={styles.fieldBlock}>
        <span className={styles.fieldLabel}>Mashq turi</span>
        <SegmentedControl
          label="Mashq turi"
          options={kindOptions(kinds)}
          value={value.kind}
          onChange={setKind}
        />
        <p className={styles.topicHint}>{DRILL_META[value.kind].description}</p>
      </div>

      {isAdding && (
        <TopicField
          value={value}
          selectId={topicSelectId}
          onPickSection={(section) => leaveTopic('section', section)}
          onPickTopic={(topicId) => set('topicId', topicId)}
        />
      )}

      <ChoiceField
        label="Xonalar soni"
        options={digitChoices}
        value={value.digitCount}
        onChange={(n) => leaveTopic('digitCount', n)}
      />

      {isAdding ? (
        <>
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
        </>
      ) : (
        /* Up to thirty cards is too many chips to scan, and a card takes a second anyway. */
        <SliderField
          label="Kartalar soni"
          {...limits.problemCount}
          stepper
          value={value.problemCount}
          onChange={(n) => set('problemCount', n)}
        />
      )}

      {/* The column drill is not timed at all: the child reads the problem and answers when ready. */}
      {value.kind !== 'ustun' && (
        /* 0,3–7 s in tenths is a real range, so it keeps a slider — with buttons for the fine steps. */
        <SliderField
          label={
            value.kind === 'soroban' ? 'Karta ko‘rinish vaqti (soniya)' : 'Har bir son uchun vaqt (soniya)'
          }
          {...limits.secondsPerNumber}
          formatValue={formatSeconds}
          stepper
          value={value.secondsPerNumber}
          onChange={(n) => set('secondsPerNumber', n)}
        />
      )}
    </>
  );
}

interface TopicFieldProps {
  value: PracticeConfig;
  selectId: string;
  onPickSection: (section: PracticeConfig['section']) => void;
  onPickTopic: (topicId: string) => void;
}

function TopicField({ value, selectId, onPickSection, onPickTopic }: TopicFieldProps) {
  const topics = topicsForDigitCount(value.digitCount);
  const selectedTopic = getTopic(value.topicId);
  const groups = Object.keys(TOPIC_GROUPS) as TopicGroupId[];

  return (
    <div className={styles.fieldBlock}>
      <label className={styles.fieldLabel} htmlFor={selectId}>
        Mavzu
      </label>
      <select
        id={selectId}
        className={styles.topicSelect}
        value={value.topicId ?? `${SECTION_PREFIX}${value.section}`}
        onChange={(event) => {
          const picked = event.target.value;
          if (picked.startsWith(SECTION_PREFIX)) {
            onPickSection(picked.slice(SECTION_PREFIX.length) as PracticeConfig['section']);
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
        {selectedTopic ? TOPIC_GROUPS[selectedTopic.group].hint : SECTION_META[value.section].description}
      </p>
    </div>
  );
}
