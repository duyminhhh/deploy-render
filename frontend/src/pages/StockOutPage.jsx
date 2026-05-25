import { useNavigate } from 'react-router-dom'
import { ArrowRight, FileText } from 'lucide-react'

export default function StockOutPage() {
  const navigate = useNavigate()
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Xuất kho</h1>
          <p style={{ color: '#6B7280', marginTop: 4 }}>Quản lý xuất kho qua hệ thống phiếu</p>
        </div>
      </div>
      <div className="card" style={{ maxWidth: 560, padding: 32, textAlign: 'center' }}>
        <FileText size={48} style={{ color: '#EA580C', margin: '0 auto 16px' }} />
        <h3 style={{ marginBottom: 8 }}>Tạo Phiếu Xuất Kho</h3>
        <p style={{ color: '#6B7280', marginBottom: 24, fontSize: 14 }}>
          Theo quy trình mới, việc xuất kho được thực hiện thông qua hệ thống phiếu.<br/>
          Manager tạo phiếu → Duyệt → In chứng từ → Staff xuất hàng & nhập liệu → Manager xác nhận.
        </p>
        <button className="btn btn-primary" style={{ background: '#EA580C' }} onClick={() => navigate('/vouchers')}>
          <ArrowRight size={16} /> Đến trang Phiếu kho
        </button>
      </div>
    </div>
  )
}
