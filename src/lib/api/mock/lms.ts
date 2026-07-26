import type { Paginated, PaginationParams } from '../types'
import type { MockRegistry } from './index'

interface Lesson {
  id: string; title: string; type: 'video' | 'text' | 'pdf'
  duration: number; url: string; hasTranscript: boolean; hasCaption: boolean; content: string
}

interface QuizQuestion {
  id: string; text: string; options: string[]; correctIndex: number
}

interface Course {
  id: string; title: string; description: string; category: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  status: 'draft' | 'published'
  lessons: Lesson[]; lessonCount: number
  passThreshold: number; quizQuestions: QuizQuestion[]
  certificateEnabled: boolean; certificateTemplate: string
  enrollmentCount: number; completionCount: number
  createdAt: string; updatedAt: string
}

const store: Course[] = [
  {
    id: 'course-1', title: 'Introduction to Sustainable Tourism', description: 'Learn the fundamentals of sustainable tourism in Kenya and how to promote eco-friendly travel practices.', category: 'sustainability',
    difficulty: 'beginner', status: 'published',
    lessons: [
      { id: 'l1', title: 'What is Sustainable Tourism?', type: 'video', duration: 12, url: '/videos/sustainable-intro.mp4', hasTranscript: true, hasCaption: true, content: '' },
      { id: 'l2', title: 'Kenyan Ecosystems Overview', type: 'text', duration: 20, url: '', hasTranscript: false, hasCaption: false, content: 'Kenya is home to diverse ecosystems...' },
      { id: 'l3', title: 'Community-Based Tourism', type: 'video', duration: 18, url: '/videos/community-tourism.mp4', hasTranscript: true, hasCaption: true, content: '' },
      { id: 'l4', title: 'Conservation Impact Field Guide', type: 'pdf', duration: 15, url: '/pdfs/impact-guide.pdf', hasTranscript: false, hasCaption: false, content: '' },
      { id: 'l5', title: 'Responsible Travel Pledge', type: 'text', duration: 10, url: '', hasTranscript: false, hasCaption: false, content: 'Take the pledge to travel responsibly...' },
    ], lessonCount: 5,
    passThreshold: 70, quizQuestions: [
      { id: 'q1', text: 'What is the primary goal of sustainable tourism?', options: ['Maximize visitor numbers', 'Minimize environmental impact while benefiting local communities', 'Build luxury resorts', 'Promote international airline travel'], correctIndex: 1 },
      { id: 'q2', text: 'Which Kenyan ecosystem is known for the Great Migration?', options: ['Mount Kenya', 'Lake Turkana', 'Maasai Mara', 'Tsavo'], correctIndex: 2 },
      { id: 'q3', text: 'What is a key principle of community-based tourism?', options: ['All profits go to tour operators', 'Local communities share in benefits and decision-making', 'Tourists stay in international hotel chains', 'Wildlife is relocated to zoos'], correctIndex: 1 },
    ],
    certificateEnabled: true, certificateTemplate: 'standard',
    enrollmentCount: 324, completionCount: 198, createdAt: '2025-05-01T00:00:00Z', updatedAt: '2025-07-20T00:00:00Z',
  },
  {
    id: 'course-2', title: 'Wildlife Conservation Basics', description: 'Understand key conservation principles, species protection, and the role of Kenyan ecosystems in global biodiversity.', category: 'conservation',
    difficulty: 'intermediate', status: 'published',
    lessons: [
      { id: 'l6', title: 'Biodiversity Hotspots of Kenya', type: 'video', duration: 22, url: '/videos/biodiversity.mp4', hasTranscript: true, hasCaption: true, content: '' },
      { id: 'l7', title: 'Endangered Species Monitoring', type: 'text', duration: 25, url: '', hasTranscript: false, hasCaption: false, content: 'Monitoring techniques for endangered species...' },
      { id: 'l8', title: 'Anti-Poaching Technologies', type: 'video', duration: 15, url: '/videos/anti-poaching.mp4', hasTranscript: false, hasCaption: true, content: '' },
    ], lessonCount: 3,
    passThreshold: 75, quizQuestions: [
      { id: 'q4', text: 'What is the most significant threat to black rhinos in Kenya?', options: ['Habitat loss', 'Poaching', 'Climate change', 'Invasive species'], correctIndex: 1 },
      { id: 'q5', text: 'How many national parks does Kenya have?', options: ['22', '34', '47', '55'], correctIndex: 1 },
    ],
    certificateEnabled: true, certificateTemplate: 'standard',
    enrollmentCount: 215, completionCount: 144, createdAt: '2025-05-10T00:00:00Z', updatedAt: '2025-07-18T00:00:00Z',
  },
  {
    id: 'course-3', title: 'Digital Storytelling for Eco-Tourism', description: 'Learn to create compelling travel content — from photography to short-form video — that promotes sustainable tourism.', category: 'content',
    difficulty: 'advanced', status: 'draft',
    lessons: [
      { id: 'l9', title: 'Mobile Photography Techniques', type: 'video', duration: 18, url: '/videos/mobile-photo.mp4', hasTranscript: true, hasCaption: true, content: '' },
      { id: 'l10', title: 'Ethical Storytelling Guidelines', type: 'text', duration: 15, url: '', hasTranscript: false, hasCaption: false, content: 'Guidelines for ethical storytelling...' },
    ], lessonCount: 2,
    passThreshold: 80, quizQuestions: [
      { id: 'q6', text: 'What should you always do before photographing a local community member?', options: ['Use a zoom lens', 'Ask for consent', 'Wait until dark', 'Edit them out'], correctIndex: 1 },
    ],
    certificateEnabled: false, certificateTemplate: 'none',
    enrollmentCount: 12, completionCount: 3, createdAt: '2025-06-15T00:00:00Z', updatedAt: '2025-07-22T00:00:00Z',
  },
]

let nextId = store.length + 1
let nextLessonId = store.reduce((max, c) => Math.max(max, ...c.lessons.map(l => parseInt(l.id.replace('l', '')))), 0) + 1

const handlers: MockRegistry = {
  list(): Paginated<Record<string, unknown>> {
    return { items: store as unknown as Record<string, unknown>[], nextCursor: null, hasMore: false }
  },
  get(id: string) {
    return store.find(c => c.id === id) ?? store[0]
  },
  create(body: unknown) {
    const input = body as Partial<Course>
    const now = new Date().toISOString()
    const item: Course = {
      id: `course-${nextId++}`, title: input.title ?? '', description: input.description ?? '', category: input.category ?? '',
      difficulty: input.difficulty ?? 'beginner', status: 'draft',
      lessons: [], lessonCount: 0, passThreshold: 70, quizQuestions: [],
      certificateEnabled: false, certificateTemplate: 'standard',
      enrollmentCount: 0, completionCount: 0, createdAt: now, updatedAt: now,
    }
    store.push(item)
    return item
  },
  update(id: string, patch: unknown) {
    const idx = store.findIndex(c => c.id === id)
    if (idx === -1) throw new Error('Not found')
    store[idx] = { ...store[idx], ...(patch as Partial<Course>), updatedAt: new Date().toISOString() } as Course
    store[idx].lessonCount = store[idx].lessons.length
    return store[idx]
  },
  remove(id: string) {
    const idx = store.findIndex(c => c.id === id)
    if (idx !== -1) store.splice(idx, 1)
  },
}

export default handlers
