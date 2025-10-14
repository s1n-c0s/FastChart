import { useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  Cell,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type Datum = {
  id: string
  label: string
  value: number
  color: string
}

function generateId() {
  return Math.random().toString(36).slice(2, 9)
}

export default function DataVisualizer() {
  const presetColors = [
    '#3b82f6', // blue-500
    '#22c55e', // green-500
    '#ef4444', // red-500
    '#f59e0b', // amber-500
    '#a855f7', // purple-500
    '#06b6d4', // cyan-500
  ]

  const [data, setData] = useState<Datum[]>([
    { id: generateId(), label: 'A', value: 12, color: presetColors[0] },
    { id: generateId(), label: 'B', value: 30, color: presetColors[1] },
    { id: generateId(), label: 'C', value: 18, color: presetColors[2] },
  ])
  const [stackedHorizontal, setStackedHorizontal] = useState(true)

  const barCardRef = useRef<HTMLDivElement>(null)
  const pieCardRef = useRef<HTMLDivElement>(null)
  const stackedCardRef = useRef<HTMLDivElement>(null)
  const lineCardRef = useRef<HTMLDivElement>(null)

  async function copyChartSvg(containerEl: HTMLElement | null) {
    try {
      const svg = containerEl?.querySelector('svg') as SVGSVGElement | null
      if (!svg) return
      const clone = svg.cloneNode(true) as SVGSVGElement
      if (!clone.getAttribute('xmlns')) {
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
      }
      const xml = new XMLSerializer().serializeToString(clone)
      await navigator.clipboard.writeText(xml)
    } catch {
      // ignore copy failures
    }
  }

  const total = useMemo(() => data.reduce((sum, d) => sum + (isFinite(d.value) ? d.value : 0), 0), [data])

  const stackedData = useMemo(() => {
    const obj: Record<string, number | string> = { name: 'All' }
    for (const d of data) {
      obj[d.id] = Math.max(0, isFinite(d.value) ? d.value : 0)
    }
    return [obj]
  }, [data])

  const idToLabel = useMemo(() => {
    const m = new Map<string, string>()
    for (const d of data) m.set(d.id, d.label)
    return m
  }, [data])

  const labelToId = useMemo(() => {
    const m = new Map<string, string>()
    for (const d of data) m.set(d.label, d.id)
    return m
  }, [data])

  const idToValue = useMemo(() => {
    const m = new Map<string, number>()
    for (const d of data) m.set(d.id, Math.max(0, isFinite(d.value) ? d.value : 0))
    return m
  }, [data])

  const stackedSum = useMemo(() => {
    return data.reduce((s, d) => s + Math.max(0, isFinite(d.value) ? d.value : 0), 0)
  }, [data])

  function StackedTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name?: string; value: number } & Record<string, unknown>> }) {
    if (!active || !payload || payload.length === 0) return null
    // Recharts passes one entry per visible Bar
    return (
      <div className="rounded-md border bg-background p-2 text-xs shadow-sm">
        <div className="font-medium mb-1">All</div>
        <div className="space-y-0.5">
          {payload.map((p, idx) => {
            const maybeDataKey = (p as unknown as { dataKey?: string }).dataKey
            const name = p.name ?? ''
            const id = maybeDataKey ?? labelToId.get(name) ?? name
            const label = idToLabel.get(id) ?? id
            const raw = idToValue.get(id) ?? 0
            const percent = stackedSum > 0 ? (raw / stackedSum) * 100 : 0
            return (
              <div key={idx} className="flex items-center justify-between gap-4">
                <span>{label}</span>
                <span>{raw} ({percent.toFixed(1)}%)</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  function updateLabel(id: string, label: string) {
    setData(prev => prev.map(d => (d.id === id ? { ...d, label } : d)))
  }

  function updateValue(id: string, next: string) {
    const parsed = Number(next)
    setData(prev => prev.map(d => (d.id === id ? { ...d, value: isFinite(parsed) ? parsed : 0 } : d)))
  }

  function updateColor(id: string, color: string) {
    setData(prev => prev.map(d => (d.id === id ? { ...d, color } : d)))
  }

  function addRow() {
    const nextIndex = data.length + 1
    setData(prev => [
      ...prev,
      { id: generateId(), label: `Item ${nextIndex}`, value: 0, color: presetColors[nextIndex % presetColors.length] },
    ])
  }

  function removeRow(id: string) {
    setData(prev => (prev.length > 1 ? prev.filter(d => d.id !== id) : prev))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setData(prev => {
        const oldIndex = prev.findIndex(d => d.id === active.id)
        const newIndex = prev.findIndex(d => d.id === over.id)
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function SortableRow({ row }: { row: Datum }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
    } = useSortable({ id: row.id })

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    }

    return (
      <tr
        ref={setNodeRef}
        style={style}
        className="border-b last:border-0"
        {...attributes}
      >
        <td className="py-2 pr-2">
          <div className="flex items-center gap-2">
            <button
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
              aria-label={`Drag to reorder ${row.label}`}
            >
              ⋮⋮
            </button>
            <input
              className="w-full rounded-md border bg-background px-2 py-1"
              aria-label={`Label for row ${row.label}`}
              placeholder="Label"
              value={row.label}
              onChange={e => updateLabel(row.id, e.target.value)}
            />
          </div>
        </td>
        <td className="py-2 pr-2">
          <input
            className="w-full rounded-md border bg-background px-2 py-1"
            type="number"
            aria-label={`Value for ${row.label}`}
            placeholder="0"
            value={Number.isFinite(row.value) ? row.value : 0}
            onChange={e => updateValue(row.id, e.target.value)}
          />
        </td>
        <td className="py-2 pr-2">
          <select
            className="w-full rounded-md border bg-background px-2 py-1"
            aria-label={`Color for ${row.label}`}
            value={row.color}
            onChange={e => updateColor(row.id, e.target.value)}
          >
            {presetColors.map(c => (
              <option key={c} value={c} style={{ color: c }}>
                {c}
              </option>
            ))}
          </select>
        </td>
        <td className="py-2 pr-2">
          <Button variant="ghost" onClick={() => removeRow(row.id)}>Remove</Button>
        </td>
      </tr>
    )
  }

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Data Visualizer</h1>
        <p className="text-sm text-muted-foreground">Edit values to update charts live.</p>
      </div>

      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium">Data Table</h2>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={addRow}>Add Row</Button>
            <div className="text-sm text-muted-foreground">Total: {total}</div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-2 w-[160px]">Label</th>
                <th className="text-left py-2 pr-2 w-[160px]">Value</th>
                <th className="text-left py-2 pr-2 w-[160px]">Color</th>
                <th className="text-left py-2 pr-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={data.map(d => d.id)} strategy={verticalListSortingStrategy}>
                  {data.map(row => (
                    <SortableRow key={row.id} row={row} />
                  ))}
                </SortableContext>
              </DndContext>
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div ref={barCardRef} className="rounded-lg border p-4 h-[380px]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-medium">Bar Chart</h3>
            <Button size="sm" variant="secondary" onClick={() => copyChartSvg(barCardRef.current)} aria-label="Copy Bar Chart as SVG">Copy SVG</Button>
          </div>
          <ResponsiveContainer width="100%" height="95%">
            <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {data.map((entry) => (
                  <Cell key={entry.id} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div ref={pieCardRef} className="rounded-lg border p-4 h-[380px]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-medium">Pie Chart</h3>
            <Button size="sm" variant="secondary" onClick={() => copyChartSvg(pieCardRef.current)} aria-label="Copy Pie Chart as SVG">Copy SVG</Button>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip />
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                cornerRadius={6}
              >
                {data.map((entry) => (
                  <Cell key={entry.id} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div ref={stackedCardRef} className="rounded-lg border p-4 h-[320px]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-medium">100% Stacked Chart</h3>
          <Button
            variant="secondary"
            aria-label="Toggle stacked chart orientation"
            onClick={() => setStackedHorizontal(v => !v)}
          >
            {stackedHorizontal ? 'Vertical' : 'Horizontal'}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => copyChartSvg(stackedCardRef.current)} aria-label="Copy Stacked Chart as SVG">Copy SVG</Button>
        </div>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart
            data={stackedData}
            stackOffset="expand"
            margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
            layout={stackedHorizontal ? 'vertical' : 'horizontal'}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            {stackedHorizontal ? (
              <>
                <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} />
                <XAxis type="number" tickFormatter={(v) => `${Math.round((v as number) * 100)}%`} tickLine={false} axisLine={false} />
              </>
            ) : (
              <>
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(v) => `${Math.round((v as number) * 100)}%`} tickLine={false} axisLine={false} />
              </>
            )}
            <Tooltip content={<StackedTooltip />} />
            {data.map((d) => (
              <Bar key={d.id} dataKey={d.id} stackId="one" name={d.label}>
                <Cell fill={d.color} />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div ref={lineCardRef} className="rounded-lg border p-4 h-[320px]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-medium">Line Chart</h3>
          <Button size="sm" variant="secondary" onClick={() => copyChartSvg(lineCardRef.current)} aria-label="Copy Line Chart as SVG">Copy SVG</Button>
        </div>
        <ResponsiveContainer width="100%" height="95%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="oklch(0.488 0.243 264.376)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}


