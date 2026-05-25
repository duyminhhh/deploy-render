import { useState, useEffect } from 'react'
import { Plus, Printer, FileCheck, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { getApprovals, createApproval, getProducts, printApproval } from '../api'
import toast from 'react-hot-toast'

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [form, setForm] = useState({
    type: 'IN', title: '', note: '', valid_until: '', items: []
  })

  useEffect(() => {
    load()
    getProducts().then(r => setProducts(r.data))
  }, [])

  const load = () => {
    setLoading(true)
    getApprovals().then(r => setApprovals(r.data)).finally(() => setLoading(false))
  }

  const addItem = () => setForm(f => ({
    ...f, items: [...f.items, { product_id: '', approved_quantity: 1 }]
  }))

  const updateItem = (i, field, val) => setForm(f => ({
    ...f, items: f.items.map((it, idx) => idx === i ? { ...it, [field]: val } : it)
  }))

  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))

  const handleSubmit = async () => {
    if (!form.title || form.items.length === 0) {
      toast.error('Cần nhập tiêu đề và ít nhất 1 sản phẩm')
      return
    }
    try {
      const payload = {
        ...form,
        valid_until: form.valid_until || null,
        items: form.items.map(it => ({ product_id: Number(it.product_id), approved_quantity: Number(it.approved_quantity) }))
      }
      await createApproval(payload)
      toast.success('Tạo chứng từ thành công')
      setShowForm(false)
      setForm({ type: 'IN', title: '', note: '', valid_until: '', items: [] })
      load()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Lỗi tạo chứng từ')
    }
  }

  const handlePrint = (id) => {
    window.open(printApproval(id) + `?token=${localStorage.getItem('token')}`, '_blank')
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Chứng từ phê duyệt</h1>
          <p style={{color:'#6B7280',marginTop:4}}>Tạo và quản lý chứng từ cho phép xuất/nhập kho</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
          <Plus size={16}/> Tạo chứng từ
        </button>
      </div>

      {showForm && (
        <div className="card" style={{marginBottom:24}}>
          <h3 style={{marginBottom:16}}>Tạo chứng từ mới</h3>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
            <div>
              <label className="form-label">Loại *</label>
              <select className="form-input" value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))}>
                <option value="IN">Nhập kho</option>
                <option value="OUT">Xuất kho</option>
              </select>
            </div>
            <div>
              <label className="form-label">Tiêu đề *</label>
              <input className="form-input" placeholder="VD: Nhập hàng tháng 6/2025" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))}/>
            </div>
            <div>
              <label className="form-label">Hiệu lực đến</label>
              <input type="datetime-local" className="form-input" value={form.valid_until} onChange={e => setForm(f => ({...f, valid_until: e.target.value}))}/>
            </div>
            <div>
              <label className="form-label">Ghi chú</label>
              <input className="form-input" placeholder="Ghi chú..." value={form.note} onChange={e => setForm(f => ({...f, note: e.target.value}))}/>
            </div>
          </div>

          <div style={{marginBottom:12}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <strong>Danh sách sản phẩm</strong>
              <button className="btn btn-secondary" style={{fontSize:13}} onClick={addItem}><Plus size={14}/> Thêm dòng</button>
            </div>
            {form.items.map((item, i) => (
              <div key={i} style={{display:'grid',gridTemplateColumns:'1fr 140px 36px',gap:8,marginBottom:8}}>
                <select className="form-input" value={item.product_id} onChange={e => updateItem(i, 'product_id', e.target.value)}>
                  <option value="">-- Chọn sản phẩm --</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input type="number" min="1" className="form-input" placeholder="Số lượng" value={item.approved_quantity} onChange={e => updateItem(i, 'approved_quantity', e.target.value)}/>
                <button onClick={() => removeItem(i)} style={{background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:6,cursor:'pointer',color:'#DC2626'}}>
                  <Trash2 size={14}/>
                </button>
              </div>
            ))}
            {form.items.length === 0 && <p style={{color:'#9CA3AF',fontSize:13}}>Chưa có sản phẩm nào. Nhấn "Thêm dòng".</p>}
          </div>

          <div style={{display:'flex',gap:8}}>
            <button className="btn btn-primary" onClick={handleSubmit}><FileCheck size={16}/> Phê duyệt & Lưu</button>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Hủy</button>
          </div>
        </div>
      )}

      {loading ? <div className="loading-spinner"/> : (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {approvals.length === 0 && <p style={{color:'#6B7280'}}>Chưa có chứng từ nào.</p>}
          {approvals.map(a => (
            <div key={a.id} className="card" style={{padding:0,overflow:'hidden'}}>
              <div style={{padding:'16px 20px',display:'flex',alignItems:'center',gap:12,cursor:'pointer'}} onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}>
                <span style={{
                  padding:'3px 10px',borderRadius:99,fontSize:12,fontWeight:600,
                  background: a.type === 'IN' ? '#EFF6FF' : '#FFF7ED',
                  color: a.type === 'IN' ? '#2563EB' : '#EA580C'
                }}>{a.type === 'IN' ? 'Nhập kho' : 'Xuất kho'}</span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600}}>{a.code} – {a.title}</div>
                  <div style={{fontSize:12,color:'#6B7280'}}>
                    Người tạo: {a.creator?.username} · {new Date(a.created_at).toLocaleDateString('vi-VN')}
                    {a.valid_until ? ` · Hết hạn: ${new Date(a.valid_until).toLocaleDateString('vi-VN')}` : ''}
                  </div>
                </div>
                <span style={{
                  padding:'3px 10px',borderRadius:99,fontSize:12,fontWeight:600,
                  background:'#DCFCE7',color:'#16A34A'
                }}>Đã phê duyệt</span>
                <button className="btn btn-secondary" style={{fontSize:12,padding:'5px 10px'}} onClick={e => { e.stopPropagation(); handlePrint(a.id) }}>
                  <Printer size={13}/> In chứng từ
                </button>
                {expandedId === a.id ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
              </div>

              {expandedId === a.id && (
                <div style={{borderTop:'1px solid #E5E7EB',padding:'16px 20px'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:14}}>
                    <thead>
                      <tr style={{background:'#F9FAFB'}}>
                        {['STT','Sản phẩm','Đơn vị','SL phê duyệt','SL thực tế','Chênh lệch'].map(h => (
                          <th key={h} style={{padding:'8px 12px',textAlign:'left',fontWeight:600,color:'#374151',borderBottom:'1px solid #E5E7EB'}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {a.items.map((item, i) => {
                        const diff = item.actual_quantity != null ? item.actual_quantity - item.approved_quantity : null
                        return (
                          <tr key={item.id} style={{borderBottom:'1px solid #F3F4F6'}}>
                            <td style={{padding:'8px 12px'}}>{i+1}</td>
                            <td style={{padding:'8px 12px'}}>{item.product?.name}</td>
                            <td style={{padding:'8px 12px'}}>{item.product?.unit || 'cái'}</td>
                            <td style={{padding:'8px 12px',fontWeight:600}}>{item.approved_quantity}</td>
                            <td style={{padding:'8px 12px'}}>{item.actual_quantity ?? <span style={{color:'#9CA3AF'}}>Chưa nhập</span>}</td>
                            <td style={{padding:'8px 12px',color: diff == null ? '#9CA3AF' : diff < 0 ? '#DC2626' : diff > 0 ? '#16A34A' : '#374151', fontWeight: diff !== null ? 600 : 400}}>
                              {diff == null ? '–' : diff > 0 ? `+${diff}` : diff}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {a.note && <p style={{marginTop:12,color:'#6B7280',fontSize:13}}>📝 {a.note}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
