import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { LogoutButton } from '@/components/LogoutButton'
import { Zap } from 'lucide-react'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <Zap className="h-5 w-5 text-green-500" />
            <span>Greenlight</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link href="/events/new">New Event</Link>
            </Button>
            <LogoutButton />
          </div>
        </div>
      </nav>
      <main className="max-w-4xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
