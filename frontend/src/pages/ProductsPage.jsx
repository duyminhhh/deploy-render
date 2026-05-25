import { useState, useEffect, useCallback } from 'react'
import { getProducts, createProduct, updateProduct, deleteProduct, getCategories, getUnits } from '../api'
import { useAuth } from '../context/AuthContext'
import { Plus, Pencil, Trash2, Search, Filter, X } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const EMPTY_FORM = {
  name: '', description: '', category: '', unit: 'cái', price: '',
  quantity: '', import_date: '', expiration_date: '', low_stock_threshold: 10
}

export default function ProductsPage() {
  const { user } = useAuth()
  const canEdit = ['ADMIN', 'MANAGER'].includes(user?.role)

  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [units, setUnits] = useState(['cái', 'kg', 'g', 'lít', 'ml', 'chai', 'lon', 'hộp', 'gói', 'túi', 'bịch', 'thùng', 'lốc', 'bó', 'củ', 'quả'])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'create' | 'edit'
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [filters, setFilters] = useState({ search: '', category: '', low_stock: '' })

  const loadProducts = useCallback(() => {
    const params = {}
    if (filters.search) params.search = filters.search
    if (filters.category) params.category = filters.category
    if (filters.low_stock === 'true') params.low_stock = true
    return getProducts(params).then(r => setProducts(r.data))
  }, [filters])

  useEffect(() => {
    setLoading(true)
    Promise.all([loadProducts(), getCategories().then(r => setCategories(r.data)), getUnits().then(r => setUnits(r.data))])
      .finally(() => setLoading(false))
  }, [loadProducts])

  const openCreate = () => { setForm(EMPTY_FORM); setEditTarget(null); setModal('create') }
  const openEdit = (p) => {
    setForm({
      name: p.name, description: p.description || '', category: p.category || '',
      unit: p.unit || 'cái', price: p.price, quantity: p.quantity,
      import_date: p.import_date ? p.import_date.slice(0, 10) : '',
      expiration_date: p.expiration_date ? p.expiration_date.slice(0, 10) : '',
      low_stock_threshold: p.low_stock_threshold
    })
    setEditTarget(p)
    setModal('edit')
  }
  const closeModal = () => { setModal(null); setEditTarget(null) }

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Tên sản phẩm không được trống')
    setSaving(true)
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price) || 0,
        quantity: parseInt(form.quantity) || 0,
        low_stock_threshold: parseInt(form.low_stock_threshold) || 10,
        import_date: form.import_date ? new Date(form.import_date).toISOString() : null,
        expiration_date: form.expiration_date ? new Date(form.expiration_date).toISOString() : null,
      }
      if (modal === 'create') {
        await createProduct(payload)
        toast.success('Thêm sản phẩm thành công')
      } else {
        await updateProduct(editTarget.id, payload)
        toast.success('Cập nhật thành công')
      }
      closeModal()
      loadProducts()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Có lỗi xảy ra')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (p) => {
    if (!confirm(`Xóa sản phẩm "${p.name}"?`)) return
    try {
      await deleteProduct(p.id)
      toast.success('Đã xóa sản phẩm')
      loadProducts()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Không thể xóa')
    }
  }

  const isLowStock = (p) => p.quantity <= p.low_stock_threshold
  const isExpired = (p) => p.expiration_date && new Date(p.expiration_date) < new Date()
  const isExpiringSoon = (p) => {
    if (!p.expiration_date) return false
    const diff = (new Date(p.expiration_date) - new Date()) / (1000 * 60 * 60 * 24)
    return diff > 0 && diff <= 30
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Sản phẩm</h1>
          <p className="page-subtitle">{products.length} sản phẩm</p>
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> Thêm sản phẩm
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-input">
          <Search size={16} />
          <input
            placeholder="Tìm theo tên sản phẩm..."
            value={filters.search}
            onChange={e => setFilters({ ...filters, search: e.target.value })}
          />
          {filters.search && <button onClick={() => setFilters({ ...filters, search: '' })}><X size={14}/></button>}
        </div>
        <select value={filters.category} onChange={e => setFilters({ ...filters, category: e.target.value })}>
          <option value="">Tất cả danh mục</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filters.low_stock} onChange={e => setFilters({ ...filters, low_stock: e.target.value })}>
          <option value="">Tất cả tồn kho</option>
          <option value="true">Sắp hết hàng</option>
        </select>
        {(filters.search || filters.category || filters.low_stock) && (
          <button className="btn btn-ghost" onClick={() => setFilters({ search: '', category: '', low_stock: '' })}>
            <X size={14}/> Xóa bộ lọc
          </button>
        )}
      </div>

      <div className="card">
        {loading ? <div className="loading-spinner" /> : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Tên sản phẩm</th>
                  <th>Danh mục</th>
                  <th>Đơn vị</th>
                  <th>Giá</th>
                  <th>Tồn kho</th>
                  <th>Ngày nhập</th>
                  <th>Hạn sử dụng</th>
                  <th>Trạng thái</th>
                  {canEdit && <th>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr><td colSpan={9} className="empty-row">Không có sản phẩm nào</td></tr>
                ) : products.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div><strong>{p.name}</strong></div>
                      {p.description && <div className="text-muted text-sm">{p.description}</div>}
                    </td>
                    <td>{p.category ? <span className="badge badge-neutral">{p.category}</span> : '—'}</td>
                    <td><span style={{fontSize:13,color:'#374151'}}>{p.unit || 'cái'}</span></td>
                    <td>{p.price > 0 ? `${p.price.toLocaleString('vi-VN')}đ` : '—'}</td>
                    <td>
                      <span className={isLowStock(p) ? 'text-danger font-bold' : ''}>
                        {p.quantity.toLocaleString()}
                      </span>
                      <span className="text-muted text-sm"> / {p.low_stock_threshold}</span>
                    </td>
                    <td>{p.import_date ? format(new Date(p.import_date), 'dd/MM/yyyy') : '—'}</td>
                    <td>{p.expiration_date ? format(new Date(p.expiration_date), 'dd/MM/yyyy') : '—'}</td>
                    <td>
                      <div className="status-badges">
                        {isExpired(p) && <span className="badge badge-danger">Hết hạn</span>}
                        {isExpiringSoon(p) && <span className="badge badge-warning">Sắp hết hạn</span>}
                        {isLowStock(p) && !isExpired(p) && <span className="badge badge-warning">Sắp hết</span>}
                        {!isExpired(p) && !isExpiringSoon(p) && !isLowStock(p) && (
                          <span className="badge badge-success">Tốt</span>
                        )}
                      </div>
                    </td>
                    {canEdit && (
                      <td>
                        <div className="action-buttons">
                          <button className="btn-icon btn-icon-edit" onClick={() => openEdit(p)} title="Sửa">
                            <Pencil size={14} />
                          </button>
                          <button className="btn-icon btn-icon-delete" onClick={() => handleDelete(p)} title="Xóa">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modal === 'create' ? 'Thêm sản phẩm mới' : 'Cập nhật sản phẩm'}</h2>
              <button className="modal-close" onClick={closeModal}><X size={18}/></button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Tên sản phẩm <span className="required">*</span></label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nhập tên sản phẩm" />
                </div>
                <div className="form-group full-width">
                  <label>Mô tả</label>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Mô tả sản phẩm" rows={2} />
                </div>
                <div className="form-group">
                  <label>Danh mục</label>
                  <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="VD: Thực phẩm, Đồ uống..." list="cat-list" />
                  <datalist id="cat-list">{categories.map(c => <option key={c} value={c}/>)}</datalist>
                </div>
                <div className="form-group">
                  <label>Đơn vị đo lường</label>
                  <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                    {units.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Giá (VNĐ)</label>
                  <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="0" min="0" />
                </div>
                <div className="form-group">
                  <label>Số lượng tồn</label>
                  <input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="0" min="0" />
                </div>
                <div className="form-group">
                  <label>Ngưỡng cảnh báo</label>
                  <input type="number" value={form.low_stock_threshold} onChange={e => setForm({ ...form, low_stock_threshold: e.target.value })} placeholder="10" min="0" />
                </div>
                <div className="form-group">
                  <label>Ngày nhập kho</label>
                  <input type="date" value={form.import_date} onChange={e => setForm({ ...form, import_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Hạn sử dụng</label>
                  <input type="date" value={form.expiration_date} onChange={e => setForm({ ...form, expiration_date: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeModal}>Hủy</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Đang lưu...' : (modal === 'create' ? 'Thêm sản phẩm' : 'Lưu thay đổi')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}