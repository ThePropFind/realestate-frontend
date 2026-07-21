'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/authStore'
import { Menu, X, LogOut, PlusCircle, LayoutDashboard, Heart, ChevronDown, User } from 'lucide-react'
import NotificationsBell from './NotificationsBell'

const NAV_LINKS: [string, string][] = [
  ['Buy', '/properties?listingType=SALE'],
  ['Rent', '/properties?listingType=RENT'],
  ['PG / Co-living', '/properties?listingType=PG'],
  ['Post property', '/post-property'],
]

export default function Navbar() {
  const { isLoggedIn, user, logout, _hasHydrated } = useAuthStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropOpen, setDropOpen] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!dropOpen) return
    function handleOutside(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [dropOpen])

  function handleLogout() { logout(); router.push('/') }

  return (
    <nav className="bg-brand-900 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        <Link href="/" className="flex items-center">
          <span className="text-xl font-bold text-white">Prop</span>
          <span className="text-xl font-bold text-accent-400">Find</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(([label, href]) => (
            <Link key={href} href={href} className="text-sm font-medium text-white/85 hover:text-white transition-colors">{label}</Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {/* Render nothing until Zustand hydrates to avoid flashing Login/Register
              buttons for users who are already signed in. */}
          {_hasHydrated && isLoggedIn && user ? (
            <>
              <NotificationsBell />
              <div className="relative" ref={dropRef}>
                <button onClick={() => setDropOpen(!dropOpen)}
                  className="flex items-center gap-2 text-sm border border-white/25 rounded-full pl-2 pr-3 py-1.5 text-white hover:bg-white/10 transition-colors">
                  <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-white">
                    <User size={15} />
                  </div>
                  <span className="max-w-[120px] truncate">{user.name}</span>
                  <ChevronDown size={15} className="text-white/70" />
                </button>
                {dropOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-xl shadow-card py-1 z-50">
                    <Link href="/dashboard" onClick={() => setDropOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                      <LayoutDashboard size={14} /> My listings
                    </Link>
                    <Link href="/saved" onClick={() => setDropOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                      <Heart size={14} /> Saved
                    </Link>
                    <Link href="/post-property" onClick={() => setDropOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                      <PlusCircle size={14} /> Post property
                    </Link>
                    {user.role === 'ADMIN' && (
                      <Link href="/admin" onClick={() => setDropOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-brand-600 hover:bg-slate-50">
                        <LayoutDashboard size={14} /> Admin panel
                      </Link>
                    )}
                    <hr className="my-1 border-slate-100" />
                    <button onClick={handleLogout}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-slate-50">
                      <LogOut size={14} /> Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : _hasHydrated ? (
            <>
              <Link href="/auth/login" className="text-sm font-medium text-white/90 hover:text-white px-4 py-2 rounded-xl border border-white/25 hover:bg-white/10 transition-colors">Login</Link>
              <Link href="/auth/register" className="text-sm font-medium text-white bg-accent-400 hover:bg-accent-600 px-4 py-2 rounded-xl transition-colors">Register</Link>
            </>
          ) : null}
        </div>

        <button className="md:hidden p-2 text-white" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-white/10 bg-brand-900 px-4 pb-4 pt-2 space-y-1">
          {NAV_LINKS.map(([label, href]) => (
            <Link key={href} href={href} className="block py-2 text-sm text-white/90" onClick={() => setMenuOpen(false)}>{label}</Link>
          ))}
          {_hasHydrated && isLoggedIn ? (
            <>
              <Link href="/dashboard" className="block py-2 text-sm text-white/90" onClick={() => setMenuOpen(false)}>My listings</Link>
              <Link href="/saved" className="block py-2 text-sm text-white/90" onClick={() => setMenuOpen(false)}>Saved</Link>
              <button onClick={handleLogout} className="block py-2 text-sm text-red-300 w-full text-left">Logout</button>
            </>
          ) : _hasHydrated ? (
            <div className="flex gap-2 pt-2">
              <Link href="/auth/login"    className="flex-1 text-center text-sm font-medium text-white px-4 py-2 rounded-xl border border-white/25" onClick={() => setMenuOpen(false)}>Login</Link>
              <Link href="/auth/register" className="flex-1 text-center text-sm font-medium text-white bg-accent-400 px-4 py-2 rounded-xl" onClick={() => setMenuOpen(false)}>Register</Link>
            </div>
          ) : null}
        </div>
      )}
    </nav>
  )
}
