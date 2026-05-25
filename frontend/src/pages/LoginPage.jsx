import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { login as apiLogin, getMe } from '../api'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await apiLogin(form)
      const token = res.data.access_token
      localStorage.setItem('token', token)  // ✅ lưu token trước
      const meRes = await getMe()            // axios đọc được token → 200 OK
      login(token, meRes.data)
      toast.success(`Xin chào, ${meRes.data.full_name || meRes.data.username}!`)
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Đăng nhập thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">
          <img src="/bhd-logo.jpg" alt="Bách Hoá Đỏ"
            style={{ height: 72, width: 'auto', objectFit: 'contain', borderRadius: 10 }} />
          <span>BHD Storage</span>
        </div>
        <h1>Đăng nhập hệ thống</h1>
        <p className="login-subtitle">Hệ thống quản lý kho - Bách Hoá Đỏ</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Tên đăng nhập</label>
            <input
              type="text"
              placeholder="Nhập tên đăng nhập"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Mật khẩu</label>
            <input
              type="password"
              placeholder="Nhập mật khẩu"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
        <div className="login-hint">
          <p><strong>Demo:</strong> admin / admin123</p>
          <p>manager / manager123 &nbsp;|&nbsp; staff / staff123</p>
        </div>
      </div>
    </div>
  )
}