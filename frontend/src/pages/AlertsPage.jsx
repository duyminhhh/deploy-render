import { useState, useEffect } from 'react'
import { getAlerts } from '../api'
import { AlertTriangle, Clock, TrendingDown, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'

export default function AlertsPage() {
  const [alerts, setAlerts] = useState({ low_stock: [], expiring_soon: [], expired: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAlerts().then(r => setAlerts(r.data)).finally(() => setLoading(false))
  }, [])

  const total = alerts.low_stock.length + alerts.expiring_soon.length + alerts.expired.length

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Cảnh báo tồn kho</h1>
          <p className="page-subtitle">{total > 0 ? `${total} cảnh báo cần xử lý` : 'Không có cảnh báo'}</p>
        </div>
      </div>

      {loading ? <div className="loading-spinner"/> : total === 0 ? (
        <div className="card empty-state-big">
          <CheckCircle size={56} color="#10B981"/>
          <h2>Tất cả ổn định!</h2>
          <p className="text-muted">Không có sản phẩm nào cần chú ý</p>
        </div>
      ) : (
        <>
          {alerts.expired.length > 0 && (
            <AlertSection
              title="Sản phẩm đã hết hạn"
              icon={<AlertTriangle size={20} color="#EF4444"/>}
              color="#EF4444"
              bg="#FEF2F2"
              products={alerts.expired}
              type="expired"
            />
          )}
          {alerts.expiring_soon.length > 0 && (
            <AlertSection
              title="Sắp hết hạn (trong 30 ngày)"
              icon={<Clock size={20} color="#8B5CF6"/>}
              color="#8B5CF6"
              bg="#F5F3FF"
              products={alerts.expiring_soon}
              type="expiring"
            />
          )}
          {alerts.low_stock.length > 0 && (
            <AlertSection
              title="Sắp hết hàng"
              icon={<TrendingDown size={20} color="#F59E0B"/>}
              color="#F59E0B"
              bg="#FFFBEB"
              products={alerts.low_stock}
              type="low_stock"
            />
          )}
        </>
      )}
    </div>
  )
}

function AlertSection({ title, icon, color, bg, products, type }) {
  return (
    <div className="card" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="card-header">
        <div className="alert-section-title">
          <div className="stat-icon" style={{ background: bg, width: 36, height: 36, minWidth: 36 }}>{icon}</div>
          <h2>{title}</h2>
          <span className="badge" style={{ background: bg, color }}>{products.length}</span>
        </div>
      </div>
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Sản phẩm</th>
              <th>Danh mục</th>
              <th>Tồn kho</th>
              {type !== 'low_stock' && <th>Hạn sử dụng</th>}
              {type === 'low_stock' && <th>Ngưỡng cảnh báo</th>}
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id}>
                <td><strong>{p.name}</strong></td>
                <td>{p.category ? <span className="badge badge-neutral">{p.category}</span> : '—'}</td>
                <td>
                  <span className={type === 'low_stock' ? 'text-warning font-bold' : ''}>
                    {p.quantity.toLocaleString()}
                  </span>
                </td>
                {type !== 'low_stock' && (
                  <td>{p.expiration_date ? format(new Date(p.expiration_date), 'dd/MM/yyyy') : '—'}</td>
                )}
                {type === 'low_stock' && <td>{p.low_stock_threshold}</td>}
                <td>
                  {type === 'expired' && <span className="badge badge-danger">Hết hạn</span>}
                  {type === 'expiring' && (
                    <span className="badge badge-warning">
                      Còn {Math.ceil((new Date(p.expiration_date) - new Date()) / 86400000)} ngày
                    </span>
                  )}
                  {type === 'low_stock' && (
                    <span className="badge badge-warning">
                      Còn {p.quantity} / {p.low_stock_threshold}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
