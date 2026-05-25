import { useState, useEffect } from 'react'
import { getUsers, createUser, updateUser, deleteUser } from '../api'
import { useAuth } from '../context/AuthContext'
import { Plus, Pencil, Trash2, X, ShieldCheck, Briefcase, User } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const ROLES = [
  { value: 'ADMIN',   label: 'Quản trị viên', icon: ShieldCheck, color: '#EF4444', bg: '#FEF2F2' },
  { value: 'MANAGER', label: 'Quản lý',        icon: Briefcase,   color: '#2563EB', bg: '#EFF6FF' },
  { value: 'STAFF',   label: 'Nhân viên',      icon: User,        color: '#10B981', bg: '#ECFDF5' },
]

const EMPTY_FORM = { username: '', full_name: '', password: '', role: 'STAFF' }

export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm]       = useState(EMPTY_FORM)
  const [saving, setSaving]   = useState(false)

  const load = () => getUsers().then(r => setUsers(r.data)).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const openCreate = () => { setForm(EMPTY_FORM); setEditTarget(null); setModal('create') }
  const openEdit   = (u) => {
    setForm({ username: u.username, full_name: u.full_name || '', password: '', role: u.role })
    setEditTarget(u); setModal('edit')
  }
  const closeModal = () => { setModal(null); setEditTarget(null) }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.username.trim())  return toast.error('Tên đăng nhập không được trống')
    if (!form.full_name.trim()) return toast.error('Họ tên nhân viên không được trống')
    if (modal === 'create' && !form.password) return toast.error('Mật khẩu không được trống')
    setSaving(true)
    try {
      if (modal === 'create') {
        await createUser({ username: form.username, full_name: form.full_name, password: form.password, role: form.role })
        toast.success('Tạo tài khoản thành công')
      } else {
        const payload = { username: form.username, full_name: form.full_name, role: form.role }
        if (form.password) payload.password = form.password
        await updateUser(editTarget.id, payload)
        toast.success('Cập nhật thành công')
      }
      closeModal(); load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Có lỗi xảy ra')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (u) => {
    if (u.id === currentUser?.id) return toast.error('Không thể xóa tài khoản của chính mình')
    if (!confirm(`Xóa người dùng "${u.full_name || u.username}"?`)) return
    try {
      await deleteUser(u.id)
      toast.success('Đã xóa người dùng')
      load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Không thể xóa')
    }
  }

  const roleInfo = (role) => ROLES.find(r => r.value === role)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Người dùng</h1>
          <p className="page-subtitle">{users.length} tài khoản</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16}/> Tạo người dùng
        </button>
      </div>

      {/* Role stats */}
      <div className="user-role-stats">
        {ROLES.map(role => {
          const count = users.filter(u => u.role === role.value).length
          const Icon = role.icon
          return (
            <div key={role.value} className="stat-card">
              <div className="stat-icon" style={{ background: role.bg }}>
                <Icon size={20} style={{ color: role.color }}/>
              </div>
              <div className="stat-info">
                <span className="stat-value">{count}</span>
                <span className="stat-label">{role.label}</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="card">
        {loading ? <div className="loading-spinner"/> : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Họ tên</th>
                  <th>Tên đăng nhập</th>
                  <th>Vai trò</th>
                  <th>Ngày tạo</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const role = roleInfo(u.role)
                  const Icon = role?.icon || User
                  return (
                    <tr key={u.id}>
                      {/* Họ tên */}
                      <td>
                        <div className="user-row">
                          <div className="user-avatar-sm" style={{ background: role?.bg, color: role?.color }}>
                            {(u.full_name || u.username)[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold">{u.full_name || <span style={{color:'#9CA3AF',fontStyle:'italic'}}>Chưa đặt tên</span>}</div>
                            {u.id === currentUser?.id && <div className="text-muted text-sm">(Bạn)</div>}
                          </div>
                        </div>
                      </td>
                      {/* Username */}
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: 13, background: '#F3F4F6', padding: '2px 8px', borderRadius: 6 }}>
                          {u.username}
                        </span>
                      </td>
                      <td>
                        <span className="badge" style={{ background: role?.bg, color: role?.color }}>
                          <Icon size={12}/> {role?.label}
                        </span>
                      </td>
                      <td>{format(new Date(u.created_at), 'dd/MM/yyyy')}</td>
                      <td>
                        <div className="action-buttons">
                          <button className="btn-icon btn-icon-edit" onClick={() => openEdit(u)}><Pencil size={14}/></button>
                          {u.id !== currentUser?.id && (
                            <button className="btn-icon btn-icon-delete" onClick={() => handleDelete(u)}><Trash2 size={14}/></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal create / edit */}
      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modal === 'create' ? 'Tạo tài khoản mới' : 'Cập nhật tài khoản'}</h2>
              <button className="modal-close" onClick={closeModal}><X size={18}/></button>
            </div>
            <div className="modal-body">

              {/* Họ tên nhân viên */}
              <div className="form-group">
                <label>Họ và tên nhân viên <span className="required">*</span></label>
                <input
                  value={form.full_name}
                  onChange={e => set('full_name', e.target.value)}
                  placeholder="VD: Nguyễn Văn An"
                />
              </div>

              {/* Tên đăng nhập */}
              <div className="form-group">
                <label>Tên đăng nhập <span className="required">*</span></label>
                <input
                  value={form.username}
                  onChange={e => set('username', e.target.value)}
                  placeholder="VD: nguyenvanan  (không dấu, không khoảng trắng)"
                  style={{ fontFamily: 'monospace' }}
                />
                <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
                  Dùng để đăng nhập vào hệ thống
                </div>
              </div>

              {/* Mật khẩu */}
              <div className="form-group">
                <label>
                  Mật khẩu{' '}
                  {modal === 'edit' && <span className="text-muted">(để trống = không đổi)</span>}
                  {modal === 'create' && <span className="required">*</span>}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder={modal === 'create' ? 'Nhập mật khẩu' : 'Mật khẩu mới...'}
                />
              </div>

              {/* Vai trò */}
              <div className="form-group">
                <label>Vai trò</label>
                <div className="role-selector">
                  {ROLES.map(role => {
                    const Icon = role.icon
                    return (
                      <div
                        key={role.value}
                        className={`role-option ${form.role === role.value ? 'selected' : ''}`}
                        style={form.role === role.value ? { borderColor: role.color, background: role.bg } : {}}
                        onClick={() => set('role', role.value)}
                      >
                        <Icon size={18} style={{ color: role.color }}/>
                        <span>{role.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeModal}>Hủy</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Đang lưu...' : (modal === 'create' ? 'Tạo tài khoản' : 'Lưu thay đổi')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}