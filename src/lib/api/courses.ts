import type { ApiConfig } from './client'
import { apiRequest } from './client'
import type { Paginated, PaginationParams } from './types'

export interface Lesson {
  id: string
  title: string
  type: 'video' | 'text' | 'pdf'
  duration: number
  url: string
  hasTranscript: boolean
  hasCaption: boolean
}

export interface QuizQuestion {
  id: string
  text: string
  options: string[]
  correctIndex: number
}

export interface Course {
  id: string
  title: string
  description: string
  category: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  status: 'draft' | 'published'
  lessons: Lesson[]
  lessonCount: number
  passThreshold: number
  quizQuestions: QuizQuestion[]
  certificateEnabled: boolean
  certificateTemplate: string
  enrollmentCount: number
  completionCount: number
  createdAt: string
  updatedAt: string
}

export function coursesApi(config: ApiConfig) {
  return {
    list: (params?: PaginationParams) =>
      apiRequest<Paginated<Course>>(config, '/v1/courses', { params }),
    get: (id: string) =>
      apiRequest<Course>(config, `/v1/courses/${id}`),
    create: (body: Record<string, unknown>) =>
      apiRequest<{ id: string }>(config, '/v1/courses', { method: 'POST', body }),
    update: (id: string, patch: Record<string, unknown>) =>
      apiRequest<Course>(config, `/v1/courses/${id}`, { method: 'PATCH', body: patch }),
    remove: (id: string) =>
      apiRequest<void>(config, `/v1/courses/${id}`, { method: 'DELETE' }),
  }
}
