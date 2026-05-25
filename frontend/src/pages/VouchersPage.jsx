import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Printer, ChevronDown, ChevronUp, Trash2, CheckCircle,
  XCircle, AlertTriangle, PlayCircle, Ban, History, RefreshCw
} from 'lucide-react'
import {
  getVouchers, createVoucher, getProducts, printVoucher,
  approveVoucher, rejectVoucher, cancelVoucher,
  confirmVoucher, forceCompleteVoucher, getVoucherLogs
} from '../api'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

const STATUS_META = {
  DRAFT:        { label: 'Nháp',          color: '#6B7280', bg: '#F3F4F6' },
  APPROVED:     { label: 'Đã duyệt',      color: '#2563EB', bg: '#EFF6FF' },
  IN_PROGRESS:  { label: 'Đang xử lý',    color: '#7C3AED', bg: '#EDE9FE' },
  COMPLETED:    { label: 'Hoàn tất',      color: '#16A34A', bg: '#DCFCE7' },
  REJECTED:     { label: 'Từ chối',       color: '#DC2626', bg: '#FEF2F2' },
  CANCELLED:    { label: 'Đã huỷ',        color: '#9CA3AF', bg: '#F9FAFB' },
  INVESTIGATING:{ label: 'Điều tra',      color: '#EA580C', bg: '#FFF7ED' },
}

const TYPE_META = {
  IN:  { label: 'Nhập kho', color: '#2563EB', bg: '#EFF6FF' },
  OUT: { label: 'Xuất kho', color: '#EA580C', bg: '#FFF7ED' },
}

function StatusBadge({ status }) {
  const m = STATUS_META[status] || { label: status, color: '#374151', bg: '#F3F4F6' }
  return (
    <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600,
      background: m.bg, color: m.color }}>
      {m.label}
    </span>
  )
}

function TypeBadge({ type }) {
  const m = TYPE_META[type] || {}
  return (
    <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600,
      background: m.bg, color: m.color }}>
      {m.label}
    </span>
  )
}

function LogTimeline({ voucherId }) {
  const [logs, setLogs] = useState([])
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (open && logs.length === 0)
      import('../api').then(({ getVoucherLogs }) =>
        getVoucherLogs(voucherId).then(r => setLogs(r.data))
      )
  }, [open])
  return (
    <div style={{ marginTop: 12 }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
        <History size={14} /> {open ? 'Ẩn lịch sử' : 'Xem lịch sử thay đổi'}
      </button>
      {open && (
        <div style={{ marginTop: 8, paddingLeft: 16, borderLeft: '2px solid #E5E7EB' }}>
          {logs.map(log => (
            <div key={log.id} style={{ marginBottom: 8, fontSize: 13 }}>
              <span style={{ color: '#374151', fontWeight: 600 }}>{log.action}</span>
              {log.from_status && <span style={{ color: '#9CA3AF' }}> {log.from_status} →</span>}
              <span style={{ color: '#2563EB' }}> {log.to_status}</span>
              <span style={{ color: '#9CA3AF' }}> · {log.by_user?.username} · {new Date(log.created_at).toLocaleString('vi-VN')}</span>
              {log.note && <div style={{ color: '#6B7280', marginTop: 2 }}>📝 {log.note}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function VouchersPage() {
  const { user } = useAuth()
  const isManager = user?.role === 'MANAGER'
  const [vouchers, setVouchers] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [form, setForm] = useState({ type: 'IN', title: '', note: '', valid_until: '', items: [] })
  const [actionModal, setActionModal] = useState(null) // { type, voucherId }
  const [actionReason, setActionReason] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    const params = {}
    if (filterType) params.type = filterType
    if (filterStatus) params.status = filterStatus
    getVouchers(params).then(r => setVouchers(r.data)).finally(() => setLoading(false))
  }, [filterType, filterStatus])

  useEffect(() => { load() }, [load])
  useEffect(() => { getProducts().then(r => setProducts(r.data)) }, [])

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { product_id: '', approved_quantity: 1 }] }))
  const updateItem = (i, field, val) => setForm(f => ({
    ...f, items: f.items.map((it, idx) => idx === i ? { ...it, [field]: val } : it)
  }))
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))

  const handleCreate = async () => {
    if (!form.title || form.items.length === 0) { toast.error('Cần nhập tiêu đề và ít nhất 1 sản phẩm'); return }
    try {
      const payload = {
        ...form,
        valid_until: form.valid_until || null,
        items: form.items.map(it => ({ product_id: Number(it.product_id), approved_quantity: Number(it.approved_quantity) }))
      }
      await createVoucher(payload)
      toast.success('Tạo phiếu thành công (trạng thái: DRAFT)')
      setShowForm(false)
      setForm({ type: 'IN', title: '', note: '', valid_until: '', items: [] })
      load()
    } catch (e) { toast.error(e.response?.data?.detail || 'Lỗi tạo phiếu') }
  }

  const doAction = async () => {
    const { type, voucherId } = actionModal
    try {
      if (type === 'approve') await approveVoucher(voucherId)
      else if (type === 'reject') await rejectVoucher(voucherId, { reason: actionReason })
      else if (type === 'cancel') await cancelVoucher(voucherId, { reason: actionReason })
      else if (type === 'confirm') await confirmVoucher(voucherId, { note: actionReason })
      else if (type === 'force') await forceCompleteVoucher(voucherId, { note: actionReason })
      toast.success('Thao tác thành công')
      setActionModal(null); setActionReason(''); load()
    } catch (e) { toast.error(e.response?.data?.detail || 'Lỗi thao tác') }
  }

  const handlePrint = (id, e) => {
    e.stopPropagation()
    window.open(printVoucher(id) + `?token=${localStorage.getItem('token')}`, '_blank')
  }

  const ACTION_LABELS = {
    approve: 'Phê duyệt phiếu',
    reject: 'Từ chối phiếu',
    cancel: 'Huỷ phiếu',
    confirm: 'Xác nhận hoàn tất',
    force: 'Chấp nhận & Hoàn tất (sau điều tra)',
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Quản lý phiếu</h1>
          <p style={{ color: '#6B7280', marginTop: 4 }}>Tạo, duyệt và theo dõi phiếu nhập/xuất kho</p>
        </div>
        {isManager && (
          <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
            <Plus size={16} /> Tạo phiếu
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <select className="form-input" style={{ width: 160 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">Tất cả loại</option>
          <option value="IN">Nhập kho</option>
          <option value="OUT">Xuất kho</option>
        </select>
        <select className="form-input" style={{ width: 180 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          {Object.entries(STATUS_META).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <button className="btn btn-secondary" onClick={load}><RefreshCw size={14} /></button>
      </div>

      {/* Create form */}
      {showForm && isManager && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16 }}>Tạo phiếu mới</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label className="form-label">Loại *</label>
              <select className="form-input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="IN">Nhập kho</option>
                <option value="OUT">Xuất kho</option>
              </select>
            </div>
            <div>
              <label className="form-label">Tiêu đề *</label>
              <input className="form-input" placeholder="VD: Nhập hàng tháng 6" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Hiệu lực đến</label>
              <input type="datetime-local" className="form-input" value={form.valid_until}
                onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Ghi chú</label>
              <input className="form-input" placeholder="Ghi chú..." value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <strong>Danh sách sản phẩm</strong>
              <button className="btn btn-secondary" style={{ fontSize: 13 }} onClick={addItem}><Plus size={14} /> Thêm dòng</button>
            </div>
            {form.items.map((item, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 36px', gap: 8, marginBottom: 8 }}>
                <select className="form-input" value={item.product_id} onChange={e => updateItem(i, 'product_id', e.target.value)}>
                  <option value="">-- Chọn sản phẩm --</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} (tồn: {p.quantity})</option>)}
                </select>
                <input type="number" min="1" className="form-input" placeholder="Số lượng"
                  value={item.approved_quantity} onChange={e => updateItem(i, 'approved_quantity', e.target.value)} />
                <button onClick={() => removeItem(i)}
                  style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, cursor: 'pointer', color: '#DC2626' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {form.items.length === 0 && <p style={{ color: '#9CA3AF', fontSize: 13 }}>Chưa có sản phẩm. Nhấn "Thêm dòng".</p>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={handleCreate}>Tạo phiếu (DRAFT)</button>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Huỷ</button>
          </div>
        </div>
      )}

      {loading ? <div className="loading-spinner" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {vouchers.length === 0 && <p style={{ color: '#6B7280' }}>Không có phiếu nào.</p>}
          {vouchers.map(v => (
            <div key={v.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Header row */}
              <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}>
                <TypeBadge type={v.type} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{v.code || `#${v.id}`} – {v.title}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>
                    {v.creator?.username} · {new Date(v.created_at).toLocaleDateString('vi-VN')}
                    {v.valid_until ? ` · hết hạn ${new Date(v.valid_until).toLocaleDateString('vi-VN')}` : ''}
                  </div>
                </div>
                <StatusBadge status={v.status} />

                {/* Manager actions */}
                {isManager && (
                  <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                    {v.status === 'DRAFT' && (
                      <>
                        <button className="btn btn-primary" style={{ fontSize: 12, padding: '4px 10px' }}
                          onClick={() => { setActionModal({ type: 'approve', voucherId: v.id }); setActionReason('') }}>
                          <CheckCircle size={12} /> Duyệt phiếu
                        </button>
                        <button className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 10px', color: '#DC2626' }}
                          onClick={() => { setActionModal({ type: 'cancel', voucherId: v.id }); setActionReason('') }}>
                          <Ban size={12} /> Huỷ
                        </button>
                      </>
                    )}

                    {v.status === 'APPROVED' && (
                      <>
                        <button className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }}
                          onClick={e => handlePrint(v.id, e)}>
                          <Printer size={12} /> In phiếu
                        </button>
                        <button className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 10px', color: '#DC2626' }}
                          onClick={() => { setActionModal({ type: 'cancel', voucherId: v.id }); setActionReason('') }}>
                          <Ban size={12} /> Huỷ
                        </button>
                      </>
                    )}
                    {v.status === 'IN_PROGRESS' && (
                      <>
                        <button className="btn btn-primary" style={{ fontSize: 12, padding: '4px 10px' }}
                          onClick={() => { setActionModal({ type: 'confirm', voucherId: v.id }); setActionReason('') }}>
                          <CheckCircle size={12} /> Xác nhận hoàn tất
                        </button>
                        <button className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }}
                          onClick={e => handlePrint(v.id, e)}>
                          <Printer size={12} /> In
                        </button>
                      </>
                    )}
                    {v.status === 'INVESTIGATING' && (
                      <button className="btn btn-primary" style={{ fontSize: 12, padding: '4px 10px', background: '#EA580C' }}
                        onClick={() => { setActionModal({ type: 'force', voucherId: v.id }); setActionReason('') }}>
                        <AlertTriangle size={12} /> Chấp nhận & Hoàn tất
                      </button>
                    )}
                    {v.status === 'COMPLETED' && (
                      <button className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }}
                        onClick={e => handlePrint(v.id, e)}>
                        <Printer size={12} /> In phiếu
                      </button>
                    )}
                  </div>
                )}
                {expandedId === v.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>

              {/* Expanded detail */}
              {expandedId === v.id && (
                <div style={{ borderTop: '1px solid #E5E7EB', padding: '16px 20px' }}>
                  {v.reject_reason && (
                    <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13, color: '#DC2626' }}>
                      ⚠️ Lý do từ chối/huỷ: {v.reject_reason}
                    </div>
                  )}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead>
                      <tr style={{ background: '#F9FAFB' }}>
                        {['STT', 'Sản phẩm', 'Đơn vị', 'SL phê duyệt', 'SL thực tế', 'Chênh lệch'].map(h => (
                          <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #E5E7EB' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {v.items.map((item, i) => {
                        const diff = item.actual_quantity != null ? item.actual_quantity - item.approved_quantity : null
                        return (
                          <tr key={item.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                            <td style={{ padding: '8px 12px' }}>{i + 1}</td>
                            <td style={{ padding: '8px 12px' }}>{item.product?.name}</td>
                            <td style={{ padding: '8px 12px' }}>{item.product?.unit || 'cái'}</td>
                            <td style={{ padding: '8px 12px', fontWeight: 600 }}>{item.approved_quantity}</td>
                            <td style={{ padding: '8px 12px' }}>
                              {item.actual_quantity ?? <span style={{ color: '#9CA3AF' }}>Chưa nhập</span>}
                            </td>
                            <td style={{ padding: '8px 12px', fontWeight: diff != null ? 600 : 400,
                              color: diff == null ? '#9CA3AF' : diff < 0 ? '#DC2626' : diff > 0 ? '#16A34A' : '#374151' }}>
                              {diff == null ? '–' : diff > 0 ? `+${diff}` : diff}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {v.note && <p style={{ marginTop: 12, color: '#6B7280', fontSize: 13 }}>📝 {v.note}</p>}
                  <LogTimeline voucherId={v.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Action modal */}
      {actionModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: 440, padding: 24 }}>
            <h3 style={{ marginBottom: 16 }}>{ACTION_LABELS[actionModal.type]}</h3>
            {['reject', 'cancel', 'confirm', 'force'].includes(actionModal.type) && (
              <div style={{ marginBottom: 16 }}>
                <label className="form-label">{actionModal.type === 'confirm' || actionModal.type === 'force' ? 'Ghi chú' : 'Lý do'}</label>
                <textarea className="form-input" rows={3} value={actionReason}
                  onChange={e => setActionReason(e.target.value)}
                  placeholder={actionModal.type === 'reject' ? 'Nhập lý do từ chối...' : actionModal.type === 'cancel' ? 'Nhập lý do huỷ...' : 'Ghi chú...'} />
              </div>
            )}
            {actionModal.type === 'approve' && (
              <p style={{ marginBottom: 16, color: '#6B7280', fontSize: 14 }}>
                Sau khi duyệt, phiếu sẽ được sinh mã chứng từ và khoá lại. Staff có thể nhận xử lý.
              </p>
            )}
            {actionModal.type === 'confirm' && (
              <p style={{ marginBottom: 16, color: '#6B7280', fontSize: 14 }}>
                Hệ thống sẽ kiểm tra chênh lệch. Nếu &gt; 10% sẽ chuyển sang INVESTIGATING để điều tra.
              </p>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => { setActionModal(null); setActionReason('') }}>Huỷ bỏ</button>
              <button className="btn btn-primary" onClick={doAction}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}