/** Service that resolves timezone information for a user. */
export interface TimezoneService {
  /** Returns the IANA timezone string for the user's stated location. */
  getStatedTimezone(userId: string): Promise<string>;
  /** Returns the UTC offset in hours for a given IANA timezone at a specific instant. */
  getUtcOffset(timezone: string): Promise<number>;
}

/** Service that tracks escalation progression within a session. */
export interface EscalationTracker {
  /** Returns the ISO-8601 timestamp of the connection creation, if available. */
  getConnectionTimestamp(sessionId: string): Promise<string | null>;
  /** Returns true if a personal contact request has been detected in the session. */
  hasContactRequest(sessionId: string): Promise<boolean>;
  /** Returns the ISO-8601 timestamp of the first contact request, or null. */
  getContactRequestTimestamp(sessionId: string): Promise<string | null>;
}

/** Service that provides observed activity hour patterns for a user. */
export interface ActivityPatternService {
  /**
   * Returns the estimated UTC offset (in hours) inferred from the user's
   * peak activity hours. For example, if a user is most active at hours
   * that correspond to evening in UTC+3, this returns 3.
   */
  getObservedUtcOffset(userId: string): Promise<number>;
}

/** Abstraction over EventBridge for publishing analyzer output. */
export interface EventBridgeClient {
  publish(event: Record<string, unknown>): Promise<void>;
}

/** Dependencies injected into the temporal analyzer handler. */
export interface TemporalAnalyzerDeps {
  timezoneService: TimezoneService;
  escalationTracker: EscalationTracker;
  activityPatternService: ActivityPatternService;
  eventBridge: EventBridgeClient;
}
