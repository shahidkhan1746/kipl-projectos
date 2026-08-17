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
  Info,
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

const STARTER_PROMPTS = [
  {
    icon: Buildings,
    color: '#2563eb',
    bgColor: '#eff6ff',
    title: 'Approved Procurement Brands',
    desc: 'List approved brands for cement, steel, pipes, and electrical equipment.',
    prompt: 'What are the approved brands for procurement (cement, TMT steel, pipes, pumps, electrical) for this project?',
  },
  {
    icon: CalendarBlank,
    color: '#059669',
    bgColor: '#ecfdf5',
    title: 'Project Dates & Milestones',
    desc: 'Agreement execution, project start date, duration, and completion timeline.',
    prompt: 'What was the agreement execution date, commencement date, total project duration, and stipulated completion date?',
  },
  {
    icon: FileText,
    color: '#7c3aed',
    bgColor: '#f5f3ff',
    title: 'Contract Scope & Deliverables',
    desc: 'Key deliverables, technical requirements, and contractor obligations.',
    prompt: 'Summarize the primary scope of work, technical specifications, and key deliverables under this contract.',
  },
  {
    icon: ShieldCheck,
    color: '#d97706',
    bgColor: '#fffbeb',
    title: 'Meeting Decisions & Action Items',
    desc: 'Summary of critical pending action items and site instructions.',
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
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

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
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 140) + 'px'
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
      textareaRef.current.style.height = 'auto'
    }

    const optimisticUserMsg: Message = { role: 'user', content: query }
    setMessages(prev => [...prev, optimisticUserMsg])
    setLoading(true)

    try {
      const activeSessionId = sessionId || uuidv4()
      if (!sessionId) setSessionId(activeSessionId)

      const { data } = await aiApi.chat(activeSessionId, query, projectId)

      setMessages(prev => [...prev, { role: 'model', content: data.text }])

      // If this was a new session, refresh session list to get generated title
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
          content: `⚠️ **Error:** ${errMsg}\n\nPlease verify your project documents or try asking again in a few moments.`,
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
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[580px] max-w-[1400px] mx-auto">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Sparkle weight="fill" className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 leading-tight">ProjectOS Intelligence Assistant</h1>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                RAG Grounded
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Trained on project contracts, Liaison records, site orders, and technical specs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={startNewChat}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
          >
            <Plus weight="bold" className="w-3.5 h-3.5" />
            New Conversation
          </button>
        </div>
      </div>

      {/* Main Chat Workspace */}
      <div className="flex-1 flex bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-0">
        {/* Left Sidebar: Chat History */}
        <aside className="w-72 bg-slate-50 border-r border-slate-200 flex flex-col flex-shrink-0">
          {/* New Chat Button & Search */}
          <div className="p-3 border-b border-slate-200 space-y-2">
            <button
              onClick={startNewChat}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-slate-800 hover:text-blue-700 font-semibold text-xs rounded-xl shadow-2xs transition-all"
            >
              <ChatCircleText weight="bold" className="w-4 h-4 text-blue-600" />
              Start New Chat
            </button>

            <div className="relative">
              <MagnifyingGlass className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-slate-700 placeholder-slate-400"
              />
            </div>
          </div>

          {/* Session List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sessionsLoading ? (
              <div className="flex flex-col items-center justify-center p-8 text-slate-400 gap-2">
                <Spinner size={18} />
                <span className="text-xs">Loading chats...</span>
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <ClockCounterClockwise className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs font-medium text-slate-500">No conversations yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Start by asking a question about the project</p>
              </div>
            ) : (
              filteredSessions.map(s => {
                const isActive = sessionId === s.id
                return (
                  <div
                    key={s.id}
                    onClick={() => setSessionId(s.id)}
                    className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                      isActive
                        ? 'bg-blue-50/80 text-blue-900 border border-blue-200/80 font-medium shadow-2xs'
                        : 'text-slate-700 hover:bg-slate-200/60 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-1">
                      <ChatCircleText
                        weight={isActive ? 'fill' : 'regular'}
                        className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`}
                      />
                      <div className="truncate flex-1">
                        <p className="text-xs truncate">{s.title || 'New Conversation'}</p>
                        <span className="text-[10px] text-slate-400 block">
                          {formatRelativeTime(s.updatedAt || s.createdAt)}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={e => handleDeleteSession(s.id, e)}
                      title="Delete chat"
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all flex-shrink-0"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })
            )}
          </div>

          {/* Knowledge Engine Footer Card */}
          <div className="p-3 border-t border-slate-200 bg-white/60">
            <div className="rounded-xl p-2.5 bg-slate-100/80 border border-slate-200 flex items-start gap-2.5">
              <Lightning weight="fill" className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[11px] font-semibold text-slate-800">pgvector RAG Engine</p>
                <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                  Embeddings synced with uploaded contracts & letters.
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Area: Messages & Input */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-50/40">
          {/* Active Chat Header */}
          <div className="px-5 py-3 bg-white border-b border-slate-200 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-2 h-2 rounded-full bg-blue-600"></div>
              <h2 className="text-xs font-semibold text-slate-800 truncate">
                {sessions.find(s => s.id === sessionId)?.title || 'Current Conversation'}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={startNewChat}
                className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded hover:bg-slate-100 transition-colors flex items-center gap-1"
              >
                <ArrowsClockwise className="w-3.5 h-3.5" />
                Clear
              </button>
            </div>
          </div>

          {/* Scrollable Message Feed */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 && !loading ? (
              /* Empty Chat Welcome State */
              <div className="max-w-3xl mx-auto py-8 px-4 flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 mb-4">
                  <Sparkle weight="fill" className="w-7 h-7" />
                </div>

                <h3 className="text-lg font-bold text-slate-900 text-center">
                  How can I help with your project today?
                </h3>
                <p className="text-xs text-slate-500 text-center max-w-md mt-1 mb-8">
                  I have indexed your project documents, letters, agreements, and specifications. Ask any question
                  or click a starter below:
                </p>

                {/* Prompt Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                  {STARTER_PROMPTS.map((item, idx) => {
                    const Icon = item.icon
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSend(item.prompt)}
                        className="text-left p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all group flex flex-col justify-between"
                      >
                        <div className="flex items-start gap-3 mb-2">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: item.bgColor, color: item.color }}
                          >
                            <Icon weight="fill" className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                              {item.title}
                            </h4>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{item.desc}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity self-end mt-1">
                          <span>Ask this</span>
                          <ArrowRight weight="bold" className="w-3 h-3" />
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              /* Messages List */
              <div className="max-w-4xl mx-auto space-y-6">
                {messages.map((m, i) => {
                  const isUser = m.role === 'user'
                  return (
                    <div
                      key={i}
                      className={`flex gap-3.5 items-start ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      {/* Avatar */}
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-2xs ${
                          isUser
                            ? 'bg-slate-900 text-white font-bold text-xs'
                            : 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white'
                        }`}
                      >
                        {isUser ? (
                          user?.name ? user.name.charAt(0).toUpperCase() : <User weight="bold" className="w-4 h-4" />
                        ) : (
                          <Sparkle weight="fill" className="w-4 h-4" />
                        )}
                      </div>

                      {/* Bubble */}
                      <div
                        className={`group relative max-w-[82%] rounded-2xl px-4 py-3.5 ${
                          isUser
                            ? 'bg-blue-600 text-white rounded-tr-xs shadow-sm shadow-blue-600/10'
                            : 'bg-white border border-slate-200/90 text-slate-800 rounded-tl-xs shadow-xs'
                        }`}
                      >
                        {isUser ? (
                          <p className="text-xs leading-relaxed whitespace-pre-wrap font-normal">{m.content}</p>
                        ) : (
                          <div className="text-xs leading-relaxed space-y-2 text-slate-800 markdown-body">
                            <ReactMarkdown
                              components={{
                                h1: ({ children }) => (
                                  <h1 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-1 mb-2 mt-3">
                                    {children}
                                  </h1>
                                ),
                                h2: ({ children }) => (
                                  <h2 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-1 mb-1.5 mt-2.5">
                                    {children}
                                  </h2>
                                ),
                                h3: ({ children }) => (
                                  <h3 className="text-xs font-bold text-slate-800 mb-1 mt-2">{children}</h3>
                                ),
                                p: ({ children }) => <p className="mb-2 leading-relaxed">{children}</p>,
                                ul: ({ children }) => (
                                  <ul className="list-disc pl-4 space-y-1 mb-2 text-slate-700">{children}</ul>
                                ),
                                ol: ({ children }) => (
                                  <ol className="list-decimal pl-4 space-y-1 mb-2 text-slate-700">{children}</ol>
                                ),
                                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                                strong: ({ children }) => (
                                  <strong className="font-semibold text-slate-900">{children}</strong>
                                ),
                                table: ({ children }) => (
                                  <div className="overflow-x-auto my-2 rounded-lg border border-slate-200">
                                    <table className="min-w-full divide-y divide-slate-200 text-[11px] text-left">
                                      {children}
                                    </table>
                                  </div>
                                ),
                                thead: ({ children }) => (
                                  <thead className="bg-slate-100 text-slate-700 font-semibold">{children}</thead>
                                ),
                                th: ({ children }) => <th className="px-3 py-1.5 border-r border-slate-200 last:border-0">{children}</th>,
                                td: ({ children }) => <td className="px-3 py-1.5 border-t border-slate-100 border-r last:border-0">{children}</td>,
                                blockquote: ({ children }) => (
                                  <blockquote className="border-l-3 border-blue-500 bg-blue-50/50 pl-3 py-1 my-2 text-slate-600 italic">
                                    {children}
                                  </blockquote>
                                ),
                                code: ({ children }) => (
                                  <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-[11px] font-mono">
                                    {children}
                                  </code>
                                ),
                              }}
                            >
                              {m.content}
                            </ReactMarkdown>

                            {/* Response Actions */}
                            <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                              <span className="flex items-center gap-1 text-[10px]">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                Grounded in project knowledge
                              </span>

                              <button
                                onClick={() => copyToClipboard(m.content, i)}
                                className="opacity-70 hover:opacity-100 hover:text-slate-700 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-100 transition-all text-[11px]"
                              >
                                {copiedIndex === i ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    <span className="text-emerald-600 font-medium">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
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
                  <div className="flex gap-3.5 items-start">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
                      <Sparkle weight="fill" className="w-4 h-4 animate-spin" />
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs px-4 py-3 shadow-xs">
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                        <Spinner size={14} />
                        <span>Analyzing project files & generating answer...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Bottom Prompt Bar Area */}
          <div className="p-4 bg-white border-t border-slate-200 flex-shrink-0">
            <div className="max-w-4xl mx-auto space-y-2.5">
              {/* Quick Prompt Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mr-1 flex-shrink-0">
                  <Lightning weight="fill" className="w-3 h-3 text-amber-500" />
                  Quick:
                </span>
                {QUICK_CHIPS.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(chip)}
                    className="text-[11px] whitespace-nowrap px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 hover:border-blue-200 transition-all font-medium flex-shrink-0"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Chat Input Box */}
              <div className="relative rounded-2xl border border-slate-300 focus-within:border-blue-500 focus-within:ring-3 focus-within:ring-blue-100 bg-white shadow-2xs transition-all overflow-hidden">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask any question about your project contracts, materials, timelines, or meetings..."
                  disabled={loading}
                  className="w-full resize-none py-3.5 pl-4 pr-14 text-xs text-slate-800 placeholder-slate-400 bg-transparent outline-none max-h-36 leading-relaxed"
                />

                <div className="absolute right-2 bottom-2">
                  <button
                    onClick={() => handleSend()}
                    disabled={!input.trim() || loading}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                      input.trim() && !loading
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm cursor-pointer'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                    title="Send message (Enter)"
                  >
                    {loading ? (
                      <Spinner size={14} />
                    ) : (
                      <PaperPlaneRight weight="fill" className="w-4 h-4 ml-0.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                <span>Press <strong>Enter</strong> to send, <strong>Shift + Enter</strong> for new line</span>
                <span className="flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  AI assistant retrieves context from vectorized project files.
                </span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
