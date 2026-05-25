import { useState, useEffect } from 'react'
import {
  Package, ArrowDownCircle, ArrowUpCircle, AlertTriangle,
  FileText, Users, TrendingUp, TrendingDown, Activity,
  BarChart2, Clock, CheckCircle, XCircle, Layers
} from 'lucide-react'
import { getProducts, getAlerts, getTransactions, getVouchers, getUsers, getTransactionSummary } from '../api'
import { useAuth } from '../context/AuthContext'

// ── Mini bar chart component ─────────────────────────────────────────────────
function MiniBarChart({ data, color = '#2563EB' }) {
  if (!data?.length) return null
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 48 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div style={{
            width: '100%', background: color, opacity: 0.15 + 0.85 * (d.value / max),
            borderRadius: '3px 3px 0 0', height: `${Math.max(4, (d.value / max) * 44)}px`
          }} title={`${d.label}: ${d.value}`} />
        </div>
      ))}
    </div>
  )
}

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, bg, sub, trend }) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 20px' }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={24} color={color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1.1 }}>
          {typeof value === 'number' ? value.toLocaleString('vi-VN') : value}
        </div>
        <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 1 }}>{sub}</div>}
      </div>
      {trend != null && (
        <div style={{ fontSize: 12, fontWeight: 600, color: trend >= 0 ? '#16A34A' : '#DC2626', display: 'flex', alignItems: 'center', gap: 2 }}>
          {trend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
  )
}

// ── Voucher status donut (CSS only) ─────────────────────────────────────────
function VoucherStatusBreakdown({ vouchers }) {
  const counts = { DRAFT: 0, APPROVED: 0, IN_PROGRESS: 0, COMPLETED: 0, INVESTIGATING: 0, CANCELLED: 0 }
  vouchers.forEach(v => { if (counts[v.status] !== undefined) counts[v.status]++ })
  const items = [
    { key: 'DRAFT',        label: 'Nháp',        color: '#9CA3AF' },
    { key: 'APPROVED',     label: 'Đã duyệt',    color: '#2563EB' },
    { key: 'IN_PROGRESS',  label: 'Đang xử lý',  color: '#7C3AED' },
    { key: 'COMPLETED',    label: 'Hoàn tất',     color: '#16A34A' },
    { key: 'INVESTIGATING',label: 'Điều tra',     color: '#EA580C' },
    { key: 'CANCELLED',    label: 'Đã huỷ',       color: '#E5E7EB' },
  ]
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.filter(i => counts[i.key] > 0).map(item => (
        <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
          <div style={{ fontSize: 13, color: '#374151', flex: 1 }}>{item.label}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{counts[item.key]}</div>
          <div style={{ width: 80, height: 6, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: `${(counts[item.key] / total) * 100}%`, height: '100%', background: item.color, borderRadius: 99 }} />
          </div>
        </div>
      ))}
      {total === 1 && <p style={{ color: '#9CA3AF', fontSize: 13 }}>Chưa có phiếu nào</p>}
    </div>
  )
}

// ── Top products by movement ─────────────────────────────────────────────────
function TopProducts({ summary }) {
  const sorted = [...(summary || [])].sort((a, b) => (b.total_in + b.total_out) - (a.total_in + a.total_out)).slice(0, 5)
  if (!sorted.length) return <p style={{ color: '#9CA3AF', fontSize: 13 }}>Chưa có giao dịch nào</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {sorted.map((s, i) => {
        const total = s.total_in + s.total_out || 1
        return (
          <div key={s.product_id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#2563EB', flexShrink: 0 }}>{i + 1}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.product_name}</div>
              <div style={{ height: 5, background: '#F3F4F6', borderRadius: 99, marginTop: 3, overflow: 'hidden' }}>
                <div style={{ display: 'flex', height: '100%' }}>
                  <div style={{ width: `${(s.total_in / total) * 100}%`, background: '#16A34A', borderRadius: '99px 0 0 99px' }} />
                  <div style={{ width: `${(s.total_out / total) * 100}%`, background: '#EA580C' }} />
                </div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: '#16A34A', fontWeight: 600, minWidth: 40, textAlign: 'right' }}>↓{s.total_in}</div>
            <div style={{ fontSize: 12, color: '#EA580C', fontWeight: 600, minWidth: 40, textAlign: 'right' }}>↑{s.total_out}</div>
          </div>
        )
      })}
      <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
        <span style={{ fontSize: 11, color: '#16A34A', display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: '#16A34A' }} /> Nhập
        </span>
        <span style={{ fontSize: 11, color: '#EA580C', display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: '#EA580C' }} /> Xuất
        </span>
      </div>
    </div>
  )
}

// ── Recent transactions table ────────────────────────────────────────────────
function RecentTransactions({ txs }) {
  if (!txs.length) return <p style={{ color: '#9CA3AF', fontSize: 13 }}>Chưa có giao dịch nào.</p>
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#F9FAFB' }}>
            {['Sản phẩm', 'Loại', 'SL', 'Mã phiếu', 'Người TH', 'Ngày'].map(h => (
              <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {txs.slice(0, 8).map(tx => (
            <tr key={tx.id} style={{ borderBottom: '1px solid #F9FAFB' }}>
              <td style={{ padding: '8px 12px', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.product_name}</td>
              <td style={{ padding: '8px 12px' }}>
                <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: tx.type === 'IN' ? '#DCFCE7' : '#FEF3C7', color: tx.type === 'IN' ? '#16A34A' : '#92400E' }}>
                  {tx.type === 'IN' ? '↓ Nhập' : '↑ Xuất'}
                </span>
              </td>
              <td style={{ padding: '8px 12px', fontWeight: 600 }}>{tx.quantity?.toLocaleString('vi-VN')}</td>
              <td style={{ padding: '8px 12px', color: '#6B7280', fontFamily: 'monospace', fontSize: 11 }}>{tx.voucher_code || '—'}</td>
              <td style={{ padding: '8px 12px', color: '#6B7280' }}>{tx.performed_by_name || '—'}</td>
              <td style={{ padding: '8px 12px', color: '#9CA3AF', whiteSpace: 'nowrap' }}>{new Date(tx.transaction_date).toLocaleDateString('vi-VN')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Low stock alert list ──────────────────────────────────────────────────────
function LowStockList({ products }) {
  if (!products.length) return <p style={{ fontSize: 13, color: '#16A34A' }}>✅ Không có sản phẩm sắp hết</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {products.slice(0, 6).map(p => (
        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#FEF2F2', borderRadius: 8, border: '1px solid #FECACA' }}>
          <AlertTriangle size={14} color="#DC2626" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#374151' }}>{p.name}</div>
          <div style={{ fontSize: 13 }}>
            <span style={{ fontWeight: 700, color: '#DC2626' }}>{p.quantity}</span>
            <span style={{ color: '#9CA3AF' }}> / {p.low_stock_threshold} {p.unit}</span>
          </div>
        </div>
      ))}
      {products.length > 6 && <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>+{products.length - 6} sản phẩm khác</p>}
    </div>
  )
}

// ── Vouchers needing attention ───────────────────────────────────────────────
function PendingVouchers({ vouchers }) {
  const pending = vouchers.filter(v => ['DRAFT', 'IN_PROGRESS', 'INVESTIGATING'].includes(v.status))
  if (!pending.length) return <p style={{ fontSize: 13, color: '#16A34A' }}>✅ Không có phiếu cần xử lý</p>
  const STATUS_META = {
    DRAFT:        { label: 'Nháp – chờ duyệt', color: '#9CA3AF', bg: '#F3F4F6' },
    IN_PROGRESS:  { label: 'Đang xử lý',        color: '#7C3AED', bg: '#EDE9FE' },
    INVESTIGATING:{ label: 'Cần điều tra',       color: '#EA580C', bg: '#FFF7ED' },
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {pending.slice(0, 6).map(v => {
        const m = STATUS_META[v.status]
        return (
          <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: m.bg, borderRadius: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: m.color, minWidth: 90 }}>{m.label}</div>
            <div style={{ flex: 1, fontSize: 13, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {v.code || `#${v.id}`} – {v.title}
            </div>
            <div style={{ fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap' }}>
              {new Date(v.created_at).toLocaleDateString('vi-VN')}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── MAIN DASHBOARD ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const loads = [getProducts(), getAlerts()]

    if (user.role === 'MANAGER') {
      loads.push(
        getTransactions(),
        getVouchers(),
        getTransactionSummary(),
      )
    }
    if (user.role === 'ADMIN') {
      loads.push(getUsers())
    }

    Promise.all(loads).then(results => {
      const [productsRes, alertsRes, ...rest] = results
      const products = productsRes.data || []
      const alerts   = alertsRes.data  || {}

      if (user.role === 'MANAGER') {
        const [txRes, vouchersRes, summaryRes] = rest
        const txs      = txRes?.data      || []
        const vouchers = vouchersRes?.data || []
        const summary  = summaryRes?.data  || []

        // Tính tổng nhập/xuất
        let totalIn = 0, totalOut = 0, totalInValue = 0, totalOutValue = 0
        txs.forEach(t => {
          if (t.type === 'IN')  { totalIn  += t.quantity }
          else                  { totalOut += t.quantity }
        })

        // Đếm phiếu theo status
        const voucherStats = { DRAFT: 0, APPROVED: 0, IN_PROGRESS: 0, COMPLETED: 0, INVESTIGATING: 0 }
        vouchers.forEach(v => { if (voucherStats[v.status] !== undefined) voucherStats[v.status]++ })

        // Tổng giá trị tồn kho
        const stockValue = products.reduce((sum, p) => sum + (p.price * p.quantity), 0)

        // Activity chart: 7 ngày gần nhất
        const days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(); d.setDate(d.getDate() - (6 - i))
          return d.toISOString().slice(0, 10)
        })
        const inByDay  = Object.fromEntries(days.map(d => [d, 0]))
        const outByDay = Object.fromEntries(days.map(d => [d, 0]))
        txs.forEach(t => {
          const day = t.transaction_date?.slice(0, 10)
          if (inByDay[day]  !== undefined && t.type === 'IN')  inByDay[day]  += t.quantity
          if (outByDay[day] !== undefined && t.type === 'OUT') outByDay[day] += t.quantity
        })
        const chartIn  = days.map(d => ({ label: d.slice(5), value: inByDay[d] }))
        const chartOut = days.map(d => ({ label: d.slice(5), value: outByDay[d] }))

        setData({ products, alerts, txs, vouchers, summary, voucherStats, totalIn, totalOut, stockValue, chartIn, chartOut })
      }

      if (user.role === 'ADMIN') {
        setData({ products, alerts, users: rest[0]?.data || [] })
      }

      if (user.role === 'STAFF') {
        setData({ products, alerts })
      }
    }).finally(() => setLoading(false))
  }, [user])

  if (loading) return <div className="full-loading"><div className="loading-spinner"/></div>

  const ROLE_LABELS = { ADMIN: 'Quản trị viên', MANAGER: 'Quản lý kho', STAFF: 'Nhân viên kho' }

  // ── ADMIN dashboard ───────────────────────────────────────────────────────
  if (user.role === 'ADMIN') {
    return (
      <div className="page">
        <div style={{ marginBottom: 24 }}>
          <h1>Xin chào, {user.full_name || user.username} 👋</h1>
          <p style={{ color: '#6B7280', marginTop: 4 }}>Vai trò: <strong>{ROLE_LABELS[user.role]}</strong></p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 16, marginBottom: 24 }}>
          <StatCard label="Người dùng" value={data.users.length} icon={Users} color="#2563EB" bg="#EFF6FF" />
          <StatCard label="Sản phẩm" value={data.products.length} icon={Package} color="#059669" bg="#ECFDF5" />
          <StatCard label="Cảnh báo tồn kho" value={data.alerts.low_stock?.length || 0} icon={AlertTriangle} color="#DC2626" bg="#FEF2F2" />
        </div>
        <div className="card">
          <h3>🔐 Quyền hạn Admin</h3>
          <ul style={{ marginTop: 12, paddingLeft: 20, color: '#374151', lineHeight: 2 }}>
            <li>✅ Tạo / sửa / xóa tài khoản người dùng</li>
            <li>✅ Phân quyền vai trò (Admin / Manager / Staff)</li>
            <li>✅ Xem tổng quan hệ thống</li>
            <li>❌ Không thao tác kho hàng (do Manager quản lý)</li>
          </ul>
        </div>
      </div>
    )
  }

  // ── STAFF dashboard ───────────────────────────────────────────────────────
  if (user.role === 'STAFF') {
    return (
      <div className="page">
        <div style={{ marginBottom: 24 }}>
          <h1>Xin chào, {user.full_name || user.username} 👋</h1>
          <p style={{ color: '#6B7280', marginTop: 4 }}>Vai trò: <strong>{ROLE_LABELS[user.role]}</strong></p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 16, marginBottom: 24 }}>
          <StatCard label="Tổng sản phẩm" value={data.products.length} icon={Package} color="#2563EB" bg="#EFF6FF" />
          <StatCard label="Cảnh báo tồn kho" value={data.alerts.low_stock?.length || 0} icon={AlertTriangle} color="#DC2626" bg="#FEF2F2" />
        </div>
        <div className="card">
          <h3>📋 Hướng dẫn nhập liệu</h3>
          <ul style={{ marginTop: 12, paddingLeft: 20, color: '#374151', lineHeight: 2 }}>
            <li>📄 Vào <strong>Phiếu kho</strong> để xem phiếu đã được duyệt</li>
            <li>▶️ Nhấn <strong>"Nhận & Bắt đầu xử lý"</strong> để nhận phiếu</li>
            <li>✍️ Vào <strong>Nhập liệu</strong> → điền số lượng thực tế</li>
            <li>💬 Dùng <strong>Chat nhóm</strong> để liên hệ Manager khi có vấn đề</li>
          </ul>
        </div>
      </div>
    )
  }

  // ── MANAGER dashboard ─────────────────────────────────────────────────────
  const { products, alerts, txs, vouchers, summary, voucherStats, totalIn, totalOut, stockValue, chartIn, chartOut } = data

  return (
    <div className="page">
      <div style={{ marginBottom: 24 }}>
        <h1>Dashboard – {user.full_name || user.username} 📊</h1>
        <p style={{ color: '#6B7280', marginTop: 4 }}>Quản lý kho · {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* ── Row 1: KPI cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 14, marginBottom: 20 }}>
        <StatCard label="Tổng sản phẩm"      value={products.length}               icon={Package}       color="#2563EB" bg="#EFF6FF" sub={`${alerts.low_stock?.length || 0} sắp hết hàng`} />
        <StatCard label="Tổng nhập kho"       value={totalIn}                        icon={ArrowDownCircle} color="#059669" bg="#ECFDF5" sub="tất cả thời gian" />
        <StatCard label="Tổng xuất kho"       value={totalOut}                       icon={ArrowUpCircle}   color="#EA580C" bg="#FFF7ED" sub="tất cả thời gian" />
        <StatCard label="Phiếu hoàn tất"      value={voucherStats.COMPLETED}         icon={CheckCircle}    color="#16A34A" bg="#DCFCE7" />
        <StatCard label="Đang xử lý"          value={voucherStats.IN_PROGRESS}       icon={Activity}       color="#7C3AED" bg="#EDE9FE" />
        <StatCard label="Cần điều tra"        value={voucherStats.INVESTIGATING}     icon={AlertTriangle}  color="#EA580C" bg="#FFF7ED" />
      </div>

      {/* ── Row 2: Giá trị tồn kho banner ── */}
      <div className="card" style={{ marginBottom: 20, background: 'linear-gradient(135deg,#1E40AF 0%,#2563EB 100%)', color: 'white', padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 4 }}>💰 Tổng giá trị tồn kho ước tính</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{stockValue.toLocaleString('vi-VN')}đ</div>
          </div>
          <div style={{ display: 'flex', gap: 32 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{vouchers.length}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Tổng phiếu</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{txs.length}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Giao dịch</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{alerts.expired?.length || 0}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Hết hạn</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 3: Charts 2 col ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <BarChart2 size={16} color="#059669" />
            <h3 style={{ margin: 0, fontSize: 15 }}>Nhập kho – 7 ngày</h3>
          </div>
          <MiniBarChart data={chartIn} color="#059669" />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            {chartIn.map((d, i) => (
              <div key={i} style={{ fontSize: 10, color: '#9CA3AF', textAlign: 'center', flex: 1 }}>{d.label}</div>
            ))}
          </div>
        </div>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <BarChart2 size={16} color="#EA580C" />
            <h3 style={{ margin: 0, fontSize: 15 }}>Xuất kho – 7 ngày</h3>
          </div>
          <MiniBarChart data={chartOut} color="#EA580C" />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            {chartOut.map((d, i) => (
              <div key={i} style={{ fontSize: 10, color: '#9CA3AF', textAlign: 'center', flex: 1 }}>{d.label}</div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 4: Voucher status + Top products ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Layers size={16} color="#7C3AED" />
            <h3 style={{ margin: 0, fontSize: 15 }}>Phân bổ trạng thái phiếu</h3>
          </div>
          <VoucherStatusBreakdown vouchers={vouchers} />
        </div>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <TrendingUp size={16} color="#2563EB" />
            <h3 style={{ margin: 0, fontSize: 15 }}>Top 5 sản phẩm giao dịch</h3>
          </div>
          <TopProducts summary={summary} />
        </div>
      </div>

      {/* ── Row 5: Alerts + Pending vouchers ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <AlertTriangle size={16} color="#DC2626" />
            <h3 style={{ margin: 0, fontSize: 15 }}>Cảnh báo tồn kho thấp</h3>
          </div>
          <LowStockList products={alerts.low_stock || []} />
        </div>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Clock size={16} color="#D97706" />
            <h3 style={{ margin: 0, fontSize: 15 }}>Phiếu cần xử lý</h3>
          </div>
          <PendingVouchers vouchers={vouchers} />
        </div>
      </div>

      {/* ── Row 6: Recent transactions ── */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Activity size={16} color="#374151" />
          <h3 style={{ margin: 0, fontSize: 15 }}>Giao dịch gần đây</h3>
        </div>
        <RecentTransactions txs={txs} />
      </div>
    </div>
  )
}