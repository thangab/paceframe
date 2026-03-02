import { formatDateWithPattern } from '@/features/preview/formatters';

type TemplateTextVars = {
  activityName: string;
  locationText: string;
  dateIso: string;
  dateText: string;
  distanceText: string;
  distanceValue: string;
  distanceUnit: string;
  durationText: string;
  paceText: string;
  paceValue: string;
  paceUnit: string;
  elevText: string;
  elevValue: string;
  elevUnit: string;
  caloriesText: string;
  avgHeartRateText: string;
  avgHeartRateValue: string;
  avgHeartRateUnit: string;
};

export function resolveTemplateText(
  value: string,
  vars: TemplateTextVars,
  options?: {
    formatDate?: string;
  },
) {
  const resolvedDate =
    options?.formatDate && vars.dateIso
      ? (formatDateWithPattern(vars.dateIso, options.formatDate) ??
        vars.dateText)
      : vars.dateText;
  return value
    .replaceAll('{activityName}', vars.activityName)
    .replaceAll('{location}', vars.locationText)
    .replaceAll('{date}', resolvedDate)
    .replaceAll('{distance}', vars.distanceText)
    .replaceAll('{distanceValue}', vars.distanceValue)
    .replaceAll('{distanceUnit}', vars.distanceUnit)
    .replaceAll('{time}', vars.durationText)
    .replaceAll('{pace}', vars.paceText)
    .replaceAll('{paceValue}', vars.paceValue)
    .replaceAll('{paceUnit}', vars.paceUnit)
    .replaceAll('{elev}', vars.elevText)
    .replaceAll('{elevValue}', vars.elevValue)
    .replaceAll('{elevUnit}', vars.elevUnit)
    .replaceAll('{calories}', vars.caloriesText)
    .replaceAll('{avgHr}', vars.avgHeartRateText)
    .replaceAll('{avgHrValue}', vars.avgHeartRateValue)
    .replaceAll('{avgHrUnit}', vars.avgHeartRateUnit);
}

export function tokenizeTemplateText(
  text: string,
  accentStyle?: {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: '400' | '500' | '600' | '700' | '800' | '900';
    letterSpacing?: number;
    color?: string;
  },
): { text: string; accent?: boolean }[] {
  const tokenRegex = /\[\[(.*?)\]\]/g;
  const tokens: { text: string; accent?: boolean }[] = [];
  let lastIndex = 0;
  let match = tokenRegex.exec(text);
  while (match) {
    const start = match.index;
    const end = tokenRegex.lastIndex;
    if (start > lastIndex) {
      tokens.push({ text: text.slice(lastIndex, start) });
    }
    tokens.push({ text: match[1], accent: true, ...(accentStyle ?? {}) });
    lastIndex = end;
    match = tokenRegex.exec(text);
  }
  if (lastIndex < text.length) {
    tokens.push({ text: text.slice(lastIndex) });
  }
  return tokens.length ? tokens : [{ text }];
}
