import type { AccountService } from './accountService';
import type { AdminService } from './adminService';
import type { AuthService } from './authService';
import type { BillingService } from './billingService';
import type { CompetitionService } from './competitionService';
import type { HomeworkService } from './homeworkService';
import type { MarketService } from './marketService';
import type { PlatformService } from './platformService';
import type { StorageGateway, TelegramGateway } from './ports';
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
  account: AccountService;
  admin: AdminService;
  platform: PlatformService;
  storage: StorageGateway;
  telegram: TelegramGateway;
}
