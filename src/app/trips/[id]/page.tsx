'use client'

import { useParams } from 'next/navigation'
import TripWorkspace from '@/components/trips/TripWorkspace'

export default function TripPage() {
  const { id } = useParams()
  return <TripWorkspace key={String(id)} tripId={Number(id)} />
}
