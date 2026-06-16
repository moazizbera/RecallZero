"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import useSWR from "swr"
import { BrandLockup } from "@/components/brand-logo"
import { cn } from "@/lib/utils"

type SessionResponse = {
  authenticated: boolean
  session: null | {
    email: string
    role: "admin" | "operator" | "reviewer" | "viewer"
  }
}

type IncidentsResponse = { incidents?: unknown[] }

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) return null
  return response.json()
}

const appMode = process.env.NEXT_PUBLIC_RECALLZERO_MODE || "demo"
const modeLabel = appMode === "production" ? "Production" : "Live review"

export function SiteHeader() {
  const pathname = usePathname()
  const { data: sessionData } = useSWR<SessionResponse | null>("/api/auth/session", fetcher)
  const authenticated = Boolean(sessionData?.authenticated)
  const role = sessionData?.session?.role
  const { data: incidentsData } = useSWR<IncidentsResponse | null>(authenticated ? "/api/incidents" : null, fetcher)
  const incidentCount = incidentsData?.incidents?.length || 0
  const hasIncidents = incidentCount > 0

  const nav = authenticated
    ? [
        { href: "/?skipSplash=1", label: "Analyze" },
        { href: "/setup", label: "Setup" },
        { href: "/connectors?mode=configure", label: "Connectors" },
        { href: "/dashboard", label: "Dashboard", disabled: !hasIncidents },
        { href: "/incidents", label: `Incidents${hasIncidents ? ` (${incidentCount})` : ""}`, disabled: !hasIncidents },
        { href: "/settings", label: "Settings" },
        ...(role === "admin" ? [{ href: "/admin", label: "Admin" }] : []),
      ]
    : [
        { href: "/judge", label: "Judge" },
        { href: "/brief", label: "Brief" },
        { href: "/pricing", label: "Pricing" },
      ]

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" })
    window.location.assign("/")
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur supports-backdrop-filter:bg-background/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandLockup animated markClassName="h-8 w-8 rounded-lg" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => {
            const itemPath = item.href.split("?")[0]
            const active = itemPath === "/" ? pathname === "/" : pathname.startsWith(itemPath)
            if (item.disabled) {
              return (
                <span
                  key={item.href}
                  title="Create or route an incident first"
                  className="cursor-not-allowed rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground/45"
                >
                  {item.label}
                </span>
              )
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-2.5 py-1 text-xs font-medium text-success sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            {modeLabel} · DynamoDB live
          </span>
          {authenticated ? (
            <button
              type="button"
              onClick={signOut}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign out
            </button>
          ) : (
            <>
              <Link
                href="/signin"
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  pathname.startsWith("/signin")
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
