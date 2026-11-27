'use client'

import { createContext, useContext } from 'react'
import type { User } from '@/lib/types'

/** The signed-in user, loaded once by the root layout and shared with pages. */
export const CurrentUserContext = createContext<User | null>(null)

export function useCurrentUser() {
  return useContext(CurrentUserContext)
}

export function canManageTahfiz(user: User | null | undefined) {
  return user?.role === 'admin' || user?.role === 'super_admin'
}
