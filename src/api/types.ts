// Shapes returned by the Kanvas backend (multi_backend). JSON is camelCase.

export type TenantStatus = 'Active' | 'Suspended' | 'Expired'

export interface Tenant {
  id: number
  name: string
  code: string
  plan: string | null
  planId: number | null
  users: number
  userLimit: number
  status: TenantStatus
  createdOn: string
  industry: string
  country: string
  address: string
  billingContactName: string
  billingEmail: string
  billingPhone: string
  lmsAdminName: string
  lmsAdminEmail: string
  /** Number of courses assigned to the tenant. */
  courseCount: number
}

export interface TenantCourse {
  id: number
  code: string
  name: string
  source: 'included' | 'purchased' | 'assigned'
}

/** GET /tenants/:id - the tenant plus its assigned courses and latest subscription. */
export interface TenantDetail extends Tenant {
  /** The tenant's own LMS address (read-only). */
  lmsUrl?: string
  courses: TenantCourse[]
  subscription: Subscription | null
}

export type TenantProfileUpdate = Partial<
  Pick<
    Tenant,
    | 'name'
    | 'industry'
    | 'country'
    | 'address'
    | 'billingContactName'
    | 'billingEmail'
    | 'billingPhone'
    | 'lmsAdminName'
    | 'lmsAdminEmail'
    | 'planId'
    | 'userLimit'
    | 'status'
  >
> & { courseIds?: number[] }

export interface Plan {
  id: number
  name: 'Basic' | 'Professional' | 'Enterprise'
  tagline: string
  price: string
  period: string | null
  users: string
  tenants: string
  features: string[]
  activeCount: number
  popular: boolean
  billingCycle: 'Monthly' | 'Yearly'
  basePrice: number
  maxUsers: number
  maxTenants: number
  status: 'Active' | 'Inactive'
  includedFreeCourseIds: number[]
  includedCourseCount: number
}

export type PlanInput = Pick<Plan, 'name' | 'basePrice' | 'billingCycle' | 'maxUsers' | 'maxTenants' | 'includedCourseCount' | 'features' | 'status'>

/** The 4 top-level lenses a category belongs to in the capability-framework browser. */
export type CategoryType = 'Organization-wide' | 'Function-based' | 'Role-based' | 'Industry and sector'

export interface CourseCategory {
  id: number
  name: string
  status: 'Active' | 'Inactive'
  type: CategoryType
  code: string | null
  description: string | null
}

export type CourseCategoryInput = Omit<CourseCategory, 'id' | 'status'>

export type CourseLevel = 'Foundation' | 'Intermediate' | 'Advanced'

/** The fixed Category/Level choice-lists a course form's selects are built from - fetched from the
 * server (GET /courses/options) rather than hardcoded, so there's one source of truth. */
export interface CourseOptions {
  categoryTypes: CategoryType[]
  levels: CourseLevel[]
}

export interface CategoryBrowseRow {
  id: number
  code: string | null
  name: string
  description: string | null
}

export interface CategoryBrowseGroup {
  type: CategoryType
  description: string
  /** A course is tagged with a type directly, not one of `categories`' specific rows, so the course
   * count is only meaningful at this group level. */
  totalCourses: number
  activeCourses: number
  categories: CategoryBrowseRow[]
}

export interface Course {
  id: number
  code: string
  name: string
  /** One of the 4 capability-framework types - see the Course Categories page for the full taxonomy. */
  category: CategoryType
  level: CourseLevel | null
  description: string
  price: number
  type: 'Free' | 'Paid'
  status: 'Active' | 'Inactive'
  lmsCourseId: string
  /** Id of the attached SCORM package, or null when the course has none. */
  scormPackage: string | null
  /** Launch file inside the package, read from imsmanifest.xml (e.g. "safety_course/index.html"). */
  launchFile: string | null
  scormTitle: string | null
  scormVersion: string | null
  /** Filename returned by POST /courses/upload-cover, or null when the course has no cover image. */
  coverImage: string | null
  passScore: number
  durationHours: number | null
  /** A number as a string, or null/blank meaning "all questions". */
  quizQuestionCount: string | null
  certValidMonths: number | null
  certificateTemplate: string
  completionMessage: string
  /** "What you'll learn" bullets, shown in the course preview card. */
  learningOutcomes: string[]
  /** Whether the course is live yet - see the "Course Approvals" screen. A Support Admin's course starts
   * as "draft" (no content yet, so nothing for a Super Admin to review) and automatically becomes "pending"
   * once it has a module (or a SCORM package attached at creation). It is invisible everywhere a course can
   * be picked (catalog, plans, tenants) until a Super Admin approves it; editing an approved or rejected
   * course sends it back to "pending" (a still-empty draft stays a draft). */
  approvalStatus: 'draft' | 'pending' | 'approved' | 'rejected'
  createdByName: string | null
  approvedByName: string | null
  approvedAt: string | null
  rejectionReason: string | null
}

export type CourseInput = Omit<
  Course,
  | 'id'
  | 'code'
  | 'scormPackage'
  | 'launchFile'
  | 'scormTitle'
  | 'scormVersion'
  | 'coverImage'
  | 'passScore'
  | 'durationHours'
  | 'quizQuestionCount'
  | 'certValidMonths'
  | 'certificateTemplate'
  | 'completionMessage'
  | 'learningOutcomes'
  | 'approvalStatus'
  | 'createdByName'
  | 'approvedByName'
  | 'approvedAt'
  | 'rejectionReason'
  | 'level'
> & {
  /** Explicit course code (e.g. "SCL_TECH_01"); blank/omitted auto-generates a "C001"-style code. */
  code?: string
  /** Package id returned by the upload endpoint; attaches (or replaces) the SCORM package. */
  scormPackage?: string | null
  /** Detach and delete the course's current SCORM package. */
  removeScorm?: boolean
  coverImage?: string | null
  passScore?: number
  durationHours?: number | null
  quizQuestionCount?: string | null
  certValidMonths?: number | null
  certificateTemplate?: string
  completionMessage?: string
  learningOutcomes?: string[]
  level?: CourseLevel | null
}

export interface CourseModule {
  id: number
  courseId: number
  course: string
  order: number
  title: string
  type: 'text' | 'image' | 'video' | 'document' | 'hybrid' | 'scorm'
  duration: string | null
  status: 'Active' | 'Inactive'
  /** Rich-text HTML authored in the module editor. */
  content: string
  /** Filename of an uploaded image/video/document attachment, for a type that takes one. */
  media: string | null
  /** Id of the module's own attached SCORM package (a "scorm" module), or null when it has none. */
  scormPackage: string | null
  launchFile: string | null
  scormTitle: string | null
  scormVersion: string | null
}

export type CourseModuleInput = Omit<CourseModule, 'id' | 'course' | 'scormPackage' | 'launchFile' | 'scormTitle' | 'scormVersion'> & {
  /** Package id returned by the upload endpoint; attaches (or replaces) the module's SCORM package. */
  scormPackage?: string | null
  /** Detach and delete the module's current SCORM package. */
  removeScorm?: boolean
}

export type QuizQuestionType = 'single choice' | 'true false' | 'multi choice'

export interface QuizQuestion {
  id: number
  courseId: number
  course: string
  type: QuizQuestionType
  category: string
  text: string
  options: string[]
  correctIndex: number
  /** Every correct answer: one entry for single choice / true false, two or more for multi choice. */
  correctIndices: number[]
  marks: number
  explanation: string
}

export type QuizQuestionInput = Omit<QuizQuestion, 'id' | 'course'>

export interface CertificateTemplate {
  id: number
  name: string
  logo: string
  /** Optional uploaded picture behind the certificate (stored like a course cover); null = just the background colour. */
  backgroundImage: string | null
  colors: string[]
  signatures: string[]
  status: 'Active' | 'Inactive'
  titleText: string
  introText: string
  showPassScore: boolean
  /** The two signature slots; `signatures` is just the enabled titles. */
  signatureDetails: SignatureSlot[]
}

export interface SignatureSlot {
  enabled: boolean
  title: string
  name: string
}

export type CertificateTemplateInput = Omit<CertificateTemplate, 'id'>

/** Result of uploading + inspecting a SCORM ZIP (before it is attached to a course). */
export interface ScormPackageInfo {
  packageId: string
  title: string
  version: string
  launchFile: string
  sizeBytes: number
  fileCount: number
}

export type CourseResult = 'completed' | 'failed' | 'in progress' | 'not started'

export interface ModuleResult {
  scoId: string
  moduleTitle: string | null
  lessonStatus: string
  score: number | null
  totalTime: string
  completedAt: string | null
  updatedAt: string | null
}

/** One learner's saved progress on a course's SCORM package, as the server computes it. */
export interface LearnerProgress {
  modulesTotal: number
  modulesFinished: number
  progressPercent: number
  status: CourseResult
  score: number | null
  passed: boolean | null
  modules: ModuleResult[]
  certificateId: number | null
  certificateNumber: string | null
}

export interface MyProgress extends LearnerProgress {
  packageId: string
  title: string
  passScore: number | null
}

export interface CourseProgress {
  packageId: string
  title: string
  passScore: number | null
  learners: (LearnerProgress & { userId: number; userName: string })[]
}

export interface IssuedCertificate {
  id: number
  number: string
  userId: number
  learnerName: string
  courseId: number
  courseName: string
  score: number | null
  issuedAt: string
  validUntil: string | null
  design: { logo: string; backgroundImage?: string | null; colors: string[]; signatures: string[] }
}

export type PaymentLinkStatus = 'Pending' | 'Paid' | 'Failed' | 'Expired'

export interface PaymentLink {
  orderId: string
  tenant: string
  plan: string
  billingCycle: 'Monthly' | 'Yearly'
  amount: number
  subtotal: number
  tax: number
  status: PaymentLinkStatus
  createdOn: string
  validUntil: string
  validityHours: number
  paymentLink: string
  paymentId: string | null
  tenantId: number | null
}

export interface PaymentRecord {
  id: number
  date: string
  tenant: string
  tenantId: number | null
  amount: string
  amountValue: number
  status: 'Paid' | 'Failed' | 'Refunded'
  invoice: string
  method: string | null
  paymentId: string | null
  orderId: string | null
}

export type ProvisioningStatus = 'Success' | 'Failed' | 'Pending'

export interface ProvisioningStep {
  name: string
  status: 'Done' | 'Failed' | 'Pending'
}

export interface Credentials {
  lmsUrl: string
  username: string
  temporaryPassword: string
}

export interface ProvisioningRecord {
  id: number
  tenant: string
  tenantId: number
  lmsId: string
  adminAccount: string
  configuration: 'Complete' | 'Partial' | 'Pending'
  status: ProvisioningStatus
  date: string
  steps: ProvisioningStep[]
  error: string | null
  credentials: Credentials | null
}

export interface Subscription {
  id: number
  subscriptionId: string
  tenant: string
  tenantId: number
  plan: string
  status: TenantStatus
  billingCycle: 'Monthly' | 'Yearly'
  startDate: string
  renewalDate: string
  price: string
  amount: number
}

export interface PayResult {
  link: PaymentLink
  payment: PaymentRecord
  subscription: Subscription
  provisioning: ProvisioningRecord
  credentials: Credentials | null
}

export interface OnboardingInput {
  name: string
  code: string
  industry: string
  country: string
  address: string
  billingContactName: string
  billingEmail: string
  billingPhone: string
  lmsAdminName: string
  lmsAdminEmail: string
  planId: number
  additionalCourseIds: number[]
  validityHours: number
}

/** Direct tenant creation — no plan, no payment step. */
export interface TenantCreateInput {
  name: string
  code: string
  industry: string
  country: string
  address: string
  billingContactName: string
  billingEmail: string
  billingPhone: string
  lmsAdminName: string
  lmsAdminEmail: string
  userLimit: number
  courseIds: number[]
}

export interface TenantCreateResult {
  tenant: Tenant
  provisioning: ProvisioningRecord
  credentials: Credentials | null
}

export interface FeatureFlag {
  key: string
  name: string
  tier: 'Basic+' | 'Professional+' | 'Enterprise+'
  description: string
  enabled: boolean
  allowedByPlan: boolean
}

export type PlatformRole = 'Super Admin' | 'Support Admin'

/** Display label only - the stored/compared value stays 'Support Admin' everywhere (DB, auth, API). */
export const roleLabel = (role: PlatformRole): string => (role === 'Support Admin' ? 'Content User' : role)

export interface PlatformUser {
  id: number
  initials: string
  name: string
  username: string
  email: string
  role: PlatformRole
  status: 'Active' | 'Inactive'
  lastLogin: string
  temporaryPassword?: string | null
}

export type AuditCategory = 'Tenant' | 'Plan' | 'Auth' | 'Settings' | 'Feature'

export interface AuditLog {
  id: number
  date: string
  action: string
  category: AuditCategory
  performedBy: string
  details: string
  ip: string
}

export interface AuditPage {
  items: AuditLog[]
  total: number
  page: number
  pageSize: number
  categoryCounts: Record<AuditCategory, number>
}

export interface DashboardData {
  stats: {
    totalTenants: number
    newTenantsThisMonth: number
    activeTenants: number
    activePercent: number
    suspendedTenants: number
    expiredTenants: number
    totalUsers: number
    activePlans: number
    provisioningFailures: number
    avgQuotaUsed: number
  }
  tenantStatusOverTime: { month: string; Active: number; Suspended: number; Expired: number }[]
  recentActivity: AuditLog[]
}

export interface UsageData {
  summary: {
    totalActiveUsers: number
    licensedCapacity: number
    availableCapacity: number
    utilizationPercent: number
    nearCapacityCount: number
  }
  byTenant: {
    tenantId: number
    tenant: string
    plan: string
    activeUsers: number
    limit: number
    unlimited: boolean
    available: number | null
    utilization: number
  }[]
  chart: { tenant: string; used: number; limit: number }[]
  userTrend: { month: string; period: string; users: number }[]
}

export interface ServiceHealth {
  key: string
  icon: string
  name: string
  status: 'Healthy' | 'Degraded'
  latency: string
  uptime: string
  detail: string | null
  simulated: boolean
}

export interface HealthData {
  degradedCount: number
  healthyCount: number
  services: ServiceHealth[]
  incidents: { service: string; detail: string; date: string; status: 'Ongoing' | 'Resolved' }[]
  responseTime: { time: string; ms: number }[]
}

export interface PlatformConfig {
  platformName: string
  supportEmail: string
  sessionTimeout: number
  maxLoginAttempts: number
  defaultTimezone: string
}

export interface FeatureToggle {
  key: string
  name: string
  description: string
  enabled: boolean
}

export interface SettingsData {
  config: PlatformConfig
  featureToggles: FeatureToggle[]
}

export interface TokenResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
  user: PlatformUser
}
