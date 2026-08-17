import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { aiApi } from '../../api/ai.api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Spinner } from '@phosphor-icons/react'
import { PaperPlaneRight, Robot, User, ChatCircleText } from '@phosphor-icons/react'
import ReactMarkdown from 'react-markdown'

interface Message {
  id?: string
  role: 'user' | 'model' | 'system'
  content: string
}

interface Session {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export default function AiChatPage() {
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('project') || ''
  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionId, setSessionId] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

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
  }, [messages])

  const fetchSessions = async () => {
    try {
      setSessionsLoading(true)
      const { data } = await aiApi.getSessions(projectId)
      setSessions(data)
      if (data.length > 0 && !sessionId) {
        setSessionId(data[0].id)
      } else if (data.length === 0) {
        startNewChat()
      }
    } catch (err: any) {
      alert('Failed to load chat history')
    } finally {
      setSessionsLoading(false)
    }
  }

  const fetchSessionHistory = async (id: string) => {
    try {
      setLoading(true)
      const { data } = await aiApi.getSessionHistory(id)
      setMessages(data.messages)
    } catch (err: any) {
      alert('Failed to load messages')
      setSessionId('') // reset if not found
    } finally {
      setLoading(false)
    }
  }

  const startNewChat = () => {
    setSessionId(uuidv4())
    setMessages([])
  }

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const query = input.trim()
    if (!query || loading) return

    setInput('')
    const optimisticUserMsg: Message = { role: 'user', content: query }
    const loadingMsg: Message = { role: 'system', content: '...' }
    setMessages(prev => [...prev, optimisticUserMsg, loadingMsg])
    setLoading(true)

    try {
      const activeSessionId = sessionId || uuidv4()
      if (!sessionId) setSessionId(activeSessionId)

      const { data } = await aiApi.chat(activeSessionId, query, projectId)
      
      setMessages(prev => {
        const withoutLoading = prev.filter(m => m.content !== '...')
        return [...withoutLoading, { role: 'model', content: data.text }]
      })

      // Refresh sessions list if it was a new chat
      if (!sessionId) {
        fetchSessions()
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to get response')
      setMessages(prev => prev.filter(m => m.content !== '...'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">ProjectOS AI Assistant</h1>
        <p className="text-sm text-slate-500">Ask questions about your project data, contracts, and documents.</p>
      </div>

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex">
        {/* Sidebar: Chat History */}
        <div className="w-64 border-r border-slate-200 bg-slate-50 flex flex-col">
          <div className="p-4 border-b border-slate-200">
            <Button onClick={startNewChat} className="w-full justify-center gap-2" variant="outline">
              <ChatCircleText weight="fill" className="w-4 h-4" />
              New Chat
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sessionsLoading ? (
              <div className="text-center p-4 text-slate-500"><Spinner className="w-5 h-5 animate-spin mx-auto" /></div>
            ) : sessions.length === 0 ? (
              <div className="text-center p-4 text-sm text-slate-500">No recent chats</div>
            ) : (
              sessions.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSessionId(s.id)}
                  className={`w-full text-left px-3 py-2 text-sm rounded-lg truncate transition-colors ${
                    sessionId === s.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {s.title || 'New Chat'}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/50">
            {messages.length === 0 && !loading && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                <div className="w-16 h-16 bg-indigo-100 text-indigo-500 rounded-full flex items-center justify-center">
                  <Robot weight="fill" className="w-8 h-8" />
                </div>
                <p>How can I help you today?</p>
              </div>
            )}
            
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'
                }`}>
                  {m.role === 'user' ? <User weight="fill" className="w-5 h-5" /> : <Robot weight="fill" className="w-5 h-5" />}
                </div>
                
                <div className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                  m.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : m.role === 'system'
                      ? 'bg-white border border-slate-200 text-slate-500 flex items-center gap-2 rounded-tl-none'
                      : 'bg-white border border-slate-200 text-slate-800 shadow-sm rounded-tl-none prose prose-sm max-w-none'
                }`}>
                  {m.role === 'system' ? (
                    <><Spinner className="w-4 h-4 animate-spin" /> Thinking...</>
                  ) : m.role === 'user' ? (
                    m.content
                  ) : (
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-slate-200">
            <form onSubmit={handleSend} className="relative max-w-4xl mx-auto flex gap-2">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask about project data, contracts, site visits..."
                className="flex-1 rounded-full pl-6 pr-12 py-3 bg-slate-50 border-slate-300 focus:bg-white transition-colors"
                disabled={loading}
              />
              <Button 
                type="submit" 
                disabled={!input.trim() || loading} 
                className="absolute right-1 top-1 bottom-1 rounded-full w-10 h-10 p-0 flex items-center justify-center"
              >
                {loading ? <Spinner className="w-4 h-4 animate-spin" /> : <PaperPlaneRight weight="fill" className="w-4 h-4 ml-0.5" />}
              </Button>
            </form>
            <p className="text-center text-xs text-slate-400 mt-2">
              AI can make mistakes. Verify important information.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
