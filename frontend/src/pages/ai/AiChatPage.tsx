import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import ReactMarkdown from 'react-markdown'
import {
  Sparkle,
  PaperPlaneRight,
  User,
  Plus,
  Trash,
  Copy,
  Check,
  ChatCircleText,
  FileText,
  Buildings,
  CalendarBlank,
  ShieldCheck,
  ClockCounterClockwise,
  Lightning,
  ArrowsClockwise,
  MagnifyingGlass,
  ArrowRight,
} from '@phosphor-icons/react'
import { aiApi } from '@/api/ai.api'
import { useAuthStore } from '@/store/auth.store'
import { toast } from '@/lib/notify'
import { Spinner } from '@/components/ui/Spinner'

interface Message {
  id?: string
  role: 'user' | 'model' | 'system'
  content: string
  createdAt?: string
}

interface Session {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

const C = {
  card: '#ffffff',
  bg: '#f8fafc',
  border: '#e2e8f0',
  borderDark: '#cbd5e1',
  text1: '#0f172a',
  text2: '#475569',
  text3: '#94a3b8',
  blue: '#2563eb',
  blueHover: '#1d4ed8',
  blueBg: '#eff6ff',
  green: '#059669',
  greenBg: '#ecfdf5',
  amber: '#d97706',
  amberBg: '#fffbeb',
  red: '#dc2626',
  redBg: '#fef2f2',
  navy: '#1a2540',
  shadowSm: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
  shadowMd: '0 4px 20px -2px rgba(15,23,42,0.08), 0 2px 6px -1px rgba(15,23,42,0.04)',
}

const STARTER_PROMPTS = [
  {
    icon: Buildings,
    title: 'Approved Procurement Brands',
    desc: 'List approved brands for cement, TMT steel, pipes, pumps, and electrical gear.',
    prompt: 'What are the approved brands for procurement (cement, TMT steel, pipes, pumps, electrical) for this project?',
  },
  {
    icon: CalendarBlank,
    title: 'Project Dates & Milestones',
    desc: 'Agreement execution date, commencement, duration, and completion timeline.',
    prompt: 'What was the agreement execution date, commencement date, total project duration, and stipulated completion date?',
  },
  {
    icon: FileText,
    title: 'Contract Scope of Work',
    desc: 'Summary of key project deliverables, technical specs, and contractor obligations.',
    prompt: 'Summarize the primary scope of work, technical specifications, and key deliverables under this contract.',
  },
  {
    icon: ShieldCheck,
    title: 'Meeting Decisions & Action Items',
    desc: 'Review critical pending decisions and instructions from recent site meetings.',
    prompt: 'What are the critical pending action items and instructions from the latest site coordination meetings?',
  },
]

const QUICK_CHIPS = [
  'Approved Cement & Steel Brands',
  'Agreement Execution Date & Duration',
  'Recent Meeting Minutes Summary',
  'Daily Site Activity Overview',
]

export default function AiChatPage() {
  const [searchParams] = useSearchParams()
  const { activeProjectId, user } = useAuthStore()
  const projectId = searchParams.get('project') || activeProjectId || ''

  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionId, setSessionId] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  const handleSyncKnowledge = async () => {
    setSyncing(true)
    try {
      const res = await aiApi.syncKnowledge(projectId)
      const count = res.data?.indexedSources || 0
      toast.success(`System Knowledge Synced: ${count} sources indexed across Letters, MOMs, Settings & Documents!`)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to sync knowledge base')
    } finally {
      setSyncing(false)
    }
  }

  const [inputFocused, setInputFocused] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetchSessions()
  }, [projectId])

  useEffect(() => {
    if (sessionId) {
      fetchSessionHistory(sessionId)
    } else {
      setMessages([])
    }
  }, [sessionId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const newHeight = Math.min(Math.max(textareaRef.current.scrollHeight, 48), 160)
      textareaRef.current.style.height = `${newHeight}px`
    }
  }, [input])

  const fetchSessions = async () => {
    try {
      setSessionsLoading(true)
      const { data } = await aiApi.getSessions(projectId)
      setSessions(data || [])
      if (data && data.length > 0) {
        if (!sessionId || !data.some((s: Session) => s.id === sessionId)) {
          setSessionId(data[0].id)
        }
      } else {
        startNewChat()
      }
    } catch (err: any) {
      console.error('Failed to load sessions', err)
      toast.error('Failed to load chat history')
    } finally {
      setSessionsLoading(false)
    }
  }

  const fetchSessionHistory = async (id: string) => {
    try {
      setLoading(true)
      const { data } = await aiApi.getSessionHistory(id)
      setMessages(data.messages || [])
    } catch (err: any) {
      console.error('Failed to load session history', err)
      setMessages([])
    } finally {
      setLoading(false)
    }
  }

  const startNewChat = () => {
    const newId = uuidv4()
    setSessionId(newId)
    setMessages([])
    setTimeout(() => textareaRef.current?.focus(), 100)
  }

  const handleDeleteSession = async (idToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await aiApi.deleteSession(idToDelete)
      setSessions(prev => prev.filter(s => s.id !== idToDelete))
      toast.success('Chat deleted')
      if (sessionId === idToDelete) {
        const remaining = sessions.filter(s => s.id !== idToDelete)
        if (remaining.length > 0) {
          setSessionId(remaining[0].id)
        } else {
          startNewChat()
        }
      }
    } catch (err: any) {
      toast.error('Failed to delete chat')
    }
  }

  const handleSend = async (queryText?: string) => {
    const query = (queryText || input).trim()
    if (!query || loading) return

    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = '48px'
    }

    const optimisticUserMsg: Message = { role: 'user', content: query }
    setMessages(prev => [...prev, optimisticUserMsg])
    setLoading(true)

    try {
      const activeSessionId = sessionId || uuidv4()
      if (!sessionId) setSessionId(activeSessionId)

      const { data } = await aiApi.chat(activeSessionId, query, projectId)

      setMessages(prev => [...prev, { role: 'model', content: data.text }])

      // Refresh session list if it was a new chat
      if (!sessions.some(s => s.id === activeSessionId)) {
        fetchSessions()
      }
    } catch (err: any) {
      console.error('AI chat failed', err)
      const errMsg = err.response?.data?.message || 'Failed to get answer from AI. Please try again.'
      toast.error(errMsg)
      setMessages(prev => [
        ...prev,
        {
          role: 'model',
          content: `⚠️ **Error:** ${errMsg}\n\nPlease check your project files or try again in a few moments.`,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const filteredSessions = sessions.filter(s =>
    (s.title || 'New Chat').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatRelativeTime = (isoString: string) => {
    if (!isoString) return ''
    const date = new Date(isoString)
    const now = new Date()
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${Math.floor(diffHours)}h ago`
    if (diffHours < 48) return 'Yesterday'
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 145px)', minHeight: 620, width: '100%', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Top Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, marginBottom: 16, borderBottom: `1.5px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: C.blue, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(37,99,235,0.25)' }}>
            <Sparkle size={24} weight="fill" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text1, margin: 0, letterSpacing: '-0.02em' }}>ProjectOS Intelligence</h1>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: C.greenBg, color: C.green, border: '1px solid #a7f3d0' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.green }}></span>
                RAG Grounded
              </span>
            </div>
            <p style={{ fontSize: 13, color: C.text2, margin: '3px 0 0' }}>
              Search and analyze contracts, Liaison documents, material specs, and meeting records
            </p>
          </div>
        </div>

        <button
          onClick={startNewChat}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 10,
            background: C.blue,
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(37,99,235,0.3)',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = C.blueHover)}
          onMouseLeave={e => (e.currentTarget.style.background = C.blue)}
        >
          <Plus size={16} weight="bold" />
          New Chat
        </button>
      </header>

      {/* Main Workspace Split Box */}
      <div style={{ flex: 1, display: 'flex', background: '#fff', border: `1.5px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', boxShadow: C.shadowSm, minHeight: 0 }}>
        {/* Left Sidebar */}
        <aside style={{ width: 300, background: '#f8fafc', borderRight: `1.5px solid ${C.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          {/* Top Actions in Sidebar */}
          <div style={{ padding: 14, borderBottom: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={startNewChat}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '10px 14px',
                background: '#fff',
                border: `1.5px solid ${C.border}`,
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                color: C.text1,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = C.blue
                e.currentTarget.style.color = C.blue
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = C.border
                e.currentTarget.style.color = C.text1
              }}
            >
              <Plus size={16} weight="bold" color={C.blue} />
              Start New Conversation
            </button>

            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <MagnifyingGlass size={16} color={C.text3} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  background: '#fff',
                  border: `1.5px solid ${C.border}`,
                  borderRadius: 10,
                  fontSize: 13,
                  color: C.text1,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={e => (e.target.style.borderColor = C.blue)}
                onBlur={e => (e.target.style.borderColor = C.border)}
              />
            </div>
          </div>

          {/* Session List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {sessionsLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, color: C.text3, gap: 8 }}>
                <Spinner size={20} />
                <span style={{ fontSize: 13 }}>Loading chats...</span>
              </div>
            ) : filteredSessions.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 16px', textAlign: 'center', color: C.text3 }}>
                <ClockCounterClockwise size={32} color={C.borderDark} style={{ marginBottom: 8 }} />
                <p style={{ fontSize: 13, fontWeight: 600, color: C.text2, margin: '0 0 4px' }}>No conversations yet</p>
                <p style={{ fontSize: 12, color: C.text3, margin: 0 }}>Start by asking a question</p>
              </div>
            ) : (
              filteredSessions.map(s => {
                const isActive = sessionId === s.id
                return (
                  <div
                    key={s.id}
                    onClick={() => setSessionId(s.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '11px 13px',
                      borderRadius: 10,
                      cursor: 'pointer',
                      border: isActive ? `1.5px solid ${C.blue}` : '1.5px solid transparent',
                      background: isActive ? C.blueBg : 'transparent',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => {
                      if (!isActive) e.currentTarget.style.background = '#edf2f7'
                    }}
                    onMouseLeave={e => {
                      if (!isActive) e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1, marginRight: 8 }}>
                      <ChatCircleText size={18} weight={isActive ? 'fill' : 'regular'} color={isActive ? C.blue : C.text3} style={{ flexShrink: 0 }} />
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: isActive ? 600 : 500, color: isActive ? C.blue : C.text1, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.title || 'New Conversation'}
                        </p>
                        <span style={{ fontSize: 11, color: C.text3, display: 'block', marginTop: 2 }}>
                          {formatRelativeTime(s.updatedAt || s.createdAt)}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={e => handleDeleteSession(s.id, e)}
                      title="Delete chat"
                      style={{
                        padding: 4,
                        background: 'none',
                        border: 'none',
                        color: C.text3,
                        cursor: 'pointer',
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.color = C.red
                        e.currentTarget.style.background = C.redBg
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.color = C.text3
                        e.currentTarget.style.background = 'none'
                      }}
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer Knowledge Card */}
          <div style={{ padding: 12, borderTop: `1px solid ${C.border}`, background: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#f8fafc', border: `1px solid ${C.border}`, borderRadius: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: C.amberBg, border: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.amber, flexShrink: 0 }}>
                  <Lightning size={16} weight="fill" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: C.text1, margin: 0 }}>Project Knowledge</p>
                  <p style={{ fontSize: 11, color: C.text2, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Contracts, letters & MOMs
                  </p>
                </div>
              </div>

              <button
                onClick={handleSyncKnowledge}
                disabled={syncing}
                title="Sync all letters, meetings, and project settings into AI memory"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '5px 8px',
                  borderRadius: 6,
                  border: `1px solid ${C.border}`,
                  background: '#fff',
                  color: syncing ? C.blue : C.text2,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: syncing ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s',
                  flexShrink: 0,
                  marginLeft: 6,
                }}
                onMouseEnter={e => {
                  if (!syncing) {
                    e.currentTarget.style.background = C.blueBg
                    e.currentTarget.style.color = C.blue
                    e.currentTarget.style.borderColor = '#bfdbfe'
                  }
                }}
                onMouseLeave={e => {
                  if (!syncing) {
                    e.currentTarget.style.background = '#fff'
                    e.currentTarget.style.color = C.text2
                    e.currentTarget.style.borderColor = C.border
                  }
                }}
              >
                <ArrowsClockwise size={13} className={syncing ? 'animate-spin' : ''} weight={syncing ? 'bold' : 'regular'} />
                {syncing ? 'Syncing...' : 'Sync'}
              </button>
            </div>
          </div>
        </aside>

        {/* Right Main Chat Area */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#f8fafd' }}>
          {/* Active Chat Top Header */}
          <div style={{ padding: '12px 24px', background: '#fff', borderBottom: `1.5px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.blue }}></div>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: C.text1, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {sessions.find(s => s.id === sessionId)?.title || 'Current Conversation'}
              </h2>
            </div>

            <button
              onClick={startNewChat}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                color: C.text2,
                background: 'none',
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                cursor: 'pointer',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#f1f5f9'
                e.currentTarget.style.color = C.text1
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'none'
                e.currentTarget.style.color = C.text2
              }}
            >
              <ArrowsClockwise size={14} />
              Clear & Start New
            </button>
          </div>

          {/* Messages Scroll Area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
            {messages.length === 0 && !loading ? (
              /* Welcome Screen */
              <div style={{ maxWidth: 720, margin: '20px auto', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <div style={{ width: 60, height: 60, borderRadius: 16, background: C.blue, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(37,99,235,0.25)' }}>
                  <Sparkle size={32} weight="fill" />
                </div>

                <h3 style={{ fontSize: 22, fontWeight: 700, color: C.text1, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
                  How can I help with your project today?
                </h3>
                <p style={{ fontSize: 14, color: C.text2, margin: '0 0 32px', maxWidth: 520, lineHeight: 1.55 }}>
                  Ask anything about contractual timelines, approved brands, deliverables, or site instructions.
                </p>

                {/* Starter Cards Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, width: '100%' }}>
                  {STARTER_PROMPTS.map((item, idx) => {
                    const Icon = item.icon
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSend(item.prompt)}
                        style={{
                          padding: '18px 20px',
                          borderRadius: 14,
                          background: '#fff',
                          border: `1.5px solid ${C.border}`,
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          transition: 'all 0.15s',
                          boxShadow: C.shadowSm,
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = C.blue
                          e.currentTarget.style.boxShadow = C.shadowMd
                          e.currentTarget.style.transform = 'translateY(-2px)'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = C.border
                          e.currentTarget.style.boxShadow = C.shadowSm
                          e.currentTarget.style.transform = 'none'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: C.blueBg, color: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Icon size={20} weight="bold" />
                            </div>
                            <h4 style={{ fontSize: 14, fontWeight: 700, color: C.text1, margin: 0 }}>
                              {item.title}
                            </h4>
                          </div>
                          <p style={{ fontSize: 12.5, color: C.text2, margin: 0, lineHeight: 1.55 }}>{item.desc}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: C.blue, marginTop: 14 }}>
                          <span>Run query</span>
                          <ArrowRight size={14} weight="bold" />
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              /* Message Thread */
              <div style={{ maxWidth: 860, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
                {messages.map((m, i) => {
                  const isUser = m.role === 'user'
                  return (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        gap: 14,
                        alignItems: 'flex-start',
                        flexDirection: isUser ? 'row-reverse' : 'row',
                      }}
                    >
                      {/* Avatar */}
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 13,
                          fontWeight: 700,
                          color: '#fff',
                          background: isUser ? C.navy : C.blue,
                          boxShadow: C.shadowSm,
                        }}
                      >
                        {isUser ? (
                          user?.name ? user.name.charAt(0).toUpperCase() : <User size={18} weight="bold" />
                        ) : (
                          <Sparkle size={18} weight="fill" />
                        )}
                      </div>

                      {/* Bubble */}
                      <div
                        style={{
                          maxWidth: isUser ? '80%' : '85%',
                          padding: isUser ? '12px 18px' : '18px 22px',
                          borderRadius: 14,
                          borderTopRightRadius: isUser ? 2 : 14,
                          borderTopLeftRadius: !isUser ? 2 : 14,
                          background: isUser ? C.blue : '#fff',
                          border: isUser ? 'none' : `1.5px solid ${C.border}`,
                          color: isUser ? '#fff' : C.text1,
                          fontSize: 14,
                          lineHeight: 1.65,
                          boxShadow: isUser ? '0 2px 8px rgba(37,99,235,0.2)' : C.shadowSm,
                        }}
                      >
                        {isUser ? (
                          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{m.content}</p>
                        ) : (
                          <div>
                            <ReactMarkdown
                              components={{
                                h1: ({ children }) => (
                                  <h1 style={{ fontSize: 16, fontWeight: 700, color: C.text1, borderBottom: `1.5px solid ${C.border}`, paddingBottom: 6, margin: '14px 0 8px' }}>
                                    {children}
                                  </h1>
                                ),
                                h2: ({ children }) => (
                                  <h2 style={{ fontSize: 15, fontWeight: 700, color: C.text1, borderBottom: `1px solid ${C.border}`, paddingBottom: 4, margin: '12px 0 6px' }}>
                                    {children}
                                  </h2>
                                ),
                                h3: ({ children }) => (
                                  <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text1, margin: '10px 0 4px' }}>{children}</h3>
                                ),
                                p: ({ children }) => <p style={{ margin: '0 0 10px', lineHeight: 1.65 }}>{children}</p>,
                                ul: ({ children }) => (
                                  <ul style={{ paddingLeft: 20, margin: '0 0 12px', color: C.text1 }}>{children}</ul>
                                ),
                                ol: ({ children }) => (
                                  <ol style={{ paddingLeft: 20, margin: '0 0 12px', color: C.text1 }}>{children}</ol>
                                ),
                                li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
                                strong: ({ children }) => (
                                  <strong style={{ fontWeight: 700, color: C.text1 }}>{children}</strong>
                                ),
                                table: ({ children }) => (
                                  <div style={{ overflowX: 'auto', margin: '12px 0', borderRadius: 10, border: `1.5px solid ${C.border}` }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                                      {children}
                                    </table>
                                  </div>
                                ),
                                thead: ({ children }) => (
                                  <thead style={{ background: '#f8fafc', color: C.text1, fontWeight: 700 }}>{children}</thead>
                                ),
                                th: ({ children }) => <th style={{ padding: '8px 14px', borderRight: `1px solid ${C.border}` }}>{children}</th>,
                                td: ({ children }) => <td style={{ padding: '8px 14px', borderTop: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, color: C.text2 }}>{children}</td>,
                                blockquote: ({ children }) => (
                                  <blockquote style={{ borderLeft: `4px solid ${C.blue}`, background: C.blueBg, padding: '8px 14px', margin: '10px 0', color: C.text2, fontStyle: 'italic', borderRadius: '0 8px 8px 0' }}>
                                    {children}
                                  </blockquote>
                                ),
                                code: ({ children }) => (
                                  <code style={{ background: '#f1f5f9', color: C.text1, padding: '2px 6px', borderRadius: 6, fontSize: 12, fontFamily: 'monospace' }}>
                                    {children}
                                  </code>
                                ),
                              }}
                            >
                              {m.content}
                            </ReactMarkdown>

                            {/* Response Actions */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, marginTop: 12, borderTop: `1px solid ${C.border}`, fontSize: 12, color: C.text3 }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.green, fontWeight: 600 }}>
                                <ShieldCheck size={16} color={C.green} />
                                Grounded in project knowledge
                              </span>

                              <button
                                onClick={() => copyToClipboard(m.content, i)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '4px 10px',
                                  borderRadius: 6,
                                  background: 'none',
                                  border: `1px solid ${C.border}`,
                                  cursor: 'pointer',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: C.text2,
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                              >
                                {copiedIndex === i ? (
                                  <>
                                    <Check size={14} color={C.green} />
                                    <span style={{ color: C.green }}>Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy size={14} />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* Loading indicator */}
                {loading && (
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: C.blue, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: C.shadowSm }}>
                      <Sparkle size={18} weight="fill" />
                    </div>
                    <div style={{ padding: '14px 20px', borderRadius: 14, borderTopLeftRadius: 2, background: '#fff', border: `1.5px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10, color: C.text2, fontSize: 13, fontWeight: 500, boxShadow: C.shadowSm }}>
                      <Spinner size={16} />
                      <span>Searching project knowledge base and generating answer...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Bottom Prompt Box Area */}
          <div style={{ padding: '16px 28px 20px', background: '#fff', borderTop: `1.5px solid ${C.border}`, flexShrink: 0 }}>
            <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Quick Chips Row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.text3, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <Lightning size={14} weight="fill" color={C.amber} />
                  Quick:
                </span>
                {QUICK_CHIPS.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(chip)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 16,
                      background: '#f1f5f9',
                      border: `1px solid ${C.border}`,
                      fontSize: 12,
                      fontWeight: 500,
                      color: C.text2,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = C.blueBg
                      e.currentTarget.style.borderColor = '#bfdbfe'
                      e.currentTarget.style.color = C.blue
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = '#f1f5f9'
                      e.currentTarget.style.borderColor = C.border
                      e.currentTarget.style.color = C.text2
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Large, Roomy Textarea Box */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  padding: '8px 12px',
                  background: '#fff',
                  border: inputFocused ? `2px solid ${C.blue}` : `2px solid ${C.borderDark}`,
                  borderRadius: 14,
                  boxShadow: inputFocused ? '0 0 0 4px rgba(37,99,235,0.1)' : '0 1px 4px rgba(0,0,0,0.03)',
                  transition: 'all 0.15s',
                }}
              >
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  placeholder="Ask any question about project contracts, approved materials, timelines, or meetings..."
                  disabled={loading}
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    resize: 'none',
                    padding: '8px 10px',
                    fontSize: 14,
                    color: C.text1,
                    background: 'transparent',
                    fontFamily: 'inherit',
                    lineHeight: 1.55,
                    minHeight: 48,
                    maxHeight: 160,
                    boxSizing: 'border-box',
                  }}
                />

                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || loading}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: input.trim() && !loading ? C.blue : '#e2e8f0',
                    color: input.trim() && !loading ? '#fff' : C.text3,
                    border: 'none',
                    cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s',
                    flexShrink: 0,
                    marginLeft: 8,
                  }}
                  onMouseEnter={e => {
                    if (input.trim() && !loading) e.currentTarget.style.background = C.blueHover
                  }}
                  onMouseLeave={e => {
                    if (input.trim() && !loading) e.currentTarget.style.background = C.blue
                  }}
                  title="Send message (Enter)"
                >
                  {loading ? <Spinner size={16} /> : <PaperPlaneRight size={18} weight="fill" />}
                </button>
              </div>

              {/* Bottom Note */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11.5, color: C.text3, padding: '0 4px' }}>
                <span>Press <strong>Enter</strong> to send, <strong>Shift + Enter</strong> for a new line</span>
                <span>Context retrieved from uploaded project documentation</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
