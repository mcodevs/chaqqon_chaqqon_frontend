import type { AuthService } from './authService';
import type { BillingService } from './billingService';
import type { CompetitionService } from './competitionService';
import type { HomeworkService } from './homeworkService';
import type { MarketService } from './marketService';
import type { StorageGateway } from './ports';
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
  homework: HomeworkService;
  storage: StorageGateway;
}
