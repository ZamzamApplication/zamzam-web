'use client'

import { useParams } from 'next/navigation'
import CompetitionWorkspace from '@/components/competitions/CompetitionWorkspace'

export default function CompetitionPage() {
  const { id } = useParams()
  return <CompetitionWorkspace key={String(id)} competitionId={Number(id)} />
}
