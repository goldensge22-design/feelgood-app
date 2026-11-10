import type { StarStoryValues } from '@/lib/star-story';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/lib/i18n';

const FIELDS = [
  { key: 'situation', label: 'star.field.situation', hint: 'star.field.situationHint' },
  { key: 'roleGoal', label: 'star.field.roleGoal', hint: 'star.field.roleGoalHint' },
  { key: 'action', label: 'field.action', hint: 'field.action.help' },
  { key: 'selectionReason', label: 'star.field.selectionReason', hint: 'star.field.selectionReasonHint' },
  { key: 'result', label: 'field.result', hint: 'field.result.help' },
  { key: 'resultEvidence', label: 'star.field.resultEvidence', hint: 'star.field.resultEvidenceHint' },
  { key: 'learning', label: 'field.learning', hint: 'field.learning.help' },
] as const;

export function StarStoryFields({
  value,
  onChange,
  testPrefix,
  includeCoreFields = true,
}: {
  value: StarStoryValues;
  onChange: (next: StarStoryValues) => void;
  testPrefix: string;
  includeCoreFields?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-3" data-testid={`${testPrefix}-fields`}>
      {FIELDS.filter(({ key }) => includeCoreFields || !['action', 'result', 'learning'].includes(key)).map(({ key, label, hint }) => {
        const id = `${testPrefix}-${key}`;
        return (
          <div key={key}>
            <label htmlFor={id} className="text-sm font-medium">{t(label)}</label>
            <p className="text-xs text-muted-foreground">{t(hint)}</p>
            <Textarea
              id={id}
              dir="auto"
              rows={key === 'action' || key === 'result' || key === 'learning' ? 3 : 2}
              maxLength={20000}
              className="mt-1.5"
              value={value[key] ?? ''}
              onChange={(event) => onChange({ ...value, [key]: event.target.value })}
              data-testid={id}
            />
          </div>
        );
      })}
    </div>
  );
}
