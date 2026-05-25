import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, Package, ArrowDownCircle, ArrowUpCircle,
  History, Users, LogOut, Bell, ChevronRight, FileText, ClipboardList,
  MessageSquare
} from 'lucide-react'
import ChatWidget from './ChatWidget'
import { useState } from 'react'

const navItems = [
  { to: '/', label: 'Tổng quan', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
  // Admin
  { to: '/users', label: 'Người dùng', icon: Users, roles: ['ADMIN'] },
  // Manager — chỉ các chức năng quản lý, không có Nhập/Xuất kho hay Nhập liệu
  { to: '/products',     label: 'Sản phẩm',          icon: Package,  roles: ['MANAGER'] },
  { to: '/vouchers',     label: 'Phiếu kho',          icon: FileText, roles: ['MANAGER'] },
  { to: '/transactions', label: 'Lịch sử giao dịch', icon: History,  roles: ['MANAGER'] },
  { to: '/alerts',       label: 'Cảnh báo',           icon: Bell,     roles: ['MANAGER'] },
  // Staff
  { to: '/vouchers',      label: 'Phiếu kho', icon: FileText,      roles: ['STAFF'] },
  { to: '/staff-entries', label: 'Nhập liệu', icon: ClipboardList, roles: ['STAFF'] },
]

const ROLE_LABELS = { ADMIN: 'Quản trị viên', MANAGER: 'Quản lý', STAFF: 'Nhân viên' }
const ROLE_COLORS = { ADMIN: '#EF4444', MANAGER: '#2563EB', STAFF: '#10B981' }

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [chatOpen, setChatOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/login') }
  const visibleItems = navItems.filter(item => item.roles.includes(user?.role))

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img
            src="/bhd-logo.jpg"
            alt="Bách Hoá Đỏ"
            style={{ height: 200, width: 'auto', objectFit: 'contain', borderRadius: 8, display: 'block' }}
          />
        </div>

        <nav className="sidebar-nav">
          {visibleItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={18} />
              <span>{label}</span>
              <ChevronRight size={14} className="nav-arrow" />
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{(user?.full_name || user?.username)?.[0]?.toUpperCase()}</div>
            <div className="user-details">
              <span className="user-name">{user?.full_name || user?.username}</span>
              <span className="user-role" style={{ color: ROLE_COLORS[user?.role] }}>{ROLE_LABELS[user?.role]}</span>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout} title="Đăng xuất">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Chat FAB — cố định góc dưới phải */}
      <button
        onClick={() => setChatOpen(v => !v)}
        title="Chat nhóm"
        style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 1000,
          width: 54, height: 54, borderRadius: '50%',
          background: '#1E40AF', color: 'white',
          border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(30,64,175,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.2s, transform 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#1D4ED8'}
        onMouseLeave={e => e.currentTarget.style.background = '#1E40AF'}
      >
        <MessageSquare size={22} />
      </button>
      <main className="main-content">{children}</main>
      {chatOpen && <ChatWidget onClose={() => setChatOpen(false)} />}
    </div>
  )
}