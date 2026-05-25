import { useState, useEffect, useRef } from 'react'
import { X, Send, Wifi, WifiOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getChatMessages, WS_URL } from '../api'

const ROLE_COLORS = { ADMIN: '#EF4444', MANAGER: '#2563EB', STAFF: '#10B981' }
const ROLE_LABELS = { ADMIN: 'Admin', MANAGER: 'Manager', STAFF: 'Staff' }

export default function ChatWidget({ onClose }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [connected, setConnected] = useState(false)
  const wsRef = useRef(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    getChatMessages(50).then(res => {
      setMessages(res.data.map(m => ({
        id: m.id,
        sender_id: m.sender_id,
        sender_name: m.sender?.username || 'Unknown',
        sender_role: m.sender?.role || 'STAFF',
        content: m.content,
        created_at: m.created_at
      })))
    }).catch(() => {})

    const token = localStorage.getItem('token')
    const wsUrl = `${WS_URL}/chat/ws?token=${token}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'message') {
        setMessages(prev => [...prev, data])
      }
    }
    return () => ws.close()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = () => {
    const content = input.trim()
    if (!content || !connected) return
    wsRef.current?.send(JSON.stringify({ content }))
    setInput('')
  }

  const fmt = (iso) => {
    const d = new Date(iso)
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, width: 360, height: 500,
      background: 'white', borderRadius: 16, boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
      display: 'flex', flexDirection: 'column', zIndex: 1000, border: '1px solid #E5E7EB'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px', background: '#1E40AF', borderRadius: '16px 16px 0 0',
        display: 'flex', alignItems: 'center', gap: 10
      }}>
        <div style={{ flex: 1, color: 'white', fontWeight: 700, fontSize: 15 }}>💬 Chat nhóm</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'white', fontSize: 12 }}>
          {connected ? <Wifi size={14}/> : <WifiOff size={14}/>}
          {connected ? 'Đã kết nối' : 'Mất kết nối'}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white', padding: 2 }}>
          <X size={18}/>
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.length === 0 && (
          <div style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', marginTop: 40 }}>
            Chưa có tin nhắn nào.<br/>Bắt đầu trò chuyện!
          </div>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.sender_id === user?.id
          return (
            <div key={msg.id || i} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '80%' }}>
                {!isMe && (
                  <div style={{ fontSize: 11, color: ROLE_COLORS[msg.sender_role], fontWeight: 600, marginBottom: 2, paddingLeft: 4 }}>
                    {msg.sender_name} · {ROLE_LABELS[msg.sender_role]}
                  </div>
                )}
                <div style={{
                  padding: '8px 12px',
                  borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  background: isMe ? '#2563EB' : '#F3F4F6',
                  color: isMe ? 'white' : '#111827',
                  fontSize: 14, lineHeight: 1.4
                }}>
                  {msg.content}
                </div>
                <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2, textAlign: isMe ? 'right' : 'left', paddingLeft: 4, paddingRight: 4 }}>
                  {fmt(msg.created_at)}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Nhập tin nhắn..."
          style={{
            flex: 1, padding: '8px 12px', borderRadius: 8,
            border: '1.5px solid #D1D5DB', fontSize: 14, outline: 'none'
          }}
        />
        <button onClick={send} disabled={!connected || !input.trim()} style={{
          padding: '8px 14px', background: connected ? '#2563EB' : '#9CA3AF',
          color: 'white', border: 'none', borderRadius: 8, cursor: connected ? 'pointer' : 'not-allowed'
        }}>
          <Send size={16}/>
        </button>
      </div>
    </div>
  )
}
