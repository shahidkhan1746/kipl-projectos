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
  Lightning,
  ArrowsClockwise,
  MagnifyingGlass,
  ArrowRight,
  UploadSimple,
  CloudArrowUp,
  FilePdf,
  FileDoc,
  FileXls,
  FolderOpen,
  DownloadSimple,
  Database,
  Tag,
  Funnel,
  CheckCircle,
  WarningCircle,
  X,
  HardDrives,
  UsersThree,
} from '@phosphor-icons/react'
import { aiApi, KnowledgeDocument } from '@/api/ai.api'
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
  purple: '#7c3aed',
  purpleBg: '#f5f3ff',
  navy: '#1a2540',
  shadowSm: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
  shadowMd: '0 4px 20px -2px rgba(15,23,42,0.08), 0 2px 6px -1px rgba(15,23,42,0.04)',
}

const KNOWLEDGE_CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'contract', label: 'Contracts & Agreements' },
  { value: 'tender', label: 'Tender Documents' },
  { value: 'boq', label: 'BOQ & Estimates' },
  { value: 'technical_spec', label: 'Technical Specs' },
  { value: 'drawing', label: 'Drawings & Design' },
  { value: 'vendor_approval', label: 'Vendor & Subcontractor' },
  { value: 'liaison_approval', label: 'Govt Liaison & NOC' },
  { value: 'mom_meeting', label: 'Meeting Minutes' },
  { value: 'site_report', label: 'Site Reports & Quality' },
  { value: 'legal_eot', label: 'Legal & EOT Claims' },
  { value: 'other', label: 'Other Files' },
]

const STARTER_PROMPTS = [
  {
    icon: Buildings,
    title: 'Vendors & Subcontractors',
    desc: 'Specialist agencies (Keller, Wani), material suppliers, stone crushers & plant hire.',
    prompt: 'Who are our registered subcontractors, specialist agencies (like Keller), and material suppliers for this project?',
  },
  {
    icon: CalendarBlank,
    title: 'Project Dates & Milestones',
    desc: 'Agreement execution date, commencement, duration, and completion timeline.',
    prompt: 'What was the agreement execution date, commencement date, total project duration, and stipulated completion date?',
  },
  {
    icon: FileText,
    title: 'Material Consumption & Stock',
    desc: 'Cement & steel received vs consumed on site according to Clause 55 register.',
    prompt: 'Summarize the cement (OPC 43/53) and steel (TMT) consumption and balance-in-hand recorded in the site register.',
  },
  {
    icon: ShieldCheck,
    title: 'Site Orders & Instructions',
    desc: 'Instructions issued by UEED / EIC in the Site Order Book and compliance status.',
    prompt: 'What official site orders and inspection instructions were issued recently by the Engineer-in-Charge (UEED/EIC)?',
  },
]

const QUICK_CHIPS = [
  'Who is Keller Ground Engineering?',
  'Who is Rinku & what is his role?',
  'Agreement Execution Date & Duration',
  'Approved Cement & Steel Brands',
  'Latest Site Orders & Compliance',
  'Recent Meeting Minutes & Action Items',
]

export default function AiChatPage() {
  const [searchParams] = useSearchParams()
  const { activeProjectId, user } = useAuthStore()
  const projectId = searchParams.get('project') || activeProjectId || ''

  // View mode: 'chat' | 'vault'
  const [activeTab, setActiveTab] = useState<'chat' | 'vault'>('chat')

  // Chat State
  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionId, setSessionId] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [inputFocused, setInputFocused] = useState(false)

  // Knowledge Vault State
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [docCategoryFilter, setDocCategoryFilter] = useState('all')
  const [docSearchQuery, setDocSearchQuery] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadCategory, setUploadCategory] = useState<string>('contract')
  const [isDragging, setIsDragging] = useState(false)
  const [fetchingLiaison, setFetchingLiaison] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchSessions()
    fetchDocuments()
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

  const fetchDocuments = async () => {
    try {
      setDocsLoading(true)
      const res = await aiApi.getKnowledgeDocuments({
        projectId,
        category: docCategoryFilter !== 'all' ? docCategoryFilter : undefined,
        search: docSearchQuery.trim() || undefined,
      })
      setDocuments(res.data || [])
    } catch (err: any) {
      console.error('Failed to fetch knowledge documents', err)
    } finally {
      setDocsLoading(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [docCategoryFilter, docSearchQuery, projectId])

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

  const handleSyncKnowledge = async () => {
    setSyncing(true)
    try {
      const res = await aiApi.syncKnowledge(projectId)
      const count = res.data?.indexedSources || 0
      toast.success(`Knowledge Base Synced: ${count} entities indexed across Vendors, Subcontractors, WBS, Materials, Site Orders, MOMs & Documents!`)
      fetchDocuments()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to sync knowledge base')
    } finally {
      setSyncing(false)
    }
  }

  const handleFetchLiaison = async () => {
    setFetchingLiaison(true)
    try {
      const res = await aiApi.fetchLiaisonDocuments(projectId)
      const count = res.data?.fetched || 0
      toast.success(`Fetched & Vector-Indexed ${count} clearance documents from Liaison section!`)
      fetchDocuments()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to fetch liaison documents')
    } finally {
      setFetchingLiaison(false)
    }
  }

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setIsUploading(true)
    setUploadProgress(10)

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const formData = new FormData()
        formData.append('file', file)
        formData.append('category', uploadCategory)
        if (projectId) formData.append('projectId', projectId)

        setUploadProgress(Math.round(((i + 0.5) / files.length) * 100))
        await aiApi.uploadKnowledgeFile(formData)
      }
      setUploadProgress(100)
      toast.success(`Successfully uploaded and vector-indexed ${files.length} document(s) into Knowledge Vault!`)
      setShowUploadModal(false)
      fetchDocuments()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upload document')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleReindexDocument = async (id: string) => {
    try {
      toast.info('Re-parsing and indexing document chunks...')
      await aiApi.reindexKnowledgeDocument(id)
      toast.success('Document re-indexed successfully!')
      fetchDocuments()
    } catch (err: any) {
      toast.error('Failed to reindex document')
    }
  }

  const handleDeleteDocument = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this document and purge its vector memory chunks?')) return
    try {
      await aiApi.deleteKnowledgeDocument(id)
      toast.success('Document removed from Knowledge Vault')
      fetchDocuments()
    } catch (err: any) {
      toast.error('Failed to delete document')
    }
  }

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getFormatIcon = (name: string) => {
    const lower = name.toLowerCase()
    if (lower.endsWith('.pdf')) return <FilePdf size={20} color="#dc2626" weight="fill" />
    if (lower.endsWith('.docx') || lower.endsWith('.doc')) return <FileDoc size={20} color="#2563eb" weight="fill" />
    if (lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv')) return <FileXls size={20} color="#059669" weight="fill" />
    return <FileText size={20} color="#64748b" weight="fill" />
  }

  const filteredSessions = sessions.filter(s =>
    (s.title || 'New Chat').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalVaultChunks = documents.reduce((acc, d) => acc + (d.totalChunks || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 145px)', minHeight: 620, width: '100%', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Top Header & Tab Navigation */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, marginBottom: 14, borderBottom: `1.5px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: C.blue, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(37,99,235,0.25)' }}>
            <Sparkle size={24} weight="fill" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text1, margin: 0, letterSpacing: '-0.02em' }}>ProjectOS Intelligence</h1>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: C.greenBg, color: C.green, border: '1px solid #a7f3d0' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.green }}></span>
                pgvector RAG Active
              </span>
            </div>
            <p style={{ fontSize: 13, color: C.text2, margin: '3px 0 0' }}>
              Unified Knowledge Vault & AI Operations Engine for Srinagar Dal Lake STP Project
            </p>
          </div>
        </div>

        {/* Tab Selector Segment */}
        <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', padding: 4, borderRadius: 12, border: `1px solid ${C.border}` }}>
          <button
            onClick={() => setActiveTab('chat')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 8,
              background: activeTab === 'chat' ? '#fff' : 'transparent',
              color: activeTab === 'chat' ? C.blue : C.text2,
              border: 'none',
              cursor: 'pointer',
              boxShadow: activeTab === 'chat' ? C.shadowSm : 'none',
              transition: 'all 0.15s',
            }}
          >
            <ChatCircleText size={18} weight={activeTab === 'chat' ? 'bold' : 'regular'} />
            AI Operations Chat
          </button>

          <button
            onClick={() => setActiveTab('vault')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 8,
              background: activeTab === 'vault' ? '#fff' : 'transparent',
              color: activeTab === 'vault' ? C.blue : C.text2,
              border: 'none',
              cursor: 'pointer',
              boxShadow: activeTab === 'vault' ? C.shadowSm : 'none',
              transition: 'all 0.15s',
            }}
          >
            <HardDrives size={18} weight={activeTab === 'vault' ? 'bold' : 'regular'} />
            Knowledge Vault & File Pool
            <span style={{ padding: '2px 7px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: activeTab === 'vault' ? C.blueBg : '#e2e8f0', color: activeTab === 'vault' ? C.blue : C.text2 }}>
              {documents.length}
            </span>
          </button>
        </div>
      </header>

      {/* VIEW 1: AI OPERATIONS CHAT */}
      {activeTab === 'chat' && (
        <div style={{ flex: 1, display: 'flex', background: '#fff', border: `1.5px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', boxShadow: C.shadowSm, minHeight: 0 }}>
          {/* Left Sidebar */}
          <aside style={{ width: 300, background: '#f8fafc', borderRight: `1.5px solid ${C.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
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
                  boxShadow: C.shadowSm,
                }}
              >
                <Plus size={16} weight="bold" color={C.blue} />
                New Chat
              </button>

              <button
                onClick={handleSyncKnowledge}
                disabled={syncing}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  background: C.blueBg,
                  border: `1px solid #bfdbfe`,
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  color: C.blue,
                  cursor: syncing ? 'not-allowed' : 'pointer',
                }}
              >
                <ArrowsClockwise size={15} weight="bold" className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Indexing Database...' : 'Sync Live Database'}
              </button>

              <div style={{ position: 'relative' }}>
                <MagnifyingGlass size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.text3 }} />
                <input
                  type="text"
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 32px',
                    fontSize: 12,
                    background: '#fff',
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    outline: 'none',
                    color: C.text1,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Chat Sessions List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
              {sessionsLoading ? (
                <div style={{ padding: 20, textAlign: 'center' }}>
                  <Spinner size="sm" />
                </div>
              ) : filteredSessions.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: C.text3, fontSize: 12 }}>
                  No chats found
                </div>
              ) : (
                filteredSessions.map(s => {
                  const isActive = s.id === sessionId
                  return (
                    <div
                      key={s.id}
                      onClick={() => setSessionId(s.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: 8,
                        marginBottom: 4,
                        background: isActive ? C.blueBg : 'transparent',
                        border: `1px solid ${isActive ? '#bfdbfe' : 'transparent'}`,
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                        <ChatCircleText size={16} color={isActive ? C.blue : C.text3} weight={isActive ? 'fill' : 'regular'} />
                        <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 500, color: isActive ? C.blue : C.text1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {s.title || 'Untitled Chat'}
                        </span>
                      </div>
                      <button
                        onClick={e => handleDeleteSession(s.id, e)}
                        style={{ background: 'none', border: 'none', color: C.text3, cursor: 'pointer', padding: 4, borderRadius: 4 }}
                        title="Delete chat"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </aside>

          {/* Right Main Chat Area */}
          <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', minWidth: 0 }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
              {messages.length === 0 ? (
                <div style={{ maxWidth: 840, margin: '0 auto', paddingTop: 20 }}>
                  <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', color: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 4px 14px rgba(37,99,235,0.15)' }}>
                      <Sparkle size={30} weight="fill" />
                    </div>
                    <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text1, margin: 0 }}>How can I assist your project operations today?</h2>
                    <p style={{ fontSize: 14, color: C.text2, margin: '8px 0 0' }}>
                      Ask questions across Vendors, Subcontractors, WBS Schedules, Material Registers, Site Orders, MOMs, and Uploaded Files.
                    </p>
                  </div>

                  {/* Starter Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 24 }}>
                    {STARTER_PROMPTS.map((card, idx) => {
                      const Icon = card.icon
                      return (
                        <div
                          key={idx}
                          onClick={() => handleSend(card.prompt)}
                          style={{
                            padding: '16px 18px',
                            background: '#f8fafc',
                            border: `1.5px solid ${C.border}`,
                            borderRadius: 12,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.borderColor = C.blue
                            e.currentTarget.style.background = C.blueBg
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.borderColor = C.border
                            e.currentTarget.style.background = '#f8fafc'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fff', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.blue }}>
                              <Icon size={18} weight="bold" />
                            </div>
                            <h3 style={{ fontSize: 14, fontWeight: 600, color: C.text1, margin: 0 }}>{card.title}</h3>
                          </div>
                          <p style={{ fontSize: 12.5, color: C.text2, margin: 0, lineHeight: 1.4 }}>{card.desc}</p>
                        </div>
                      )
                    })}
                  </div>

                  {/* Quick Chips */}
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Suggested Queries:</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                      {QUICK_CHIPS.map((chip, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSend(chip)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 20,
                            background: '#fff',
                            border: `1px solid ${C.borderDark}`,
                            fontSize: 12.5,
                            fontWeight: 500,
                            color: C.text2,
                            cursor: 'pointer',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.borderColor = C.blue
                            e.currentTarget.style.color = C.blue
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.borderColor = C.borderDark
                            e.currentTarget.style.color = C.text2
                          }}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ maxWidth: 840, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {messages.map((m, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 10,
                          background: m.role === 'user' ? '#1e293b' : C.blue,
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {m.role === 'user' ? <User size={18} weight="bold" /> : <Sparkle size={18} weight="fill" />}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: C.text1 }}>
                            {m.role === 'user' ? (user?.name || 'You') : 'ProjectOS Intelligence'}
                          </span>
                          {m.role === 'model' && (
                            <button
                              onClick={() => copyToClipboard(m.content, idx)}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: C.text3, cursor: 'pointer', fontSize: 12 }}
                            >
                              {copiedIndex === idx ? <Check size={14} color={C.green} /> : <Copy size={14} />}
                              {copiedIndex === idx ? 'Copied' : 'Copy'}
                            </button>
                          )}
                        </div>

                        <div style={{ fontSize: 14, lineHeight: 1.6, color: C.text1 }}>
                          <ReactMarkdown>{m.content}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  ))}

                  {loading && (
                    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: C.blue, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Sparkle size={18} weight="fill" className="animate-spin" />
                      </div>
                      <div style={{ padding: '10px 14px', background: '#f8fafc', border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 13, color: C.text2, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Spinner size="sm" />
                        Analyzing vector embeddings across contracts, registers, and operational data...
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Footer */}
            <div style={{ padding: '16px 24px', borderTop: `1.5px solid ${C.border}`, background: '#fff' }}>
              <div
                style={{
                  maxWidth: 840,
                  margin: '0 auto',
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 10,
                  padding: '8px 12px',
                  background: '#f8fafc',
                  border: `1.5px solid ${inputFocused ? C.blue : C.border}`,
                  borderRadius: 14,
                  boxShadow: inputFocused ? '0 0 0 3px rgba(37,99,235,0.1)' : 'none',
                }}
              >
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  placeholder="Ask any question about contracts, subcontractors, vendors, materials, site orders, or staff..."
                  rows={1}
                  style={{
                    flex: 1,
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    resize: 'none',
                    fontSize: 14,
                    color: C.text1,
                    lineHeight: 1.4,
                    padding: '8px 0',
                    fontFamily: 'inherit',
                  }}
                />

                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || loading}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: input.trim() && !loading ? C.blue : '#cbd5e1',
                    color: '#fff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                    flexShrink: 0,
                  }}
                >
                  <PaperPlaneRight size={18} weight="bold" />
                </button>
              </div>
            </div>
          </main>
        </div>
      )}

      {/* VIEW 2: KNOWLEDGE VAULT & DOCUMENT POOL */}
      {activeTab === 'vault' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', border: `1.5px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', boxShadow: C.shadowSm, minHeight: 0 }}>
          {/* Vault Top Metrics Bar */}
          <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: `1.5px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: C.blueBg, color: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <HardDrives size={20} weight="bold" />
                </div>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.text3, textTransform: 'uppercase' }}>Vault Files</span>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.text1 }}>{documents.length} Files</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: C.purpleBg, color: C.purple, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Database size={20} weight="bold" />
                </div>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.text3, textTransform: 'uppercase' }}>Vector Chunks</span>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.text1 }}>{totalVaultChunks}+ Embedded</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: C.greenBg, color: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UsersThree size={20} weight="bold" />
                </div>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.text3, textTransform: 'uppercase' }}>Operational Entities</span>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.text1 }}>Vendors, WBS, Registers, QA, Staff</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={handleFetchLiaison}
                disabled={fetchingLiaison}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 14px',
                  borderRadius: 10,
                  background: '#fff',
                  border: `1.5px solid ${C.borderDark}`,
                  fontSize: 13,
                  fontWeight: 600,
                  color: C.text1,
                  cursor: fetchingLiaison ? 'not-allowed' : 'pointer',
                }}
              >
                <FolderOpen size={16} weight="bold" color={C.amber} />
                {fetchingLiaison ? 'Fetching...' : 'Fetch from Liaisoning'}
              </button>

              <button
                onClick={() => setShowUploadModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 16px',
                  borderRadius: 10,
                  background: C.blue,
                  color: '#fff',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(37,99,235,0.3)',
                }}
              >
                <CloudArrowUp size={18} weight="bold" />
                Upload Project Files
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div style={{ padding: '12px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, maxWidth: 400 }}>
              <MagnifyingGlass size={16} color={C.text3} />
              <input
                type="text"
                placeholder="Search knowledge documents by name..."
                value={docSearchQuery}
                onChange={e => setDocSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  fontSize: 13,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto' }}>
              <Funnel size={16} color={C.text3} />
              <select
                value={docCategoryFilter}
                onChange={e => setDocCategoryFilter(e.target.value)}
                style={{
                  padding: '6px 12px',
                  fontSize: 12.5,
                  fontWeight: 500,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  outline: 'none',
                  background: '#fff',
                  color: C.text1,
                }}
              >
                {KNOWLEDGE_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Documents Table */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {docsLoading ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <Spinner size="md" />
              </div>
            ) : documents.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: 16, background: '#f1f5f9', color: C.text3, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <HardDrives size={32} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: C.text1, margin: 0 }}>No documents in Knowledge Vault yet</h3>
                <p style={{ fontSize: 13, color: C.text2, margin: '6px 0 20px' }}>
                  Upload contract volumes, BOQs, specifications, or click "Fetch from Liaisoning" to build your AI database.
                </p>
                <button
                  onClick={() => setShowUploadModal(true)}
                  style={{
                    padding: '9px 18px',
                    borderRadius: 10,
                    background: C.blue,
                    color: '#fff',
                    border: 'none',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Upload Your First File
                </button>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: `1.5px solid ${C.border}`, color: C.text2, textAlign: 'left', fontWeight: 600, fontSize: 12 }}>
                    <th style={{ padding: '12px 20px' }}>Document Name</th>
                    <th style={{ padding: '12px 14px' }}>Category</th>
                    <th style={{ padding: '12px 14px' }}>Source</th>
                    <th style={{ padding: '12px 14px' }}>Size</th>
                    <th style={{ padding: '12px 14px' }}>Chunks</th>
                    <th style={{ padding: '12px 14px' }}>Status</th>
                    <th style={{ padding: '12px 14px' }}>Uploaded By</th>
                    <th style={{ padding: '12px 20px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc, idx) => (
                    <tr
                      key={doc.id}
                      style={{
                        borderBottom: `1px solid ${C.border}`,
                        background: idx % 2 === 0 ? '#fff' : '#fafafa',
                      }}
                    >
                      <td style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
                        {getFormatIcon(doc.documentName)}
                        <div>
                          <div style={{ fontWeight: 600, color: C.text1 }}>{doc.documentName}</div>
                          {doc.errorMessage && (
                            <div style={{ fontSize: 11, color: C.red, marginTop: 2 }}>{doc.errorMessage}</div>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11.5, fontWeight: 600, background: '#f1f5f9', color: C.text2, textTransform: 'capitalize' }}>
                          {doc.category.replace('_', ' ')}
                        </span>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontSize: 12, color: doc.sourceType === 'liaison_fetch' ? C.amber : C.blue, fontWeight: 500 }}>
                          {doc.sourceType === 'liaison_fetch' ? 'Liaison Section' : 'Direct Upload'}
                        </span>
                      </td>

                      <td style={{ padding: '12px 14px', color: C.text2 }}>{formatFileSize(doc.fileSizeBytes)}</td>

                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontWeight: 600, color: C.text1 }}>{doc.totalChunks || 0}</span>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        {doc.status === 'indexed' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 12, fontSize: 11.5, fontWeight: 600, background: C.greenBg, color: C.green }}>
                            <CheckCircle size={13} weight="fill" /> Indexed
                          </span>
                        ) : doc.status === 'processing' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 12, fontSize: 11.5, fontWeight: 600, background: C.blueBg, color: C.blue }}>
                            <Spinner size="sm" /> Parsing
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 12, fontSize: 11.5, fontWeight: 600, background: C.redBg, color: C.red }}>
                            <WarningCircle size={13} weight="fill" /> Failed
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '12px 14px', color: C.text2, fontSize: 12 }}>{doc.uploadedBy || 'User'}</td>

                      <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                          {doc.fileUrl && (
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: C.blue, padding: 4, borderRadius: 4, display: 'inline-flex' }}
                              title="Download document"
                            >
                              <DownloadSimple size={16} />
                            </a>
                          )}
                          <button
                            onClick={() => handleReindexDocument(doc.id)}
                            style={{ background: 'none', border: 'none', color: C.text2, cursor: 'pointer', padding: 4, borderRadius: 4 }}
                            title="Re-index vector chunks"
                          >
                            <ArrowsClockwise size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', padding: 4, borderRadius: 4 }}
                            title="Delete file"
                          >
                            <Trash size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* UPLOAD MODAL / DROPZONE DIALOG */}
      {showUploadModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ width: '100%', maxWidth: 540, background: '#fff', borderRadius: 16, boxShadow: C.shadowMd, overflow: 'hidden', border: `1.5px solid ${C.border}` }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CloudArrowUp size={22} color={C.blue} weight="bold" />
                <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text1, margin: 0 }}>Upload Files to Knowledge Pool</h3>
              </div>
              <button onClick={() => setShowUploadModal(false)} style={{ background: 'none', border: 'none', color: C.text3, cursor: 'pointer' }}>
                <X size={18} weight="bold" />
              </button>
            </div>

            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.text1, marginBottom: 6 }}>
                  Document Category
                </label>
                <select
                  value={uploadCategory}
                  onChange={e => setUploadCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    fontSize: 13,
                    border: `1.5px solid ${C.border}`,
                    borderRadius: 8,
                    outline: 'none',
                    background: '#fff',
                    color: C.text1,
                  }}
                >
                  {KNOWLEDGE_CATEGORIES.filter(c => c.value !== 'all').map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Drag & Drop Area */}
              <div
                onDragOver={e => {
                  e.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={e => {
                  e.preventDefault()
                  setIsDragging(false)
                  handleFileUpload(e.dataTransfer.files)
                }}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${isDragging ? C.blue : C.borderDark}`,
                  borderRadius: 12,
                  padding: '36px 20px',
                  textAlign: 'center',
                  background: isDragging ? C.blueBg : '#f8fafc',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.md"
                  style={{ display: 'none' }}
                  onChange={e => handleFileUpload(e.target.files)}
                />
                <div style={{ width: 48, height: 48, borderRadius: 12, background: C.blueBg, color: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <CloudArrowUp size={26} weight="bold" />
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text1, marginBottom: 4 }}>
                  Click to browse or drag & drop files here
                </div>
                <div style={{ fontSize: 12, color: C.text3 }}>
                  Supported formats: PDF, Word (DOCX), Excel (XLSX, CSV), Text (TXT, MD) up to 50MB
                </div>
              </div>

              {isUploading && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: C.text2, marginBottom: 6 }}>
                    <span>Uploading & Vector-Embedding...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div style={{ width: '100%', height: 6, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${uploadProgress}%`, height: '100%', background: C.blue, transition: 'width 0.2s' }} />
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '12px 20px', background: '#f8fafc', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setShowUploadModal(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  background: '#fff',
                  border: `1px solid ${C.borderDark}`,
                  fontSize: 13,
                  fontWeight: 600,
                  color: C.text2,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
