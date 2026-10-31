import { redirect } from 'next/navigation'

export default function RegistrationPage() {
  redirect('/manage?section=registration')
}
