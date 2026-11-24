import { useEffect, useMemo, useState } from 'react'
import type { GraphNode, GraphRelationship } from '../../types'

interface KnowledgeGraphCanvasProps {
  nodes: GraphNode[]
  relationships: GraphRelationship[]
  onDeleteNode: (node: GraphNode) => Promise<void>
  onDeleteRelationship: (relationship: GraphRelationship) => Promise<void>
  onUpdateNode: (node: GraphNode, label: string) => Promise<void>
  onUpdateRelationship: (relationship: GraphRelationship, type: string) => Promise<void>
  onGetGraphPaths: (id: string) => Promise<{ node: GraphNode; paths: Array<{ nodes: string[]; relationships: string[] }> }>
}

const typeColors: Record<string, { fill: string; stroke: string }> = {
  Customer: { fill: '#e7f5f1', stroke: '#16845b' },
  Order: { fill: '#edf3ff', stroke: '#4f75c8' },
  Refund: { fill: '#fff2df', stroke: '#bd6d21' },
  SupportProcedure: { fill: '#f2edff', stroke: '#7556b8' },
  KnowledgeDocument: { fill: '#eaf6fa', stroke: '#20859b' },
  SupportIssue: { fill: '#fff0f2', stroke: '#bd5c6d' },
  Payment: { fill: '#eef8e9', stroke: '#5b9450' },
  SupportAgent: { fill: '#f4f0e8', stroke: '#987744' },
}

function labelFor(node: GraphNode) {
  return String(node.properties.title ?? node.properties.name ?? node.id.split(':').pop() ?? node.id)
}

function shortLabel(value: string, max = 23) {
  return value.length > max ? `${value.slice(0, max - 1)}...` : value
}

export function KnowledgeGraphCanvas({ nodes, relationships, onDeleteNode, onDeleteRelationship, onUpdateNode, onUpdateRelationship, onGetGraphPaths }: KnowledgeGraphCanvasProps) {
  const [selectedId, setSelectedId] = useState<string>()
  const [selectedRelationship, setSelectedRelationship] = useState<GraphRelationship>()
  const [editedLabel, setEditedLabel] = useState('')
  const [editedRelationshipType, setEditedRelationshipType] = useState('')
  const [paths, setPaths] = useState<Array<{ nodes: string[]; relationships: string[] }>>([])
  const selectNode = (node: GraphNode) => {
    setSelectedId(node.id)
    setEditedLabel(labelFor(node))
    setPaths([])
  }
  useEffect(() => {
    if (!selectedId) return
    let active = true
    void onGetGraphPaths(selectedId).then((result) => { if (active) setPaths(result.paths) }).catch(() => { if (active) setPaths([]) })
    return () => { active = false }
  }, [onGetGraphPaths, selectedId])

  const labelById = new Map(nodes.map((node) => [node.id, labelFor(node)]))
  const positions = useMemo(() => {
    const byId = new Map<string, { x: number; y: number }>()
    const preferred: Record<string, { x: number; y: number }> = {
      Customer: { x: 110, y: 185 }, Order: { x: 285, y: 90 }, Refund: { x: 300, y: 280 },
      SupportIssue: { x: 495, y: 155 }, Payment: { x: 500, y: 305 }, SupportProcedure: { x: 685, y: 80 },
      SupportAgent: { x: 700, y: 275 }, KnowledgeDocument: { x: 875, y: 165 },
    }
    const fallbackCenter = { x: 470, y: 185 }
    nodes.forEach((node, index) => {
      byId.set(node.id, preferred[node.type] ?? { x: fallbackCenter.x + (index % 3) * 160, y: fallbackCenter.y + Math.floor(index / 3) * 110 })
    })
    return byId
  }, [nodes])

  const selected = nodes.find((node) => node.id === selectedId)
  const connectedIds = new Set(
    relationships.flatMap((relationship) => relationship.sourceId === selectedId || relationship.targetId === selectedId
      ? [relationship.sourceId, relationship.targetId]
      : []),
  )

  return (
    <div className="knowledge-graph-layout">
      <div className="graph-canvas" aria-label="Interactive knowledge graph">
        <svg viewBox="0 0 980 380" role="img">
          <defs>
            <marker id="graph-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <path d="M0,0 L7,3.5 L0,7 z" fill="#8b9b98" />
            </marker>
          </defs>
          {relationships.map((relationship) => {
            const source = positions.get(relationship.sourceId)
            const target = positions.get(relationship.targetId)
            if (!source || !target) return null
            const active = !selectedId || relationship.sourceId === selectedId || relationship.targetId === selectedId
            const midpointX = (source.x + target.x) / 2
            const midpointY = (source.y + target.y) / 2
            const curve = source.y === target.y ? 0 : (source.x < target.x ? -18 : 18)
            const path = `M ${source.x} ${source.y} Q ${midpointX} ${midpointY + curve} ${target.x} ${target.y}`
            return (
              <g key={`${relationship.sourceId}-${relationship.type}-${relationship.targetId}`} className={active ? 'graph-edge active' : 'graph-edge muted'}>
                <path d={path} markerEnd="url(#graph-arrow)" onClick={() => { setSelectedRelationship(relationship); setEditedRelationshipType(relationship.type) }} />
                <text x={midpointX} y={midpointY + curve / 2 - 8} textAnchor="middle">{relationship.type}</text>
              </g>
            )
          })}
          {nodes.map((node) => {
            const position = positions.get(node.id)
            if (!position) return null
            const colors = typeColors[node.type] ?? { fill: '#f3f6f5', stroke: '#71817d' }
            const active = !selectedId || selectedId === node.id || connectedIds.has(node.id)
            return (
              <g key={node.id} className={`graph-node ${active ? 'active' : 'muted'}`} transform={`translate(${position.x - 78} ${position.y - 38})`} onClick={() => selectNode(node)} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') selectNode(node) }}>
                <rect width="156" height="76" rx="10" fill={colors.fill} stroke={selectedId === node.id ? '#0d8176' : colors.stroke} strokeWidth={selectedId === node.id ? 3 : 1.5} />
                <text className="graph-node-type" x="12" y="19">{node.type}</text>
                <text className="graph-node-label" x="12" y="42">{shortLabel(labelFor(node))}</text>
                <text className="graph-node-id" x="12" y="60">{shortLabel(node.id, 25)}</text>
              </g>
            )
          })}
        </svg>
        <p className="graph-canvas-hint">Click a node to highlight its connected evidence path.</p>
      </div>
      <aside className="graph-node-detail">
        {selected ? (
          <>
            <span className="graph-detail-kicker">Selected node</span>
            <h3>{labelFor(selected)}</h3>
            <p>{selected.type}</p>
            <label className="graph-edit-label"><span>Display label</span><input value={editedLabel} onChange={(event) => setEditedLabel(event.target.value)} /></label>
            <dl>{Object.entries(selected.properties).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{String(value)}</dd></div>)}</dl>
            <button className="secondary-button graph-save-button" disabled={!editedLabel.trim()} onClick={() => void onUpdateNode(selected, editedLabel.trim())}>Save changes</button>
            <button className="danger-button graph-delete-button" onClick={() => { if (window.confirm(`Delete ${labelFor(selected)} and its connected relationships?`)) void onDeleteNode(selected).then(() => setSelectedId(undefined)) }}>Delete node</button>
            <div className="graph-paths"><span className="graph-detail-kicker">Reasoning paths</span>{paths.length ? paths.slice(0, 6).map((path, index) => <div className="graph-path" key={`${path.nodes.join('-')}-${index}`}>{path.nodes.map((nodeId, nodeIndex) => <span key={nodeId}>{labelById.get(nodeId) ?? nodeId}{nodeIndex < path.relationships.length ? ` --${path.relationships[nodeIndex]}--> ` : ''}</span>)}</div>) : <p>No connected reasoning paths found.</p>}</div>
          </>
        ) : (
          <><span className="graph-detail-kicker">Ontology view</span><h3>Connected evidence</h3><p>Select any node to inspect its relationships and source metadata.</p></>
        )}
        {selectedRelationship && <div className="graph-selected-link"><span className="graph-detail-kicker">Selected relationship</span><label className="graph-edit-label"><span>Relationship type</span><input value={editedRelationshipType} onChange={(event) => setEditedRelationshipType(event.target.value)} /></label><small>{selectedRelationship.sourceId} → {selectedRelationship.targetId}</small><button className="secondary-button graph-save-button" disabled={!editedRelationshipType.trim()} onClick={() => void onUpdateRelationship(selectedRelationship, editedRelationshipType.trim().toUpperCase())}>Save link changes</button><button className="danger-button graph-delete-button" onClick={() => { if (window.confirm(`Delete the ${selectedRelationship.type} relationship?`)) void onDeleteRelationship(selectedRelationship).then(() => setSelectedRelationship(undefined)) }}>Delete link</button></div>}
      </aside>
    </div>
  )
}
