import type { AuditSearchFilters } from '../types';
import { InterventionLevel } from '../types';

export interface AuditFilterFormValues {
  dateFrom?: string;
  dateTo?: string;
  interventionLevel?: string;
  accountId?: string;
  threatType?: string;
  query?: string;
}

/**
 * Pure function that takes form values and returns AuditSearchFilters.
 * Maps the interventionLevel string to the InterventionLevel enum value,
 * and passes through all other non-empty filter fields.
 */
export function buildAuditFilters(formValues: AuditFilterFormValues): AuditSearchFilters {
  const filters: AuditSearchFilters = {};

  if (formValues.dateFrom) {
    filters.dateFrom = formValues.dateFrom;
  }
  if (formValues.dateTo) {
    filters.dateTo = formValues.dateTo;
  }
  if (formValues.interventionLevel) {
    const level = Number(formValues.interventionLevel);
    if (level in InterventionLevel) {
      filters.interventionLevel = level as InterventionLevel;
    }
  }
  if (formValues.accountId) {
    filters.accountId = formValues.accountId;
  }
  if (formValues.threatType) {
    filters.threatType = formValues.threatType;
  }
  if (formValues.query) {
    filters.query = formValues.query;
  }

  return filters;
}
