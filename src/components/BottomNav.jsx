import { NavLink } from 'react-router-dom'
import { useUnreadCount } from '../hooks/useMessages'

const TABS = [
  {
    to: '/feed',
    label: 'الرئيسية',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    to: '/messages',
    label: 'الرسائل',
    showBadge: true,
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    to: '/networks',
    label: 'شبكاتي',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    to: '/profile',
    label: 'حسابي',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
]

export default function BottomNav() {
  const unread = useUnreadCount()

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-brand-card border-t border-brand-border z-20">
      <div className="flex">
        {TABS.map(({ to, label, icon, showBadge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-3 gap-0.5 text-xs transition-colors ${
                isActive ? 'text-brand-primary' : 'text-brand-muted'
              }`
            }
          >
            <div className="relative">
              {icon}
              {showBadge && unread > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-offer rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </div>
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
