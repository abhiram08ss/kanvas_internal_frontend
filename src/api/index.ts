import { download, request } from './client'
import type {
  AuditPage,
  CategoryBrowseGroup,
  CertificateTemplate,
  CertificateTemplateInput,
  Course,
  CourseCategory,
  CourseCategoryInput,
  CourseInput,
  CourseOptions,
  CourseProgress,
  CourseModule,
  CourseModuleInput,
  DashboardData,
  FeatureFlag,
  HealthData,
  IssuedCertificate,
  MyProgress,
  OnboardingInput,
  PayResult,
  PaymentLink,
  PaymentRecord,
  Plan,
  PlanInput,
  PlatformConfig,
  PlatformRole,
  PlatformUser,
  ProvisioningRecord,
  QuizQuestion,
  QuizQuestionInput,
  ScormPackageInfo,
  SettingsData,
  Subscription,
  Tenant,
  TenantCreateInput,
  TenantCreateResult,
  TenantDetail,
  TenantProfileUpdate,
  TenantStatus,
  TokenResponse,
  UsageData,
  Credentials,
} from './types'

export { API_ORIGIN, ApiError, errorMessage, tokenStore, UNAUTHORIZED_EVENT, watchLiveProgress, type LiveProgressEvent } from './client'
export * from './types'

export const api = {
  // ---- auth
  login: (username: string, password: string) => request<TokenResponse>('/auth/login', { method: 'POST', body: { username, password }, auth: false }),
  me: () => request<PlatformUser>('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<void>('/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } }),

  // ---- dashboards
  dashboard: () => request<DashboardData>('/dashboard'),
  usage: () => request<UsageData>('/analytics/usage'),
  health: () => request<HealthData>('/system-health'),

  // ---- tenants
  tenants: () => request<Tenant[]>('/tenants'),
  checkTenantCode: (code: string) => request<{ code: string; available: boolean }>('/tenants/check-code', { params: { code } }),
  /** Direct tenant creation — no plan, no payment step. */
  createTenant: (body: TenantCreateInput) => request<TenantCreateResult>('/tenants', { method: 'POST', body }),
  tenantDetail: (id: number) => request<TenantDetail>(`/tenants/${id}`),
  updateTenant: (id: number, body: TenantProfileUpdate) => request<Tenant>(`/tenants/${id}`, { method: 'PATCH', body }),
  setTenantStatus: (id: number, status: Exclude<TenantStatus, 'Expired'>) =>
    request<Tenant>(`/tenants/${id}/${status === 'Suspended' ? 'suspend' : 'activate'}`, { method: 'POST' }),

  // ---- plans & courses
  plans: () => request<Plan[]>('/plans'),
  createPlan: (body: PlanInput) => request<Plan>('/plans', { method: 'POST', body }),
  updatePlan: (id: number, body: Partial<PlanInput>) => request<Plan>(`/plans/${id}`, { method: 'PATCH', body }),
  setPlanCourses: (id: number, courseIds: number[]) => request<Plan>(`/plans/${id}/courses`, { method: 'PUT', body: { courseIds } }),
  courses: () => request<Course[]>('/courses'),
  /** Every course a course-picker (Modules/Quiz Questions tabs) may pick from: every approved course, plus
   * (for a Support Admin) their own not-yet-approved submissions too - including a still-draft one, so
   * they can attach its first module before a Super Admin ever sees it. */
  editableCourses: () => request<Course[]>('/courses/editable'),
  course: (id: number) => request<Course>(`/courses/${id}`),
  courseOptions: () => request<CourseOptions>('/courses/options'),
  createCourse: (body: CourseInput) => request<Course>('/courses', { method: 'POST', body }),
  updateCourse: (id: number, body: Partial<CourseInput>) => request<Course>(`/courses/${id}`, { method: 'PATCH', body }),
  deleteCourse: (id: number) => request<void>(`/courses/${id}`, { method: 'DELETE' }),
  courseCategories: () => request<CourseCategory[]>('/course-categories'),
  createCourseCategory: (body: CourseCategoryInput) => request<CourseCategory>('/course-categories', { method: 'POST', body }),
  updateCourseCategory: (id: number, body: Partial<CourseCategoryInput> & { status?: CourseCategory['status'] }) =>
    request<CourseCategory>(`/course-categories/${id}`, { method: 'PATCH', body }),
  courseCategoriesBrowse: () => request<CategoryBrowseGroup[]>('/course-categories/browse'),
  /** The approval queue: every non-approved course for a Super Admin, or just this Support Admin's own submissions. */
  pendingCourses: () => request<Course[]>('/courses/pending'),
  approveCourse: (id: number) => request<Course>(`/courses/${id}/approve`, { method: 'POST' }),
  rejectCourse: (id: number, reason: string) => request<Course>(`/courses/${id}/reject`, { method: 'POST', body: { reason } }),
  /** Validate + extract a SCORM ZIP and detect its launch file. Attach it by saving the course with `scormPackage`. */
  uploadScorm: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<ScormPackageInfo>('/scorm/upload', { method: 'POST', body: form })
  },
  /** Delete an uploaded package that was never saved onto a course. `keepalive` lets it finish while a tab is closing. */
  discardScorm: (packageId: string, keepalive = false) => request<void>(`/scorm/${encodeURIComponent(packageId)}`, { method: 'DELETE', keepalive }),
  /** A short-lived token for the SCORM player URL, so it can resume and save this user's own progress. */
  scormLaunch: (packageId: string) => request<{ launchToken: string }>(`/scorm/${encodeURIComponent(packageId)}/launch`, { method: 'POST' }),
  /** Every learner's saved progress, score and pass/fail on a package (admins). */
  scormProgress: (packageId: string) => request<CourseProgress>(`/scorm/${encodeURIComponent(packageId)}/progress`),
  /** The signed-in user's own saved progress, score and certificate on a package. */
  myScormProgress: (packageId: string) => request<MyProgress>(`/scorm/${encodeURIComponent(packageId)}/my-progress`),
  /** Certificates issued to learners who finished a course (admins). */
  certificates: (courseId?: number) => request<IssuedCertificate[]>(courseId === undefined ? '/certificates' : `/certificates?courseId=${courseId}`),
  certificate: (id: number) => request<IssuedCertificate>(`/certificates/${id}`),
  /** Validate + store a cover image. Attach it by saving the course with `coverImage`. */
  uploadCourseCover: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<{ coverImage: string }>('/courses/upload-cover', { method: 'POST', body: form })
  },

  // ---- LMS content: modules, quiz questions, certificate templates
  courseModules: () => request<CourseModule[]>('/course-modules'),
  /** Validate + store an image/video/document attachment for a module of that Content Type. */
  uploadModuleMedia: (file: File, kind: string) => {
    const form = new FormData()
    form.append('file', file)
    return request<{ media: string }>('/course-modules/upload-media', { method: 'POST', body: form, params: { kind } })
  },
  createCourseModule: (body: CourseModuleInput) => request<CourseModule>('/course-modules', { method: 'POST', body }),
  updateCourseModule: (id: number, body: Partial<CourseModuleInput>) => request<CourseModule>(`/course-modules/${id}`, { method: 'PATCH', body }),
  deleteCourseModule: (id: number) => request<void>(`/course-modules/${id}`, { method: 'DELETE' }),

  quizQuestions: () => request<QuizQuestion[]>('/quiz-questions'),
  createQuizQuestion: (body: QuizQuestionInput) => request<QuizQuestion>('/quiz-questions', { method: 'POST', body }),
  updateQuizQuestion: (id: number, body: Partial<QuizQuestionInput>) => request<QuizQuestion>(`/quiz-questions/${id}`, { method: 'PATCH', body }),
  deleteQuizQuestion: (id: number) => request<void>(`/quiz-questions/${id}`, { method: 'DELETE' }),

  certificateTemplates: () => request<CertificateTemplate[]>('/certificate-templates'),
  createCertificateTemplate: (body: CertificateTemplateInput) => request<CertificateTemplate>('/certificate-templates', { method: 'POST', body }),
  updateCertificateTemplate: (id: number, body: Partial<Omit<CertificateTemplateInput, 'name'>>) =>
    request<CertificateTemplate>(`/certificate-templates/${id}`, { method: 'PATCH', body }),

  // ---- onboarding / payments
  createPaymentLink: (body: OnboardingInput) => request<PaymentLink>('/payment-links', { method: 'POST', body }),
  paymentLinks: () => request<PaymentLink[]>('/payment-links'),
  sendPaymentLinkEmail: (orderId: string) => request<PaymentLink>(`/payment-links/${orderId}/send-email`, { method: 'POST' }),
  resendPaymentLink: (orderId: string) => request<PaymentLink>(`/payment-links/${orderId}/resend`, { method: 'POST' }),
  payLink: (orderId: string, method: string) => request<PayResult>(`/payment-links/${orderId}/pay`, { method: 'POST', body: { method } }),
  failLink: (orderId: string, method: string) => request<PaymentLink>(`/payment-links/${orderId}/fail`, { method: 'POST', body: { method } }),

  // ---- subscriptions & provisioning
  subscriptions: () => request<Subscription[]>('/subscriptions'),
  payments: () => request<PaymentRecord[]>('/payments'),
  provisioning: () => request<ProvisioningRecord[]>('/provisioning'),
  retryProvisioning: (id: number) => request<ProvisioningRecord>(`/provisioning/${id}/retry`, { method: 'POST' }),
  resetAdminPassword: (id: number) => request<Credentials>(`/provisioning/${id}/reset-admin-password`, { method: 'POST' }),

  // ---- feature entitlements
  features: (tenantId: number) => request<FeatureFlag[]>(`/tenants/${tenantId}/features`),
  setFeature: (tenantId: number, key: string, enabled: boolean) =>
    request<FeatureFlag[]>(`/tenants/${tenantId}/features/${key}`, { method: 'PUT', body: { enabled } }),

  // ---- platform users
  platformUsers: () => request<PlatformUser[]>('/platform-users'),
  createPlatformUser: (body: { name: string; email: string; role: PlatformRole }) => request<PlatformUser>('/platform-users', { method: 'POST', body }),
  updatePlatformUser: (id: number, body: Partial<Pick<PlatformUser, 'name' | 'role' | 'status'>>) =>
    request<PlatformUser>(`/platform-users/${id}`, { method: 'PATCH', body }),
  resetPlatformUserPassword: (id: number) => request<PlatformUser>(`/platform-users/${id}/reset-password`, { method: 'POST' }),
  deletePlatformUser: (id: number) => request<void>(`/platform-users/${id}`, { method: 'DELETE' }),

  // ---- audit logs
  auditLogs: (params: { q?: string; category?: string; page?: number; pageSize?: number }) => request<AuditPage>('/audit-logs', { params }),
  exportAuditLogs: (params: { q?: string; category?: string }) => download('/audit-logs/export', 'audit-logs.csv', params),

  // ---- settings
  settings: () => request<SettingsData>('/settings'),
  updateSettings: (body: { config?: Partial<PlatformConfig>; featureToggles?: Record<string, boolean> }) =>
    request<SettingsData>('/settings', { method: 'PUT', body }),
  resetSettings: () => request<SettingsData>('/settings/reset', { method: 'POST' }),
  flushSessions: () => request<void>('/settings/flush-sessions', { method: 'POST' }),
}
