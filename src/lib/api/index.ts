import type { ApiConfig } from './client'
import { destinationsApi } from './destinations'
import { eventsApi } from './events'
import { coursesApi } from './courses'
import { conservationApi } from './conservation'
import { campaignsApi } from './campaigns'
import { storiesApi } from './stories'
import { mediaApi } from './media'
import { pushApi } from './push'
import { challengesApi } from './challenges'
import { analyticsApi } from './analytics'
import { usersApi } from './users'

export type { ApiConfig } from './client'

export function createApiClient(config: ApiConfig) {
  return {
    destinations: destinationsApi(config),
    events: eventsApi(config),
    courses: coursesApi(config),
    conservation: conservationApi(config),
    campaigns: campaignsApi(config),
    stories: storiesApi(config),
    media: mediaApi(config),
    push: pushApi(config),
    challenges: challengesApi(config),
    analytics: analyticsApi(config),
    users: usersApi(config),
  }
}

export type ApiClient = ReturnType<typeof createApiClient>
