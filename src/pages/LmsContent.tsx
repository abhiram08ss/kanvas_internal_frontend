import { useEffect, useState } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { Tabs } from '../components/ui/Tabs'
import { CoursesTab } from '../components/lms-content/CoursesTab'
import { ModulesTab } from '../components/lms-content/ModulesTab'
import { QuizQuestionsTab } from '../components/lms-content/QuizQuestionsTab'
import { CertificateTemplatesTab } from '../components/lms-content/CertificateTemplatesTab'
import { useData, useDataNeeds, type DataKey } from '../context/DataContext'

const tabs = ['Courses', 'Modules', 'Quiz Questions', 'Certificate Templates']

// What each tab reads. Only the open tab's lists are fetched, the first time it is opened.
const tabNeeds: Record<string, DataKey[]> = {
  // courseModules + quizQuestions too: a course's own "Preview" walks through its modules and quiz
  // alongside its certificate template, so the Courses tab needs all three (see CoursePreviewModal.tsx).
  Courses: ['courses', 'certificateTemplates', 'courseModules', 'quizQuestions'],
  Modules: ['courses', 'editableCourses', 'courseModules'],
  'Quiz Questions': ['courses', 'editableCourses', 'quizQuestions', 'courseModules'],
  'Certificate Templates': ['certificateTemplates'],
}

export default function LmsContent() {
  const { editableCourses } = useData()
  const [tab, setTab] = useState(tabs[0])
  useDataNeeds('courses', ...(tabNeeds[tab] ?? []))
  // Shared across the Modules/Quiz Questions tabs so switching between them keeps the same course picked.
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)

  // Auto-select the first course once the picker's own list finishes loading; never clobbers a manual
  // pick afterwards. `editableCourses` (not `courses`) so a Content User whose only courses are still
  // drafts/pending still gets one auto-selected, instead of nothing happening until they click one.
  useEffect(() => {
    if (selectedCourseId === null && editableCourses.length > 0) setSelectedCourseId(editableCourses[0].id)
  }, [editableCourses, selectedCourseId])

  return (
    <AppLayout title="LMS Course Content" subtitle="Edit Courses, Modules, Quiz Questions & Certificate Templates">
      <div className="d-flex flex-column h-100">
        <div className="flex-shrink-0">
          <Tabs tabs={tabs} active={tab} onChange={setTab} />
        </div>
        <div className="flex-grow-1" style={{ minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
          {tab === 'Courses' && <CoursesTab />}
          {tab === 'Modules' && <ModulesTab selectedCourseId={selectedCourseId} onSelectCourse={setSelectedCourseId} />}
          {tab === 'Quiz Questions' && <QuizQuestionsTab selectedCourseId={selectedCourseId} onSelectCourse={setSelectedCourseId} />}
          {tab === 'Certificate Templates' && <CertificateTemplatesTab />}
        </div>
      </div>
    </AppLayout>
  )
}
