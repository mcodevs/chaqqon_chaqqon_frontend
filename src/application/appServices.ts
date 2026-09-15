import type { AuthService } from './authService';
import type { BillingService } from './billingService';
import type { CompetitionService } from './competitionService';
import type { MarketService } from './marketService';
import type { ResultService } from './resultService';
import type { StudentService } from './studentService';

/** Everything the presentation layer is allowed to call. */
export interface AppServices {
  auth: AuthService;
  students: StudentService;
  results: ResultService;
  competition: CompetitionService;
  billing: BillingService;
  market: MarketService;
}
