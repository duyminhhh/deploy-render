import { useState, useEffect } from 'react'
import { getTransactions, exportCSV, exportExcel } from '../api'
import { ArrowDownCircle, ArrowUpCircle, Download, FileSpreadsheet } from 'lucide-react'
import { format } from 'date-fns'

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ type: '', date_from: '', date_to: '' })

  useEffect(() => {
    setLoading(true)
    const params = {}
    if (filters.type) params.type = filters.type
    if (filters.date_from) params.date_from = new Date(filters.date_from).toISOString()
    if (filters.date_to) params.date_to = new Date(filters.date_to + 'T23:59:59').toISOString()
    getTransactions(params).then(r => setTransactions(r.data)).finally(() => setLoading(false))
  }, [filters])

  const handleExportCSV = () => {
    const token = localStorage.getItem('token')
    fetch(exportCSV(), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = 'transactions.csv'; a.click()
      })
  }

  const handleExportExcel = () => {
    const token = localStorage.getItem('token')
    fetch(exportExcel(), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = 'transactions.xlsx'; a.click()
      })
  }

  const totalIn = transactions.filter(t => t.type === 'IN').reduce((s, t) => s + t.quantity, 0)
  const totalOut = transactions.filter(t => t.type === 'OUT').reduce((s, t) => s + t.quantity, 0)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Lịch sử giao dịch</h1>
          <p className="page-subtitle">{transactions.length} giao dịch</p>
        </div>
        <div className="btn-group">
          <button className="btn btn-ghost" onClick={handleExportCSV}>
            <Download size={16}/> CSV
          </button>
          <button className="btn btn-ghost" onClick={handleExportExcel}>
            <FileSpreadsheet size={16}/> Excel
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#ECFDF5' }}>
            <ArrowDownCircle size={22} color="#10B981" />
          </div>
          <div className="stat-info">
            <span className="stat-value text-success">{totalIn.toLocaleString()}</span>
            <span className="stat-label">Tổng nhập</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#FEF2F2' }}>
            <ArrowUpCircle size={22} color="#EF4444" />
          </div>
          <div className="stat-info">
            <span className="stat-value text-danger">{totalOut.toLocaleString()}</span>
            <span className="stat-label">Tổng xuất</span>
          </div>
        </div>
      </div>

      <div className="filters-bar">
        <select value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value })}>
          <option value="">Tất cả loại</option>
          <option value="IN">Nhập kho</option>
          <option value="OUT">Xuất kho</option>
        </select>
        <div className="date-range">
          <input type="date" value={filters.date_from} onChange={e => setFilters({ ...filters, date_from: e.target.value })} />
          <span>→</span>
          <input type="date" value={filters.date_to} onChange={e => setFilters({ ...filters, date_to: e.target.value })} />
        </div>
      </div>

      <div className="card">
        {loading ? <div className="loading-spinner"/> : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Sản phẩm</th>
                  <th>Loại</th>
                  <th>Số lượng</th>
                  <th>Ngày giao dịch</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr><td colSpan={6} className="empty-row">Không có giao dịch nào</td></tr>
                ) : transactions.map(tx => (
                  <tr key={tx.id}>
                    <td className="text-muted">#{tx.id}</td>
                    <td><strong>{tx.product_name}</strong></td>
                    <td>
                      <span className={`badge ${tx.type === 'IN' ? 'badge-success' : 'badge-danger'}`}>
                        {tx.type === 'IN'
                          ? <><ArrowDownCircle size={12}/> Nhập</>
                          : <><ArrowUpCircle size={12}/> Xuất</>}
                      </span>
                    </td>
                    <td>
                      <span className={tx.type === 'IN' ? 'text-success' : 'text-danger'}>
                        {tx.type === 'IN' ? '+' : '-'}{tx.quantity.toLocaleString()}
                      </span>
                    </td>
                    <td>{format(new Date(tx.transaction_date), 'dd/MM/yyyy HH:mm')}</td>
                    <td className="text-muted">{tx.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
