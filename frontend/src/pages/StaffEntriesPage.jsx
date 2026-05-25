import { useState, useEffect } from 'react'
import { ClipboardCheck, AlertTriangle, PlayCircle } from 'lucide-react'
import { getVouchers, getStaffEntries, createStaffEntry, startVoucher } from '../api'
import toast from 'react-hot-toast'

const STAFF_VISIBLE = ['APPROVED', 'IN_PROGRESS', 'COMPLETED', 'INVESTIGATING']

export default function StaffEntriesPage() {
  const [vouchers, setVouchers] = useState([])
  const [selected, setSelected] = useState(null)
  const [entryMap, setEntryMap] = useState({})
  const [saving, setSaving] = useState(false)
  const [starting, setStarting] = useState(false)

  const loadVouchers = () =>
    getVouchers().then(r => setVouchers(r.data.filter(v => STAFF_VISIBLE.includes(v.status))))

  useEffect(() => { loadVouchers() }, [])

  useEffect(() => {
    if (!selected) return
    getStaffEntries({ voucher_id: selected.id }).then(r => {
      const map = {}
      r.data.forEach(e => { map[e.product_id] = e.actual_quantity })
      setEntryMap(map)
    })
  }, [selected])

  const handleStart = async () => {
    if (!selected) return
    setStarting(true)
    try {
      await startVoucher(selected.id)
      toast.success('Đã bắt đầu xử lý phiếu')
      const r = await getVouchers()
      const updated = r.data.find(v => v.id === selected.id)
      setSelected(updated)
      setVouchers(r.data.filter(v => STAFF_VISIBLE.includes(v.status)))
    } catch (e) { toast.error(e.response?.data?.detail || 'Lỗi') }
    finally { setStarting(false) }
  }

  const handleSave = async () => {
    if (!selected) return
    if (selected.status !== 'IN_PROGRESS') {
      toast.error('Chỉ nhập liệu được khi phiếu đang IN_PROGRESS')
      return
    }
    setSaving(true)
    try {
      const promises = selected.items.map(item => {
        const actual = entryMap[item.product_id]
        if (actual === undefined || actual === '') return null
        return createStaffEntry({
          voucher_id: selected.id,
          product_id: item.product_id,
          actual_quantity: Number(actual),
          note: ''
        }).catch(() => null)
      }).filter(Boolean)
      await Promise.all(promises)
      toast.success('Lưu số lượng thực tế thành công')
    } catch { toast.error('Có lỗi khi lưu') }
    finally { setSaving(false) }
  }

  const canInput = selected?.status === 'IN_PROGRESS'

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Nhập liệu thực tế</h1>
          <p style={{ color: '#6B7280', marginTop: 4 }}>Nhận phiếu và nhập số lượng thực tế để đối chiếu</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <label className="form-label">Chọn phiếu</label>
        <select className="form-input" style={{ maxWidth: 520 }} value={selected?.id || ''}
          onChange={e => {
            const v = vouchers.find(x => x.id === Number(e.target.value))
            setSelected(v || null)
            setEntryMap({})
          }}>
          <option value="">-- Chọn phiếu --</option>
          {vouchers.map(v => (
            <option key={v.id} value={v.id}>
              {v.code || `#${v.id}`} – {v.title} ({v.type === 'IN' ? 'Nhập' : 'Xuất'}) [{v.status}]
            </option>
          ))}
        </select>
      </div>

      {selected && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <h3>{selected.code || `#${selected.id}`} – {selected.title}</h3>
              <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
                {selected.type === 'IN' ? 'Nhập kho' : 'Xuất kho'} ·
                Người duyệt: {selected.approver?.username || '–'} ·
                <span style={{ fontWeight: 600, color: '#7C3AED', marginLeft: 4 }}>{selected.status}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {selected.status === 'APPROVED' && (
                <button className="btn btn-primary" onClick={handleStart} disabled={starting}>
                  <PlayCircle size={14} /> {starting ? 'Đang xử lý...' : 'Nhận & Bắt đầu xử lý'}
                </button>
              )}
              {canInput && (
                <>
                  <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                    <ClipboardCheck size={14} /> {saving ? 'Đang lưu...' : 'Lưu số lượng thực tế'}
                  </button>
                </>
              )}
            </div>
          </div>

          {selected.status === 'APPROVED' && (
            <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#92400E' }}>
              ⏳ Phiếu đã được duyệt. Nhấn <strong>"Nhận & Bắt đầu xử lý"</strong> để chuyển sang IN_PROGRESS trước khi nhập liệu.
            </div>
          )}
          {selected.status === 'INVESTIGATING' && (
            <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#C2410C' }}>
              ⚠️ Phiếu đang trong trạng thái điều tra do chênh lệch lớn. Manager sẽ quyết định hoàn tất.
            </div>
          )}

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#F9FAFB' }}>
                {['STT', 'Sản phẩm', 'Đơn vị', 'SL phê duyệt', 'SL thực tế', 'Chênh lệch', 'Tình trạng'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '2px solid #E5E7EB' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {selected.items.map((item, i) => {
                const actual = entryMap[item.product_id]
                const diff = (actual !== undefined && actual !== '') ? Number(actual) - item.approved_quantity : null
                const hasLoss = diff !== null && diff < 0
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #F3F4F6', background: hasLoss ? '#FEF2F2' : 'white' }}>
                    <td style={{ padding: '10px 14px' }}>{i + 1}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 500 }}>{item.product?.name}</td>
                    <td style={{ padding: '10px 14px', color: '#6B7280' }}>{item.product?.unit || 'cái'}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: '#2563EB' }}>{item.approved_quantity}</td>
                    <td style={{ padding: '10px 14px' }}>
                      {canInput ? (
                        <input type="number" min="0" value={actual ?? ''}
                          onChange={e => setEntryMap(m => ({ ...m, [item.product_id]: e.target.value }))}
                          style={{ width: 100, padding: '6px 10px', borderRadius: 6, fontSize: 14,
                            border: hasLoss ? '2px solid #FCA5A5' : '1.5px solid #D1D5DB', outline: 'none' }}
                          placeholder="Nhập SL..." />
                      ) : (
                        <span style={{ color: actual != null ? '#374151' : '#9CA3AF' }}>
                          {item.actual_quantity ?? '–'}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 600,
                      color: diff == null ? '#9CA3AF' : diff < 0 ? '#DC2626' : diff > 0 ? '#16A34A' : '#374151' }}>
                      {diff == null ? '–' : diff > 0 ? `+${diff}` : diff}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {diff == null
                        ? <span style={{ color: '#9CA3AF', fontSize: 12 }}>Chưa nhập</span>
                        : diff < 0
                          ? <span style={{ color: '#DC2626', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={12} /> Hao hụt {Math.abs(diff)}</span>
                          : diff === 0
                            ? <span style={{ color: '#16A34A', fontSize: 12 }}>✅ Đúng</span>
                            : <span style={{ color: '#2563EB', fontSize: 12 }}>📈 Vượt {diff}</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {!selected && vouchers.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 48, color: '#9CA3AF' }}>
          <ClipboardCheck size={40} style={{ margin: '0 auto 12px' }} />
          <p>Chưa có phiếu nào được duyệt.</p>
          <p style={{ fontSize: 13 }}>Manager cần tạo và duyệt phiếu trước khi staff xử lý.</p>
        </div>
      )}
    </div>
  )
}