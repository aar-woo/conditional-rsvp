import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Zap, Users, CheckCircle2, Sparkles } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <Zap className="h-5 w-5 text-green-500" />
            <span>Greenlight</span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">Get started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 rounded-full px-4 py-1 text-sm font-medium mb-6">
          <Sparkles className="h-3.5 w-3.5" />
          Conditional RSVPs for real life
        </div>
        <h1 className="text-5xl font-bold tracking-tight mb-6">
          Only go if the vibe is right
        </h1>
        <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
          Greenlight lets you RSVP with conditions — &ldquo;I&apos;ll go if Alex is going&rdquo; or
          &ldquo;I&apos;ll go if at least 5 people show up.&rdquo; When conditions are met, everyone gets
          the greenlight automatically.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/signup">Start planning for free</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 pb-24 grid sm:grid-cols-3 gap-8">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <h3 className="font-semibold">Conditional RSVPs</h3>
          <p className="text-sm text-muted-foreground">
            Set your conditions. The system resolves them automatically when they&apos;re met.
          </p>
        </div>
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <h3 className="font-semibold">Smart invites</h3>
          <p className="text-sm text-muted-foreground">
            Invite friends by username, email, or phone. SMS links bring anyone on board.
          </p>
        </div>
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-950 flex items-center justify-center">
              <Zap className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <h3 className="font-semibold">Real-time updates</h3>
          <p className="text-sm text-muted-foreground">
            See attendee status update live. Know instantly when the event is greenlit.
          </p>
        </div>
      </section>
    </div>
  )
}
