import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '▦' },
  { to: '/interns', label: 'Interns', icon: '👤' },
  { to: '/interns?status=Allotted', label: 'Allotted', icon: '✔' },
  { to: '/guides', label: 'Guides', icon: '🎓' },
  { to: '/waitlist', label: 'Waitlist', icon: '⏳' },
  { to: '/project-review', label: 'Project Review', icon: '📊' },
  { to: '/smart-card-attendance', label: 'Smart Card Attendance', icon: '💳' },
  { to: '/attendance-evaluation', label: 'Attendance Evaluation', icon: '📋' },
  { to: '/guide-feedback', label: 'Guide Feedback', icon: '👨‍🏫' },
  { to: '/final-evaluation', label: 'Final Internship Evaluation', icon: '🏅' },
];

export default function Layout() {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-tata-navy text-white flex flex-col shrink-0">
        {/* Brand */}
        <div className="px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-tata-orange flex items-center justify-center font-bold text-white text-sm">
              TM
            </div>
            <div>
              <p className="font-semibold text-sm leading-tight">Tata Motors</p>
              <p className="text-xs text-white/60 leading-tight">Pimpri Plant · HR</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-white/15 text-white font-medium'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <span className="text-base">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10">
          <p className="text-xs text-white/40">Intern Guide Matching v1.0</p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
