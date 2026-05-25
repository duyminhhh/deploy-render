import { useNavigate } from 'react-router-dom'
import { ArrowRight, FileText } from 'lucide-react'

export default function StockInPage() {
  const navigate = useNavigate()
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Nhập kho</h1>
          <p style={{ color: '#6B7280', marginTop: 4 }}>Quản lý nhập kho qua hệ thống phiếu</p>
        </div>
      </div>
      <div className="card" style={{ maxWidth: 560, padding: 32, textAlign: 'center' }}>
        <FileText size={48} style={{ color: '#2563EB', margin: '0 auto 16px' }} />
        <h3 style={{ marginBottom: 8 }}>Tạo Phiếu Nhập Kho</h3>
        <p style={{ color: '#6B7280', marginBottom: 24, fontSize: 14 }}>
          Theo quy trình mới, việc nhập kho được thực hiện thông qua hệ thống phiếu.<br/>
          Manager tạo phiếu → Duyệt → Staff nhận & xử lý → Manager xác nhận → Tồn kho cập nhật.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/vouchers')}>
          <ArrowRight size={16} /> Đến trang Phiếu kho
        </button>
      </div>
    </div>
  )
}
