export type AnalyticsConsent = 'unknown' | 'granted' | 'denied';
export type CountBucket = '0' | '1-5' | '6-20' | '21-50' | '51+';

export interface DesktopAnalyticsEventMap {
  app_opened: Record<string, never>;
  analytics_consent_changed: { choice: 'granted'; surface: 'onboarding' | 'settings' };
  onboarding_completed: { source: 'first_run' | 'template' };
  project_created: { source: 'start_screen' | 'menu' | 'template'; units: 'imperial' | 'metric' };
  project_saved: { save_kind: 'initial' | 'manual' | 'auto' | 'save_as'; part_count_bucket: CountBucket };
  cut_list_generated: { part_count_bucket: CountBucket; stock_count_bucket: CountBucket; success: boolean };
  export_completed: {
    export_type: 'project_pdf' | 'cut_diagrams_pdf' | 'shopping_pdf' | 'shopping_csv';
    success: boolean;
  };
  checkout_opened: { surface: 'trial' | 'settings' | 'pricing_prompt'; license_mode: 'trial' | 'free' };
  license_activated: { license_mode: 'licensed' };
}

export type DesktopAnalyticsEventName = keyof DesktopAnalyticsEventMap;
export type DesktopAnalyticsEvent<N extends DesktopAnalyticsEventName = DesktopAnalyticsEventName> = {
  name: N;
  properties: DesktopAnalyticsEventMap[N];
};

type PropertyValidator = readonly string[] | 'boolean';

const eventPropertyValidators: Record<DesktopAnalyticsEventName, Record<string, PropertyValidator>> = {
  app_opened: {},
  analytics_consent_changed: {
    choice: ['granted'],
    surface: ['onboarding', 'settings']
  },
  onboarding_completed: {
    source: ['first_run', 'template']
  },
  project_created: {
    source: ['start_screen', 'menu', 'template'],
    units: ['imperial', 'metric']
  },
  project_saved: {
    save_kind: ['initial', 'manual', 'auto', 'save_as'],
    part_count_bucket: ['0', '1-5', '6-20', '21-50', '51+']
  },
  cut_list_generated: {
    part_count_bucket: ['0', '1-5', '6-20', '21-50', '51+'],
    stock_count_bucket: ['0', '1-5', '6-20', '21-50', '51+'],
    success: 'boolean'
  },
  export_completed: {
    export_type: ['project_pdf', 'cut_diagrams_pdf', 'shopping_pdf', 'shopping_csv'],
    success: 'boolean'
  },
  checkout_opened: {
    surface: ['trial', 'settings', 'pricing_prompt'],
    license_mode: ['trial', 'free']
  },
  license_activated: {
    license_mode: ['licensed']
  }
};

export function bucketCount(count: number): CountBucket {
  if (count <= 0) return '0';
  if (count <= 5) return '1-5';
  if (count <= 20) return '6-20';
  if (count <= 50) return '21-50';
  return '51+';
}

export function sanitizeDesktopAnalyticsEvent(input: unknown): DesktopAnalyticsEvent | null {
  if (!isRecord(input) || typeof input.name !== 'string' || !isDesktopAnalyticsEventName(input.name)) {
    return null;
  }

  if (!isRecord(input.properties)) return null;

  const validators = eventPropertyValidators[input.name];
  const properties: Record<string, string | boolean> = {};

  for (const [property, validator] of Object.entries(validators)) {
    const value = input.properties[property];

    if (!isValidPropertyValue(value, validator)) return null;

    properties[property] = value;
  }

  return { name: input.name, properties } as DesktopAnalyticsEvent;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDesktopAnalyticsEventName(value: string): value is DesktopAnalyticsEventName {
  return Object.hasOwn(eventPropertyValidators, value);
}

function isValidPropertyValue(value: unknown, validator: PropertyValidator): value is string | boolean {
  return validator === 'boolean' ? typeof value === 'boolean' : typeof value === 'string' && validator.includes(value);
}
