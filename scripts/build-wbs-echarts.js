#!/usr/bin/env node
/**
 * KIPL ProjectOS — WbsPage with Apache ECharts
 * Replaces existing WbsPage with 4 chart tabs:
 * 1. Gantt Chart (task-level with planned vs actual)
 * 2. Summary Gantt (work package level)
 * 3. Cumulative Delay Curve (cricket-style worm)
 * 4. Milestone Timeline
 */

const fs   = require('fs')
const path = require('path')

const FILE = path.resolve(__dirname, '..', 'frontend', 'src', 'pages', 'wbs', 'WbsPage.tsx')

const content = `import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import { wbsApi } from '@/api/wbs.api'
import ReactECharts from 'echarts-for-react'
import {
  GitBranch, ChartLine, Flag, Kanban,
  Plus, CheckCircle, Clock, Warning,
} from '@phosphor-icons/react'

const C = {
  card:'#fff', border:'#e2e8f0', text1:'#0f172a', text2:'#475569', text3:'#94a3b8',
  blue:'#2563eb', green:'#059669', amber:'#d97706', red:'#dc2626', navy:'#1a2540',
  blueBg:'#eff6ff', greenBg:'#f0fdf4',
}

const STATUS_COLOR: Record<string,string> = {
  completed:   '#059669',
  in_progress: '#2563eb',
  not_started: '#94a3b8',
  delayed:     '#dc2626',
  on_hold:     '#d97706',
}

const TABS = [
  { id:'gantt',    label:'Gantt Chart',      icon:GitBranch },
  { id:'summary',  label:'Work Packages',    icon:Kanban    },
  { id:'delay',    label:'Delay Curve',      icon:ChartLine },
  { id:'milestones',label:'Milestones',      icon:Flag      },
]

function fmtDate(d: string|null|undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
}

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000)
}

export default function WbsPage() {
  const { activeProjectId } = useAuthStore()
  const [tab, setTab] = useState('gantt')

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['wbs', activeProjectId],
    queryFn:  () => wbsApi.list({ projectId: activeProjectId! }).then(r => r.data),
    enabled:  !!activeProjectId,
  })

  const { data: dash } = useQuery({
    queryKey: ['wbs-dash', activeProjectId],
    queryFn:  () => wbsApi.dashboard(activeProjectId!).then(r => r.data),
    enabled:  !!activeProjectId,
  })

  // Separate task types
  const regularTasks  = tasks.filter((t: any) => !t.isMilestone && t.taskCode?.startsWith('T'))
  const workPackages  = tasks.filter((t: any) => !t.isMilestone && t.taskCode?.startsWith('P'))
  const milestones    = tasks.filter((t: any) => t.isMilestone)
  const delayedTasks  = regularTasks.filter((t: any) => (t.delayDays ?? 0) > 0)

  // ── Gantt Chart Option ────────────────────────────────────────────────────
  const CONTRACT_START = '2025-09-27'

  function buildGanttOption(taskList: any[]) {
    const sorted = [...taskList].sort((a, b) =>
      new Date(a.plannedStart ?? a.planned_start ?? '2025-01-01').getTime() -
      new Date(b.plannedStart ?? b.planned_start ?? '2025-01-01').getTime()
    )

    const yAxis = sorted.map((t: any) => t.title ?? t.task_code)

    const plannedBars = sorted.map((t: any, i: number) => {
      const start = t.plannedStart ?? t.planned_start
      const end   = t.plannedEnd   ?? t.planned_end
      if (!start || !end) return null
      const s = daysBetween(CONTRACT_START, start)
      const d = daysBetween(start, end)
      return { value: [i, s, s + d, t.title], itemStyle: { color: '#bfdbfe', borderColor:'#2563eb', borderWidth:1 } }
    }).filter(Boolean)

    const actualBars = sorted.map((t: any, i: number) => {
      const start = t.actualStart ?? t.actual_start
      const end   = t.actualEnd   ?? t.actual_end
      if (!start) return null
      const endDate = end ?? new Date().toISOString().split('T')[0]
      const s = daysBetween(CONTRACT_START, start)
      const d = daysBetween(start, endDate)
      return {
        value: [i, s, s + d, t.title],
        itemStyle: {
          color: t.status === 'completed' ? '#059669' :
                 t.status === 'in_progress' ? '#2563eb' : '#d97706',
          opacity: 0.85,
        }
      }
    }).filter(Boolean)

    // Today line
    const todayOffset = daysBetween(CONTRACT_START, new Date().toISOString().split('T')[0])

    return {
      tooltip: {
        formatter: (p: any) => {
          if (!p.data?.value) return ''
          const t = sorted[p.data.value[0]]
          return \`<b>\${t.title}</b><br/>
            Status: \${t.status}<br/>
            Planned: \${fmtDate(t.plannedStart ?? t.planned_start)} → \${fmtDate(t.plannedEnd ?? t.planned_end)}<br/>
            \${t.delayDays > 0 ? '<span style="color:#dc2626">Delay: ' + t.delayDays + ' days — ' + (t.delayReason ?? t.delay_reason ?? '') + '</span>' : ''}
          \`
        }
      },
      grid: { left: 200, right: 40, top: 20, bottom: 40 },
      xAxis: {
        type: 'value',
        min: 0,
        axisLabel: {
          formatter: (v: number) => {
            const d = new Date(new Date(CONTRACT_START).getTime() + v * 86400000)
            return d.toLocaleDateString('en-IN', { month:'short', year:'2-digit' })
          },
          fontSize: 11,
        },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
      },
      yAxis: {
        type: 'category',
        data: yAxis,
        axisLabel: { fontSize: 11, color: '#475569', width: 180, overflow: 'truncate' },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          type: 'custom',
          name: 'Planned',
          renderItem: (_: any, api: any) => {
            const idx = api.value(0)
            const start = api.coord([api.value(1), idx])
            const end   = api.coord([api.value(2), idx])
            const height = api.size([0, 1])[1] * 0.5
            return {
              type: 'rect',
              shape: { x: start[0], y: start[1] - height/2, width: end[0]-start[0], height },
              style: api.style(),
            }
          },
          data: plannedBars,
          encode: { x: [1,2], y: 0 },
        },
        {
          type: 'custom',
          name: 'Actual',
          renderItem: (_: any, api: any) => {
            const idx = api.value(0)
            const start = api.coord([api.value(1), idx])
            const end   = api.coord([api.value(2), idx])
            const height = api.size([0, 1])[1] * 0.3
            return {
              type: 'rect',
              shape: { x: start[0], y: start[1] + height/2, width: end[0]-start[0], height },
              style: api.style(),
            }
          },
          data: actualBars,
          encode: { x: [1,2], y: 0 },
          markLine: {
            silent: true,
            symbol: 'none',
            data: [{ xAxis: todayOffset }],
            lineStyle: { color: '#dc2626', width: 2, type: 'solid' },
            label: { formatter: 'TODAY', color: '#dc2626', fontSize: 10 },
          },
        },
      ],
    }
  }

  // ── Delay Curve (Cricket worm) ────────────────────────────────────────────
  function buildDelayOption() {
    const sorted = [...delayedTasks].sort((a: any, b: any) =>
      new Date(a.plannedStart ?? a.planned_start ?? '').getTime() -
      new Date(b.plannedStart ?? b.planned_start ?? '').getTime()
    )

    let cumulative = 0
    const data = sorted.map((t: any) => {
      cumulative += (t.delayDays ?? 0)
      return {
        name: t.title,
        value: [t.plannedStart ?? t.planned_start, cumulative],
        delay: t.delayDays ?? 0,
        reason: t.delayReason ?? t.delay_reason ?? '',
      }
    })

    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const p = params[0]
          const d = data[p.dataIndex]
          return \`<b>\${d.name}</b><br/>Cumulative Delay: \${d.value[1]} days<br/>This task: +\${d.delay} days<br/>\${d.reason}\`
        },
      },
      grid: { left: 60, right: 40, top: 40, bottom: 60 },
      xAxis: {
        type: 'time',
        axisLabel: { fontSize: 11, color: '#475569' },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
      },
      yAxis: {
        type: 'value',
        name: 'Cumulative Delay (days)',
        nameTextStyle: { fontSize: 11, color: '#475569' },
        axisLabel: { fontSize: 11, color: '#475569' },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
      },
      series: [{
        type: 'line',
        data: data.map(d => d.value),
        symbol: 'circle',
        symbolSize: 10,
        lineStyle: { color: '#dc2626', width: 3 },
        itemStyle: { color: '#dc2626', borderColor: '#fff', borderWidth: 2 },
        areaStyle: { color: { type:'linear', x:0, y:0, x2:0, y2:1, colorStops:[
          { offset:0, color:'rgba(220,38,38,0.15)' },
          { offset:1, color:'rgba(220,38,38,0.02)' },
        ]}},
        markLine: {
          silent: true,
          symbol: 'none',
          data: [{ yAxis: 49, name: 'EOT Threshold' }],
          lineStyle: { color: '#d97706', type: 'dashed' },
          label: { formatter: 'EOT Threshold', color: '#d97706', fontSize: 10 },
        },
      }],
    }
  }

  // ── Summary Gantt (Work Packages) ─────────────────────────────────────────
  const summaryOption = buildGanttOption(workPackages)

  // ── Milestone Timeline ────────────────────────────────────────────────────
  function buildMilestoneOption() {
    const sorted = [...milestones].sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))

    const statuses = sorted.map((m: any) => m.status)
    const names    = sorted.map((m: any) => m.title)
    const planned  = sorted.map((m: any) => m.plannedEnd ?? m.planned_end ?? m.plannedStart ?? m.planned_start)
    const actual   = sorted.map((m: any) => m.actualEnd ?? m.actual_end)

    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const i = params[0]?.dataIndex
          const m = sorted[i]
          if (!m) return ''
          return \`<b>\${m.title}</b><br/>
            Planned: \${fmtDate(m.plannedEnd ?? m.planned_end)}<br/>
            Actual: \${fmtDate(m.actualEnd ?? m.actual_end) || 'Pending'}<br/>
            \${m.delayDays > 0 ? '<span style="color:#dc2626">Delayed by ' + m.delayDays + ' days</span>' : ''}
          \`
        },
      },
      grid: { left: 180, right: 40, top: 40, bottom: 60 },
      xAxis: { type: 'time', axisLabel: { fontSize: 11, color: '#475569' }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
      yAxis: { type: 'category', data: names, axisLabel: { fontSize: 11, color: '#475569', width: 160, overflow: 'truncate' }, axisLine: { show: false }, axisTick: { show: false } },
      series: [
        {
          name: 'Planned',
          type: 'scatter',
          data: planned.map((d: any, i: number) => d ? [d, names[i]] : null).filter(Boolean),
          symbolSize: 16,
          symbol: 'diamond',
          itemStyle: { color: '#94a3b8', borderColor: '#fff', borderWidth: 2 },
        },
        {
          name: 'Actual',
          type: 'scatter',
          data: actual.map((d: any, i: number) => d ? [d, names[i]] : null).filter(Boolean),
          symbolSize: 20,
          symbol: 'diamond',
          itemStyle: {
            color: (p: any) => {
              const m = sorted[names.indexOf(p.data[1])]
              return m?.status === 'completed' ? '#059669' : '#dc2626'
            },
            borderColor: '#fff', borderWidth: 2,
          },
        },
      ],
      legend: {
        data: ['Planned', 'Actual'],
        bottom: 10,
        textStyle: { fontSize: 11, color: '#475569' },
      },
    }
  }

  if (isLoading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:400 }}>
      <div style={{ textAlign:'center', color: C.text3 }}>
        <div style={{ width:36, height:36, border:'3px solid '+C.blue, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 12px' }} />
        <p style={{ fontSize:14 }}>Loading WBS data...</p>
        <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
      </div>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, color:C.text1, margin:'0 0 5px', letterSpacing:'-0.02em' }}>WBS & Schedule</h1>
          <p style={{ fontSize:14, color:C.text3, margin:0 }}>Clause 17 — Time Schedule · Milestones · Progress Tracking</p>
        </div>
        <button style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 18px',
          background:C.blue, color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer' }}>
          <Plus size={16} weight="bold" /> Add Task
        </button>
      </div>

      {/* Summary stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:14 }}>
        {[
          { label:'Overall Progress', value:(dash?.overallProgress??'0')+'%', color:C.blue },
          { label:'Tasks In Progress', value:dash?.inProgress??0, color:C.blue },
          { label:'Completed', value:(dash?.completed??0)+'/'+(dash?.totalTasks??0), color:C.green },
          { label:'Delayed Tasks', value:dash?.delayed??0, color:(dash?.delayed??0)>0?C.red:C.green },
          { label:'Milestones Hit', value:(dash?.milestonesHit??0)+'/'+(dash?.milestones??0), color:C.amber },
        ].map(s => (
          <div key={s.label} style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:12,
            padding:'16px 18px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
            <p style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', margin:'0 0 8px' }}>{s.label}</p>
            <p style={{ fontSize:24, fontWeight:800, color:s.color, margin:0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, borderBottom:'1.5px solid '+C.border, paddingBottom:0 }}>
        {TABS.map(t => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                display:'flex', alignItems:'center', gap:7, padding:'10px 16px',
                background:'none', border:'none', cursor:'pointer', fontSize:13, fontWeight:600,
                color: active ? C.blue : C.text3,
                borderBottom: active ? '2px solid '+C.blue : '2px solid transparent',
                marginBottom:-2, borderRadius:0,
              }}>
              <Icon size={15} weight={active?'fill':'regular'} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Chart area */}
      <div style={{ background:C.card, border:'1.5px solid '+C.border, borderRadius:16, padding:24, boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>

        {tab === 'gantt' && (
          <>
            <div style={{ marginBottom:16, display:'flex', gap:16, alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ width:16, height:10, background:'#bfdbfe', border:'1px solid #2563eb', borderRadius:2 }} />
                <span style={{ fontSize:12, color:C.text2 }}>Planned</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ width:16, height:6, background:'#059669', borderRadius:2 }} />
                <span style={{ fontSize:12, color:C.text2 }}>Actual (completed)</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ width:16, height:6, background:'#2563eb', borderRadius:2 }} />
                <span style={{ fontSize:12, color:C.text2 }}>Actual (in progress)</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ width:2, height:16, background:'#dc2626' }} />
                <span style={{ fontSize:12, color:C.text2 }}>Today</span>
              </div>
            </div>
            {regularTasks.length === 0 ? (
              <p style={{ color:C.text3, textAlign:'center', padding:40 }}>No tasks — run the seed script first</p>
            ) : (
              <ReactECharts
                option={buildGanttOption(regularTasks)}
                style={{ height: Math.max(400, regularTasks.length * 40) }}
                opts={{ renderer: 'canvas' }}
              />
            )}
          </>
        )}

        {tab === 'summary' && (
          <>
            <h3 style={{ fontSize:14, fontWeight:700, color:C.text1, margin:'0 0 16px' }}>Work Package Summary Gantt</h3>
            {workPackages.length === 0 ? (
              <p style={{ color:C.text3, textAlign:'center', padding:40 }}>No work packages — run the seed script first</p>
            ) : (
              <ReactECharts
                option={buildGanttOption(workPackages)}
                style={{ height: 320 }}
                opts={{ renderer: 'canvas' }}
              />
            )}

            {/* Work package table */}
            <div style={{ marginTop:24, borderTop:'1.5px solid '+C.border, paddingTop:16 }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr style={{ background:'#f8fafc' }}>
                    {['Code','Work Package','Planned Start','Planned End','Progress','Status'].map(h => (
                      <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700,
                        color:C.text3, textTransform:'uppercase', letterSpacing:'0.05em', borderBottom:'1.5px solid '+C.border }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {workPackages.map((t: any) => (
                    <tr key={t.id}
                      onMouseEnter={e => (e.currentTarget.style.background='#f8faff')}
                      onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
                      <td style={{ padding:'12px 14px', fontWeight:700, color:C.blue, borderBottom:'1px solid #f1f5f9' }}>{t.taskCode}</td>
                      <td style={{ padding:'12px 14px', fontWeight:600, color:C.text1, borderBottom:'1px solid #f1f5f9' }}>{t.title}</td>
                      <td style={{ padding:'12px 14px', color:C.text2, borderBottom:'1px solid #f1f5f9' }}>{fmtDate(t.plannedStart??t.planned_start)}</td>
                      <td style={{ padding:'12px 14px', color:C.text2, borderBottom:'1px solid #f1f5f9' }}>{fmtDate(t.plannedEnd??t.planned_end)}</td>
                      <td style={{ padding:'12px 14px', borderBottom:'1px solid #f1f5f9' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ flex:1, height:6, background:'#e2e8f0', borderRadius:99, overflow:'hidden' }}>
                            <div style={{ width:(t.progressPct??0)+'%', height:'100%', background:C.blue, borderRadius:99 }} />
                          </div>
                          <span style={{ fontSize:12, fontWeight:600, color:C.blue, minWidth:32 }}>{t.progressPct??0}%</span>
                        </div>
                      </td>
                      <td style={{ padding:'12px 14px', borderBottom:'1px solid #f1f5f9' }}>
                        <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20,
                          color:STATUS_COLOR[t.status]??C.text3,
                          background:(STATUS_COLOR[t.status]??'#94a3b8')+'20' }}>
                          {t.status?.replace('_',' ').toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'delay' && (
          <>
            <div style={{ marginBottom:16 }}>
              <h3 style={{ fontSize:14, fontWeight:700, color:C.text1, margin:'0 0 4px' }}>Cumulative Delay Curve</h3>
              <p style={{ fontSize:12, color:C.text3, margin:0 }}>
                Cricket-style worm chart — total EOT claim: <strong style={{ color:C.red }}>
                  {delayedTasks.reduce((s: number, t: any) => s + (t.delayDays??0), 0)} days
                </strong>
              </p>
            </div>
            {delayedTasks.length === 0 ? (
              <p style={{ color:C.text3, textAlign:'center', padding:40 }}>No delays recorded yet</p>
            ) : (
              <ReactECharts
                option={buildDelayOption()}
                style={{ height: 360 }}
                opts={{ renderer: 'canvas' }}
              />
            )}

            {/* Delay register table */}
            <div style={{ marginTop:24, borderTop:'1.5px solid '+C.border, paddingTop:16 }}>
              <h3 style={{ fontSize:13, fontWeight:700, color:C.text1, margin:'0 0 12px' }}>Delay Register</h3>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr style={{ background:'#f8fafc' }}>
                    {['Task','Category','Reason','Delay Days','EOT Eligible','Stakeholder'].map(h => (
                      <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700,
                        color:C.text3, textTransform:'uppercase', letterSpacing:'0.05em', borderBottom:'1.5px solid '+C.border }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {delayedTasks.map((t: any) => (
                    <tr key={t.id}
                      onMouseEnter={e => (e.currentTarget.style.background='#fff5f5')}
                      onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
                      <td style={{ padding:'12px 14px', fontWeight:600, color:C.text1, borderBottom:'1px solid #f1f5f9' }}>{t.title}</td>
                      <td style={{ padding:'12px 14px', borderBottom:'1px solid #f1f5f9' }}>
                        <span style={{ fontSize:11, padding:'3px 8px', borderRadius:10,
                          background: t.delayCategory==='Land'?'#fef2f2': t.delayCategory==='Statutory'?'#fffbeb':'#f1f5f9',
                          color: t.delayCategory==='Land'?C.red: t.delayCategory==='Statutory'?C.amber:C.text2,
                          fontWeight:700 }}>
                          {t.delayCategory??'—'}
                        </span>
                      </td>
                      <td style={{ padding:'12px 14px', color:C.text2, borderBottom:'1px solid #f1f5f9' }}>{t.delayReason??t.delay_reason??'—'}</td>
                      <td style={{ padding:'12px 14px', fontWeight:700, color:C.red, borderBottom:'1px solid #f1f5f9' }}>{t.delayDays??0} days</td>
                      <td style={{ padding:'12px 14px', borderBottom:'1px solid #f1f5f9' }}>
                        <span style={{ fontSize:11, fontWeight:700, color:C.green }}>✓ EOT</span>
                      </td>
                      <td style={{ padding:'12px 14px', color:C.text2, borderBottom:'1px solid #f1f5f9' }}>{t.responsibleStakeholder??'LCMA'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'milestones' && (
          <>
            <h3 style={{ fontSize:14, fontWeight:700, color:C.text1, margin:'0 0 16px' }}>Project Milestones</h3>
            {milestones.length === 0 ? (
              <p style={{ color:C.text3, textAlign:'center', padding:40 }}>No milestones — run the seed script first</p>
            ) : (
              <ReactECharts
                option={buildMilestoneOption()}
                style={{ height: 320 }}
                opts={{ renderer: 'canvas' }}
              />
            )}

            {/* Milestone cards */}
            <div style={{ marginTop:24, display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
              {milestones.map((m: any) => {
                const done    = m.status === 'completed'
                const delayed = (m.delayDays??0) > 0
                const pending = !done && !delayed
                return (
                  <div key={m.id} style={{
                    background: done ? '#f0fdf4' : delayed ? '#fef2f2' : '#f8fafc',
                    border: '1.5px solid '+(done?'#bbf7d0':delayed?'#fecaca':'#e2e8f0'),
                    borderRadius:12, padding:'16px 18px',
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                      {done   ? <CheckCircle size={18} color={C.green} weight="fill" /> :
                       delayed ? <Warning size={18} color={C.red} weight="fill" /> :
                                 <Clock size={18} color={C.text3} />}
                      <span style={{ fontSize:11, fontWeight:700,
                        color: done?C.green:delayed?C.red:C.text3 }}>
                        {done?'COMPLETED':delayed?'DELAYED':'PENDING'}
                      </span>
                    </div>
                    <p style={{ fontSize:14, fontWeight:700, color:C.text1, margin:'0 0 8px' }}>{m.title}</p>
                    <p style={{ fontSize:12, color:C.text3, margin:'0 0 4px' }}>
                      Planned: {fmtDate(m.plannedEnd??m.planned_end)}
                    </p>
                    {(m.actualEnd??m.actual_end) && (
                      <p style={{ fontSize:12, color:done?C.green:C.red, margin:'0 0 4px' }}>
                        Actual: {fmtDate(m.actualEnd??m.actual_end)}
                      </p>
                    )}
                    {delayed && (
                      <p style={{ fontSize:11, color:C.red, margin:0, fontWeight:600 }}>
                        +{m.delayDays} days delay
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
`

fs.writeFileSync(FILE, content)
console.log('✅  WbsPage.tsx written with Apache ECharts')
console.log('  4 tabs: Gantt · Work Packages · Delay Curve · Milestones')
