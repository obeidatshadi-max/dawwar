import BottomNav from './BottomNav'

export default function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-brand-bg pb-20">
      {children}
      <BottomNav />
    </div>
  )
}
