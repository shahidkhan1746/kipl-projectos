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

const STARTER_PROMPTS = [
  {
    icon: Buildings,
    title: 'Approved Procurement Brands',
    desc: 'List approved brands for cement, TMT steel, pipes, and electrical equipment.',
    prompt: 'What are the approved brands for procurement (cement, TMT steel, pipes, pumps, electrical) for this project?',
  },
  {
    icon: CalendarBlank,
    title: 'Project Dates & Milestones',
    desc: 'Agreement execution date, commencement, duration, and completion schedule.',
    prompt: 'What was the agreement execution date, commencement date, total project duration, and stipulated completion date?',
  },
  {
    icon: FileText,
    title: 'Contract Scope of Work',
    desc: 'Summary of key project deliverables, technical specs, and site scopes.',
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
      const newHeight = Math.min(Math.max(textareaRef.current.scrollHeight, 52), 160)
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
      textareaRef.current.style.height = '52px'
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
    <div className="flex flex-col h-[calc(100vh-130px)] min-h-[620px] max-w-[1440px] mx-auto font-sans">
      {/* Header */}
      <header className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
            <Sparkle weight="fill" className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">ProjectOS Intelligence</h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                RAG Grounded
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Search and analyze contracts, Liaison documents, material specs, and meeting records
            </p>
          </div>
        </div>

        <button
          onClick={startNewChat}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
        >
          <Plus weight="bold" className="w-4 h-4" />
          New Chat
        </button>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-0">
        {/* Left Sidebar */}
        <aside className="w-80 bg-slate-50/80 border-r border-slate-200 flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-slate-200 space-y-3">
            <button
              onClick={startNewChat}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-semibold text-sm rounded-xl shadow-xs transition-all"
            >
              <Plus weight="bold" className="w-4 h-4 text-blue-600" />
              Start New Conversation
            </button>

            <div className="relative">
              <MagnifyingGlass className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-10 pr-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl outline-none focus:border-blue-600 text-slate-800 placeholder-slate-400"
              />
            </div>
          </div>

          {/* Session List */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
            {sessionsLoading ? (
              <div className="flex flex-col items-center justify-center p-8 text-slate-400 gap-2">
                <Spinner size={20} />
                <span className="text-sm">Loading chats...</span>
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <ClockCounterClockwise className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-sm font-medium text-slate-600">No conversations yet</p>
                <p className="text-xs text-slate-400 mt-1">Start by asking a question</p>
              </div>
            ) : (
              filteredSessions.map(s => {
                const isActive = sessionId === s.id
                return (
                  <div
                    key={s.id}
                    onClick={() => setSessionId(s.id)}
                    className={`group relative flex items-center justify-between px-3.5 py-3 rounded-xl cursor-pointer transition-all ${
                      isActive
                        ? 'bg-blue-50/80 text-blue-900 border border-blue-200 font-medium'
                        : 'text-slate-700 hover:bg-slate-200/60 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                      <ChatCircleText
                        weight={isActive ? 'fill' : 'regular'}
                        className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`}
                      />
                      <div className="truncate flex-1">
                        <p className="text-sm truncate leading-snug">{s.title || 'New Conversation'}</p>
                        <span className="text-xs text-slate-400 block mt-0.5">
                          {formatRelativeTime(s.updatedAt || s.createdAt)}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={e => handleDeleteSession(s.id, e)}
                      title="Delete chat"
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all flex-shrink-0"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer Knowledge Card */}
          <div className="p-3.5 border-t border-slate-200 bg-white">
            <div className="rounded-xl p-3 bg-slate-50 border border-slate-200 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0 text-amber-600">
                <Lightning weight="fill" className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Vector Knowledge Base</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Synced with contracts, letters & logs.
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Chat Workspace */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-50/30">
          {/* Chat Top Bar */}
          <div className="px-6 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
              <h2 className="text-sm font-bold text-slate-800 truncate">
                {sessions.find(s => s.id === sessionId)?.title || 'Current Conversation'}
              </h2>
            </div>

            <button
              onClick={startNewChat}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1.5"
            >
              <ArrowsClockwise className="w-4 h-4" />
              Clear & Start New
            </button>
          </div>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
            {messages.length === 0 && !loading ? (
              /* Welcome Screen */
              <div className="max-w-3xl mx-auto py-8 flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md mb-4">
                  <Sparkle weight="fill" className="w-8 h-8" />
                </div>

                <h3 className="text-2xl font-bold text-slate-900 text-center tracking-tight">
                  How can I help with your project today?
                </h3>
                <p className="text-sm text-slate-500 text-center max-w-lg mt-2 mb-8 leading-relaxed">
                  Ask anything about contractual timelines, approved brands, deliverables, or site instructions.
                </p>

                {/* Prompt Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                  {STARTER_PROMPTS.map((item, idx) => {
                    const Icon = item.icon
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSend(item.prompt)}
                        className="text-left p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all group flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-3 mb-2.5">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                              <Icon weight="bold" className="w-5 h-5" />
                            </div>
                            <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {item.title}
                            </h4>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed pl-12">{item.desc}</p>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity self-end mt-3">
                          <span>Run query</span>
                          <ArrowRight weight="bold" className="w-3.5 h-3.5" />
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              /* Message Thread */
              <div className="max-w-4xl mx-auto space-y-6">
                {messages.map((m, i) => {
                  const isUser = m.role === 'user'
                  return (
                    <div
                      key={i}
                      className={`flex gap-4 items-start ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      {/* Avatar */}
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold shadow-xs ${
                          isUser
                            ? 'bg-slate-900 text-white'
                            : 'bg-blue-600 text-white'
                        }`}
                      >
                        {isUser ? (
                          user?.name ? user.name.charAt(0).toUpperCase() : <User weight="bold" className="w-5 h-5" />
                        ) : (
                          <Sparkle weight="fill" className="w-5 h-5" />
                        )}
                      </div>

                      {/* Bubble */}
                      <div
                        className={`max-w-[85%] rounded-2xl px-5 py-4 ${
                          isUser
                            ? 'bg-blue-600 text-white rounded-tr-xs shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs shadow-xs'
                        }`}
                      >
                        {isUser ? (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                        ) : (
                          <div className="text-sm leading-relaxed space-y-3 text-slate-800">
                            <ReactMarkdown
                              components={{
                                h1: ({ children }) => (
                                  <h1 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-1.5 mb-2 mt-4">
                                    {children}
                                  </h1>
                                ),
                                h2: ({ children }) => (
                                  <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-1 mb-2 mt-3">
                                    {children}
                                  </h2>
                                ),
                                h3: ({ children }) => (
                                  <h3 className="text-sm font-bold text-slate-800 mb-1.5 mt-2">{children}</h3>
                                ),
                                p: ({ children }) => <p className="mb-2.5 leading-relaxed">{children}</p>,
                                ul: ({ children }) => (
                                  <ul className="list-disc pl-5 space-y-1 mb-3 text-slate-700">{children}</ul>
                                ),
                                ol: ({ children }) => (
                                  <ol className="list-decimal pl-5 space-y-1 mb-3 text-slate-700">{children}</ol>
                                ),
                                li: ({ children }) => <li className="leading-relaxed pl-1">{children}</li>,
                                strong: ({ children }) => (
                                  <strong className="font-semibold text-slate-900">{children}</strong>
                                ),
                                table: ({ children }) => (
                                  <div className="overflow-x-auto my-3 rounded-xl border border-slate-200">
                                    <table className="min-w-full divide-y divide-slate-200 text-xs text-left">
                                      {children}
                                    </table>
                                  </div>
                                ),
                                thead: ({ children }) => (
                                  <thead className="bg-slate-100 text-slate-800 font-bold">{children}</thead>
                                ),
                                th: ({ children }) => <th className="px-4 py-2 border-r border-slate-200 last:border-0">{children}</th>,
                                td: ({ children }) => <td className="px-4 py-2.5 border-t border-slate-100 border-r last:border-0 text-slate-700">{children}</td>,
                                blockquote: ({ children }) => (
                                  <blockquote className="border-l-4 border-blue-600 bg-blue-50/60 pl-4 py-2 my-3 text-slate-700 italic rounded-r-lg">
                                    {children}
                                  </blockquote>
                                ),
                                code: ({ children }) => (
                                  <code className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-xs font-mono">
                                    {children}
                                  </code>
                                ),
                              }}
                            >
                              {m.content}
                            </ReactMarkdown>

                            {/* Response Actions */}
                            <div className="pt-2.5 mt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                              <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                Grounded in project knowledge
                              </span>

                              <button
                                onClick={() => copyToClipboard(m.content, i)}
                                className="hover:text-slate-800 flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-all font-semibold"
                              >
                                {copiedIndex === i ? (
                                  <>
                                    <Check className="w-4 h-4 text-emerald-600" />
                                    <span className="text-emerald-600">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-4 h-4" />
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

                {/* Thinking animation */}
                {loading && (
                  <div className="flex gap-4 items-start">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                      <Sparkle weight="fill" className="w-5 h-5 animate-spin" />
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs px-5 py-4 shadow-xs">
                      <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                        <Spinner size={16} />
                        <span>Searching project knowledge base and generating answer...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Bottom Prompt Bar */}
          <div className="p-5 md:p-6 bg-white border-t border-slate-200 flex-shrink-0">
            <div className="max-w-4xl mx-auto space-y-3">
              {/* Quick Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1 mr-1 flex-shrink-0">
                  <Lightning weight="fill" className="w-3.5 h-3.5 text-amber-500" />
                  Quick:
                </span>
                {QUICK_CHIPS.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(chip)}
                    className="text-xs whitespace-nowrap px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 transition-all font-medium flex-shrink-0"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Large, Roomy Input Box */}
              <div className="relative rounded-2xl border-2 border-slate-200 focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-50 bg-white shadow-xs transition-all overflow-hidden flex items-end p-2">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask any question about your project contracts, materials, timelines, or meetings..."
                  disabled={loading}
                  className="flex-1 resize-none py-2.5 px-3.5 text-sm md:text-[15px] text-slate-800 placeholder-slate-400 bg-transparent outline-none max-h-40 leading-relaxed font-normal"
                />

                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || loading}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ml-2 ${
                    input.trim() && !loading
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm cursor-pointer'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                  title="Send message (Enter)"
                >
                  {loading ? (
                    <Spinner size={16} />
                  ) : (
                    <PaperPlaneRight weight="fill" className="w-5 h-5 ml-0.5" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
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
