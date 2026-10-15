import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import {
  api,
  errorMessage,
  type CertificateTemplate,
  type CertificateTemplateInput,
  type Course,
  type CourseCategory,
  type CourseCategoryInput,
  type CourseInput,
  type CourseOptions,
  type CourseModule,
  type CourseModuleInput,
  type PaymentLink,
  type PaymentRecord,
  type Plan,
  type PlanInput,
  type ProvisioningRecord,
  type QuizQuestion,
  type QuizQuestionInput,
  type Subscription,
  type Tenant,
} from '../api'
import { useAuth } from './AuthContext'

/** The lists the app keeps in memory. Each is fetched only when a page asks for it (see `useDataNeeds`). */
interface DataMap {
  tenants: Tenant[]
  plans: Plan[]
  courses: Course[]
  /** A broader list than `courses`: every approved course plus (for a Support Admin) their own not-yet-
   * approved ones too, draft included - what the Modules/Quiz Questions tabs' course picker uses, so a
   * Support Admin can attach a module to their own brand-new draft before a Super Admin ever sees it. */
  editableCourses: Course[]
  /** Not a list like everything else here - the fixed Category/Level choice-lists course forms build
   * their selects from (GET /courses/options). Excluded from `EditableKey`, so `upsert`/`removeById`
   * (which assume a list of `{id}` items) are never called with it. */
  courseOptions: CourseOptions
  /** The capability-framework taxonomy managed on the Course Categories page - distinct from
   * `courseOptions`'s 4 fixed types, which is all a course itself is ever tagged with. */
  courseCategories: CourseCategory[]
  courseModules: CourseModule[]
  quizQuestions: QuizQuestion[]
  certificateTemplates: CertificateTemplate[]
  subscriptions: Subscription[]
  provisioningRecords: ProvisioningRecord[]
  paymentLinks: PaymentLink[]
  paymentHistory: PaymentRecord[]
}
export type DataKey = keyof DataMap

const loaders: { [K in DataKey]: () => Promise<DataMap[K]> } = {
  tenants: () => api.tenants(),
  plans: () => api.plans(),
  courses: () => api.courses(),
  editableCourses: () => api.editableCourses(),
  courseOptions: () => api.courseOptions(),
  courseCategories: () => api.courseCategories(),
  courseModules: () => api.courseModules(),
  quizQuestions: () => api.quizQuestions(),
  certificateTemplates: () => api.certificateTemplates(),
  subscriptions: () => api.subscriptions(),
  provisioningRecords: () => api.provisioning(),
  paymentLinks: () => api.paymentLinks(),
  paymentHistory: () => api.payments(),
}

/** The lists the app edits in place after a create/update/delete (every item has a numeric `id`). */
type EditableKey = 'plans' | 'courses' | 'editableCourses' | 'courseCategories' | 'courseModules' | 'quizQuestions' | 'certificateTemplates'

type Status = 'loading' | 'loaded' | 'error'

// One shared empty array per list, so a list that has not loaded yet is referentially stable.
const EMPTY: never[] = []
const EMPTY_COURSE_OPTIONS: CourseOptions = { categoryTypes: [], levels: [] }

interface DataContextValue {
  tenants: Tenant[]
  plans: Plan[]
  courses: Course[]
  editableCourses: Course[]
  courseOptions: CourseOptions
  courseCategories: CourseCategory[]
  courseModules: CourseModule[]
  quizQuestions: QuizQuestion[]
  certificateTemplates: CertificateTemplate[]
  subscriptions: Subscription[]
  provisioningRecords: ProvisioningRecord[]
  paymentLinks: PaymentLink[]
  paymentHistory: PaymentRecord[]
  /** True while a list a page asked for is being fetched for the first time (or retried after an error). */
  loading: boolean
  error: string | null
  /** Fetch these lists unless they are already loaded or loading. Pages call this through `useDataNeeds`. */
  load: (keys: DataKey[]) => void
  /** Re-fetch the lists already loaded (call after an action that changes several lists, e.g. onboarding a
   *  tenant), or just `keys` when given. Lists no page has asked for yet are not fetched. */
  refresh: (keys?: DataKey[]) => Promise<void>
  addPlan: (plan: PlanInput) => Promise<void>
  updatePlan: (planId: number, updates: Partial<PlanInput>) => Promise<void>
  updatePlanCourses: (planId: number, courseIds: number[]) => Promise<void>
  addCourse: (course: CourseInput) => Promise<void>
  updateCourse: (courseId: number, updates: Partial<CourseInput> & { reason?: string }) => Promise<void>
  addCourseCategory: (category: CourseCategoryInput) => Promise<void>
  updateCourseCategory: (categoryId: number, updates: Partial<CourseCategoryInput> & { status?: CourseCategory['status'] }) => Promise<void>
  addCourseModule: (module: CourseModuleInput) => Promise<void>
  updateCourseModule: (moduleId: number, updates: Partial<CourseModuleInput>) => Promise<void>
  deleteCourseModule: (moduleId: number) => Promise<void>
  addQuizQuestion: (question: QuizQuestionInput) => Promise<void>
  updateQuizQuestion: (questionId: number, updates: Partial<QuizQuestionInput>) => Promise<void>
  deleteQuizQuestion: (questionId: number) => Promise<void>
  addCertificateTemplate: (template: CertificateTemplateInput) => Promise<void>
  updateCertificateTemplate: (templateId: number, updates: Partial<Omit<CertificateTemplateInput, 'name'>> & { reason?: string }) => Promise<void>
}

const DataContext = createContext<DataContextValue | undefined>(undefined)

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id

  const [data, setData] = useState<Partial<DataMap>>({})
  const [status, setStatus] = useState<Partial<Record<DataKey, Status>>>({})
  const [errors, setErrors] = useState<Partial<Record<DataKey, string>>>({})
  // The synchronous source of truth for `status` (state lags a render), plus a counter that lets a fetch
  // started for a previous user drop its result instead of writing it into the next user's session.
  const statusRef = useRef<Partial<Record<DataKey, Status>>>({})
  const generation = useRef(0)

  const setKeyStatus = useCallback((key: DataKey, next: Status | undefined) => {
    if (next === undefined) delete statusRef.current[key]
    else statusRef.current[key] = next
    setStatus({ ...statusRef.current })
  }, [])

  const fetchKeys = useCallback(
    async (keys: DataKey[]) => {
      const gen = generation.current
      await Promise.all(
        keys.map(async (key) => {
          // A refetch of a list already on screen stays quiet; only a first load / retry shows the spinner.
          if (statusRef.current[key] !== 'loaded') setKeyStatus(key, 'loading')
          try {
            const value = await loaders[key]()
            if (gen !== generation.current) return
            setData((prev) => ({ ...prev, [key]: value }))
            setErrors(({ [key]: _cleared, ...rest }) => rest)
            setKeyStatus(key, 'loaded')
          } catch (e) {
            if (gen !== generation.current) return
            setErrors((prev) => ({ ...prev, [key]: errorMessage(e) }))
            setKeyStatus(key, 'error')
          }
        }),
      )
    },
    [setKeyStatus],
  )

  const load = useCallback(
    (keys: DataKey[]) => {
      const missing = keys.filter((k) => statusRef.current[k] !== 'loaded' && statusRef.current[k] !== 'loading')
      if (missing.length > 0) void fetchKeys(missing)
    },
    [fetchKeys],
  )

  const refresh = useCallback(
    async (keys?: DataKey[]) => {
      const targets = (keys ?? (Object.keys(statusRef.current) as DataKey[])).filter((k) => statusRef.current[k] !== 'loading')
      await fetchKeys(targets)
    },
    [fetchKeys],
  )

  // Clear everything when someone signs out; nothing is fetched here - each page loads what it needs when
  // it opens. Signing in must NOT reset: the page that mounts on sign-in has already started its fetch
  // (child layout effects run before this one), and there is nothing stale to clear anyway.
  const previousUserId = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (previousUserId.current !== undefined && userId !== previousUserId.current) {
      generation.current += 1
      statusRef.current = {}
      setData({})
      setStatus({})
      setErrors({})
    }
    previousUserId.current = userId
  }, [userId])

  const loading = Object.values(status).includes('loading')
  const error = Object.values(errors)[0] ?? null

  // Mutations return once the server has accepted the change; errors propagate to the caller's form.
  const upsert = <K extends EditableKey>(key: K, item: DataMap[K][number]) =>
    setData((prev) => {
      const list = (prev[key] ?? EMPTY) as { id: number }[]
      const next = list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item]
      return { ...prev, [key]: next }
    })
  const removeById = (key: EditableKey, id: number) =>
    setData((prev) => ({ ...prev, [key]: ((prev[key] ?? EMPTY) as { id: number }[]).filter((x) => x.id !== id) }))

  const addPlan = async (plan: PlanInput) => upsert('plans', await api.createPlan(plan))
  const updatePlan = async (planId: number, updates: Partial<PlanInput>) => upsert('plans', await api.updatePlan(planId, updates))
  const updatePlanCourses = async (planId: number, courseIds: number[]) => upsert('plans', await api.setPlanCourses(planId, courseIds))
  // The shared `courses` list mirrors GET /courses: approved courses only. A course that comes back
  // draft/pending/rejected (a Support Admin's own submission, or one their edit just sent back for review)
  // is never shown here - it lives in the Course Approvals screen instead (its own fetch, not this list).
  // `editableCourses` always gets it though - the course picker needs to see your own course regardless of
  // its approval status.
  const syncCourse = (course: Course) => {
    if (course.approvalStatus === 'approved') upsert('courses', course)
    else removeById('courses', course.id)
    upsert('editableCourses', course)
  }
  const addCourse = async (course: CourseInput) => syncCourse(await api.createCourse(course))
  const updateCourse = async (courseId: number, updates: Partial<CourseInput> & { reason?: string }) => syncCourse(await api.updateCourse(courseId, updates))

  const addCourseCategory = async (category: CourseCategoryInput) => upsert('courseCategories', await api.createCourseCategory(category))
  const updateCourseCategory = async (categoryId: number, updates: Partial<CourseCategoryInput> & { status?: CourseCategory['status'] }) =>
    upsert('courseCategories', await api.updateCourseCategory(categoryId, updates))

  // Adding a module to a still-draft course auto-promotes it to "pending" on the server (see
  // routers/course_modules.py's create_module) - re-read the course so the picker/Approvals screen pick up
  // its new status right away instead of still showing "draft" until the next full reload.
  const addCourseModule = async (module: CourseModuleInput) => {
    const created = await api.createCourseModule(module)
    upsert('courseModules', created)
    syncCourse(await api.course(module.courseId))
  }
  const updateCourseModule = async (moduleId: number, updates: Partial<CourseModuleInput>) =>
    upsert('courseModules', await api.updateCourseModule(moduleId, updates))
  const deleteCourseModule = async (moduleId: number) => {
    await api.deleteCourseModule(moduleId)
    removeById('courseModules', moduleId)
  }

  // A Content User's quiz change re-submits the course for approval on the server, so pull the course back too.
  const addQuizQuestion = async (question: QuizQuestionInput) => {
    upsert('quizQuestions', await api.createQuizQuestion(question))
    syncCourse(await api.course(question.courseId))
  }
  const updateQuizQuestion = async (questionId: number, updates: Partial<QuizQuestionInput>) => {
    const updated = await api.updateQuizQuestion(questionId, updates)
    upsert('quizQuestions', updated)
    syncCourse(await api.course(updated.courseId))
  }
  const deleteQuizQuestion = async (questionId: number) => {
    const courseId = data.quizQuestions?.find((q) => q.id === questionId)?.courseId
    await api.deleteQuizQuestion(questionId)
    removeById('quizQuestions', questionId)
    if (courseId !== undefined) syncCourse(await api.course(courseId))
  }

  const addCertificateTemplate = async (template: CertificateTemplateInput) => upsert('certificateTemplates', await api.createCertificateTemplate(template))
  const updateCertificateTemplate = async (templateId: number, updates: Partial<Omit<CertificateTemplateInput, 'name'>> & { reason?: string }) =>
    upsert('certificateTemplates', await api.updateCertificateTemplate(templateId, updates))

  return (
    <DataContext.Provider
      value={{
        tenants: data.tenants ?? EMPTY,
        plans: data.plans ?? EMPTY,
        courses: data.courses ?? EMPTY,
        editableCourses: data.editableCourses ?? EMPTY,
        courseOptions: data.courseOptions ?? EMPTY_COURSE_OPTIONS,
        courseCategories: data.courseCategories ?? EMPTY,
        courseModules: data.courseModules ?? EMPTY,
        quizQuestions: data.quizQuestions ?? EMPTY,
        certificateTemplates: data.certificateTemplates ?? EMPTY,
        subscriptions: data.subscriptions ?? EMPTY,
        provisioningRecords: data.provisioningRecords ?? EMPTY,
        paymentLinks: data.paymentLinks ?? EMPTY,
        paymentHistory: data.paymentHistory ?? EMPTY,
        loading,
        error,
        load,
        refresh,
        addPlan,
        updatePlan,
        updatePlanCourses,
        addCourse,
        updateCourse,
        addCourseCategory,
        updateCourseCategory,
        addCourseModule,
        updateCourseModule,
        deleteCourseModule,
        addQuizQuestion,
        updateQuizQuestion,
        deleteQuizQuestion,
        addCertificateTemplate,
        updateCertificateTemplate,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}

/** Declare the lists the calling page needs. They are fetched the first time any page asks (before the page
 *  paints), and never again while they stay loaded - so opening a page only hits that page's own APIs. */
export function useDataNeeds(...keys: DataKey[]) {
  const { load } = useData()
  const signature = keys.join(',')
  useLayoutEffect(() => {
    load(keys)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, signature])
}
