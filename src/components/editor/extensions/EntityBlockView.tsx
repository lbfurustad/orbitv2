import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { EditorState } from '@tiptap/pm/state'
import type { EditorView, Decoration, DecorationSource } from '@tiptap/pm/view'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

/**
 * EntityBlockView extension
 *
 * Uses a ProseMirror plugin with custom nodeViews to wrap paragraph and heading
 * nodes that have an entityType attribute in an EntityBlock wrapper.
 *
 * This approach avoids overriding Tiptap's own NodeView system for paragraphs
 * and headings, and instead decorates them at the ProseMirror level.
 */

const ENTITY_NODE_TYPES = ['paragraph', 'heading']

export const entityBlockViewKey = new PluginKey('entityBlockView')

/**
 * Custom NodeView that wraps entity blocks with interactive UI.
 * For non-entity blocks, renders the default DOM.
 */
class EntityNodeView {
  dom: HTMLElement
  contentDOM: HTMLElement
  node: ProseMirrorNode
  view: EditorView
  getPos: () => number | undefined

  // Entity wrapper elements
  private wrapper: HTMLElement | null = null
  private checkboxBtn: HTMLElement | null = null
  private expandBtn: HTMLElement | null = null
  private propertiesPanel: HTMLElement | null = null
  private expanded = false
  private pointerToggleHandledAt = 0

  constructor(
    node: ProseMirrorNode,
    view: EditorView,
    getPos: () => number | undefined,
  ) {
    this.node = node
    this.view = view
    this.getPos = getPos

    const entityType = node.attrs.entityType

    if (entityType) {
      this.dom = document.createElement('div')
      this.dom.classList.add('entity-block', `entity-block--${entityType}`)
      if (entityType === 'task' && node.attrs.taskDone) {
        this.dom.classList.add('entity-block--done')
      }

      // Main row
      const mainRow = document.createElement('div')
      mainRow.classList.add('entity-block__main')

      // Left icon/checkbox
      if (entityType === 'task') {
        this.checkboxBtn = document.createElement('button')
        this.checkboxBtn.classList.add('entity-block__checkbox')
        this.checkboxBtn.contentEditable = 'false'
        this.checkboxBtn.setAttribute('type', 'button')
        this.checkboxBtn.tabIndex = -1
        this.updateCheckboxIcon()
        this.checkboxBtn.addEventListener('pointerdown', (e) => {
          e.preventDefault()
          e.stopPropagation()
          e.stopImmediatePropagation()
          this.pointerToggleHandledAt = Date.now()
          this.toggleTaskDone()
        })
        this.checkboxBtn.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()
          e.stopImmediatePropagation()
          if (Date.now() - this.pointerToggleHandledAt < 250) {
            return
          }
          this.toggleTaskDone()
        })
        mainRow.appendChild(this.checkboxBtn)
      } else if (entityType === 'meeting') {
        const icon = document.createElement('span')
        icon.classList.add('entity-block__icon', 'entity-block__icon--meeting')
        icon.contentEditable = 'false'
        icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 256" fill="currentColor"><path d="M164.44,105.34l-48-32A8,8,0,0,0,104,80v64a8,8,0,0,0,12.44,6.66l48-32a8,8,0,0,0,0-13.32ZM120,129.05V95l25.58,17ZM216,40H40A16,16,0,0,0,24,56V168a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,128H40V56H216V168Zm16,40a8,8,0,0,1-8,8H32a8,8,0,0,1,0-16H224A8,8,0,0,1,232,208Z"/></svg>`
        mainRow.appendChild(icon)
      } else if (entityType === 'project') {
        const icon = document.createElement('span')
        icon.classList.add('entity-block__icon', 'entity-block__icon--project')
        icon.contentEditable = 'false'
        icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 256" fill="currentColor"><path d="M216,72H131.31L104,44.69A15.86,15.86,0,0,0,92.69,40H40A16,16,0,0,0,24,56V200.62A15.4,15.4,0,0,0,39.38,216H216.89A15.13,15.13,0,0,0,232,200.89V88A16,16,0,0,0,216,72ZM40,56H92.69l16,16H40ZM216,200H40V88H216Z"/></svg>`
        mainRow.appendChild(icon)
      }

      // Content area
      const tag = node.type.name === 'heading' ? `h${node.attrs.level || 1}` : 'p'
      this.contentDOM = document.createElement(tag)
      this.contentDOM.classList.add('entity-block__content')
      if (entityType === 'task' && node.attrs.taskDone) {
        this.contentDOM.classList.add('entity-text--done')
      }
      mainRow.appendChild(this.contentDOM)

      // Expand button
      this.expandBtn = document.createElement('button')
      this.expandBtn.classList.add('entity-block__expand')
      this.expandBtn.contentEditable = 'false'
      this.expandBtn.setAttribute('type', 'button')
      this.expandBtn.tabIndex = -1
      this.updateExpandIcon()
      // Use pointerdown (like checkbox) to ensure ProseMirror doesn't swallow the event
      this.expandBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        this.pointerToggleHandledAt = Date.now()
        this.toggleExpand()
      })
      this.expandBtn.addEventListener('mousedown', (e) => {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
      })
      this.expandBtn.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        // Only toggle if pointerdown didn't already handle it
        if (Date.now() - this.pointerToggleHandledAt < 250) return
        this.toggleExpand()
      })
      mainRow.appendChild(this.expandBtn)

      this.dom.appendChild(mainRow)

      // Properties panel (initially hidden)
      this.propertiesPanel = document.createElement('div')
      this.propertiesPanel.classList.add('entity-properties')
      this.propertiesPanel.contentEditable = 'false'
      this.propertiesPanel.style.display = 'none'
      this.buildPropertiesPanel(entityType, node.attrs)
      this.dom.appendChild(this.propertiesPanel)
    } else {
      // Non-entity: standard rendering
      const tag = node.type.name === 'heading' ? `h${node.attrs.level || 1}` : 'p'
      this.dom = document.createElement(tag)
      this.contentDOM = this.dom

      // Copy over block ID
      if (node.attrs.blockId) {
        this.dom.setAttribute('data-block-id', node.attrs.blockId)
      }
    }
  }

  update(node: ProseMirrorNode): boolean {
    // Only accept updates for same node type
    if (node.type.name !== this.node.type.name) return false

    const oldEntityType = this.node.attrs.entityType
    const newEntityType = node.attrs.entityType

    // If entity type changed, force rebuild
    if (oldEntityType !== newEntityType) return false

    this.node = node

    if (newEntityType === 'task') {
      // Update done state
      if (node.attrs.taskDone) {
        this.dom.classList.add('entity-block--done')
        this.contentDOM.classList.add('entity-text--done')
      } else {
        this.dom.classList.remove('entity-block--done')
        this.contentDOM.classList.remove('entity-text--done')
      }
      this.updateCheckboxIcon()
      this.buildPropertiesPanel('task', node.attrs)
      // Preserve expanded state after properties panel rebuild
      if (this.propertiesPanel) {
        this.propertiesPanel.style.display = this.expanded ? 'flex' : 'none'
      }
    } else if (newEntityType === 'meeting' || newEntityType === 'project') {
      this.buildPropertiesPanel(newEntityType, node.attrs)
      if (this.propertiesPanel) {
        this.propertiesPanel.style.display = this.expanded ? 'flex' : 'none'
      }
    }

    return true
  }

  private toggleTaskDone() {
    const pos = this.getPos()
    if (pos === undefined) return
    const { tr } = this.view.state
    const node = tr.doc.nodeAt(pos)
    if (!node) return

    tr.setNodeMarkup(pos, undefined, {
      ...node.attrs,
      taskDone: !node.attrs.taskDone,
    })
    this.view.dispatch(tr)

    // Persist to backend
    if (node.attrs.blockId) {
      fetch(`/api/blocks/${node.attrs.blockId}/properties`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskDone: !node.attrs.taskDone }),
      }).catch(console.error)
    }
  }

  private toggleExpand() {
    this.expanded = !this.expanded
    this.updateExpandIcon()
    if (this.propertiesPanel) {
      this.propertiesPanel.style.display = this.expanded ? 'flex' : 'none'
    }
    // Keep expand button visible when expanded
    if (this.expandBtn) {
      if (this.expanded) {
        this.expandBtn.classList.add('entity-block__expand--active')
      } else {
        this.expandBtn.classList.remove('entity-block__expand--active')
      }
    }
  }

  private updateCheckboxIcon() {
    if (!this.checkboxBtn) return
    const done = this.node.attrs.taskDone
    const priority = this.node.attrs.taskPriority

    const colorClass = done
      ? 'entity-checkbox--done'
      : priority === 1
        ? 'entity-checkbox--p1'
        : priority === 2
          ? 'entity-checkbox--p2'
          : priority === 3
            ? 'entity-checkbox--p3'
            : 'entity-checkbox--default'

    this.checkboxBtn.className = `entity-block__checkbox ${colorClass}`

    if (done) {
      this.checkboxBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 256" fill="currentColor"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm45.66,85.66-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32Z"/></svg>`
    } else {
      this.checkboxBtn.innerHTML = priority
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 256" fill="none" stroke="currentColor" stroke-width="20"><circle cx="128" cy="128" r="96"/></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 256" fill="none" stroke="currentColor" stroke-width="16"><circle cx="128" cy="128" r="96"/></svg>`
    }
  }

  private updateExpandIcon() {
    if (!this.expandBtn) return
    this.expandBtn.innerHTML = this.expanded
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 256 256" fill="currentColor"><path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z"/></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 256 256" fill="currentColor"><path d="M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z"/></svg>`
  }

  private buildPropertiesPanel(entityType: string, attrs: Record<string, unknown>) {
    if (!this.propertiesPanel) return
    this.propertiesPanel.innerHTML = ''

    if (entityType === 'task') {
      // Priority pill
      const priorityBtn = document.createElement('button')
      priorityBtn.classList.add('entity-prop-pill')
      const priority = attrs.taskPriority as number | null
      if (priority) {
        priorityBtn.classList.add(`entity-prop-pill--p${priority}`)
      }
      priorityBtn.innerHTML = `<span class="entity-prop-pill__label">${priority ? `P${priority}` : 'Prioritet'}</span>`
      priorityBtn.addEventListener('mousedown', (e) => {
        e.preventDefault()
        e.stopPropagation()
        this.cyclePriority()
      })
      this.propertiesPanel.appendChild(priorityBtn)

      // Due date pill
      const dateBtn = document.createElement('button')
      dateBtn.classList.add('entity-prop-pill')
      const dueDate = attrs.taskDueDate as string | null
      if (dueDate) {
        const overdue = new Date(dueDate + 'T23:59:59') < new Date() && !attrs.taskDone
        dateBtn.classList.add(overdue ? 'entity-prop-pill--overdue' : 'entity-prop-pill--date')
      }
      dateBtn.innerHTML = `<span class="entity-prop-pill__label">${dueDate ? this.formatDate(dueDate) : 'Frist'}</span>`
      dateBtn.addEventListener('mousedown', (e) => {
        e.preventDefault()
        e.stopPropagation()
        this.promptDate()
      })
      this.propertiesPanel.appendChild(dateBtn)
    } else if (entityType === 'meeting') {
      const dateSpan = document.createElement('span')
      dateSpan.classList.add('entity-prop-pill')
      dateSpan.textContent = (attrs.meetingDate as string) || 'Ingen dato'
      this.propertiesPanel.appendChild(dateSpan)
    } else if (entityType === 'project') {
      const statusBtn = document.createElement('button')
      statusBtn.classList.add('entity-prop-pill')
      const status = (attrs.projectStatus as string) || 'active'
      statusBtn.classList.add(`entity-prop-pill--status-${status}`)
      statusBtn.textContent = status.charAt(0).toUpperCase() + status.slice(1)
      statusBtn.addEventListener('mousedown', (e) => {
        e.preventDefault()
        e.stopPropagation()
        this.cycleStatus()
      })
      this.propertiesPanel.appendChild(statusBtn)
    }
  }

  private cyclePriority() {
    const pos = this.getPos()
    if (pos === undefined) return
    const { tr } = this.view.state
    const node = tr.doc.nodeAt(pos)
    if (!node) return

    const current = node.attrs.taskPriority as number | null
    // Cycle: null -> 1 -> 2 -> 3 -> null
    const next = current === null ? 1 : current === 3 ? null : current + 1

    tr.setNodeMarkup(pos, undefined, { ...node.attrs, taskPriority: next })
    this.view.dispatch(tr)

    if (node.attrs.blockId) {
      fetch(`/api/blocks/${node.attrs.blockId}/properties`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskPriority: next }),
      }).catch(console.error)
    }
  }

  private promptDate() {
    const pos = this.getPos()
    if (pos === undefined) return
    const { tr } = this.view.state
    const node = tr.doc.nodeAt(pos)
    if (!node) return

    // Create a temporary date input
    const input = document.createElement('input')
    input.type = 'date'
    input.value = (node.attrs.taskDueDate as string) || ''
    input.style.position = 'absolute'
    input.style.opacity = '0'
    input.style.pointerEvents = 'none'
    document.body.appendChild(input)

    input.addEventListener('change', () => {
      const newDate = input.value || null
      const pos2 = this.getPos()
      if (pos2 === undefined) return
      const { tr: tr2 } = this.view.state
      const node2 = tr2.doc.nodeAt(pos2)
      if (!node2) return

      tr2.setNodeMarkup(pos2, undefined, { ...node2.attrs, taskDueDate: newDate })
      this.view.dispatch(tr2)

      if (node2.attrs.blockId) {
        fetch(`/api/blocks/${node2.attrs.blockId}/properties`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskDueDate: newDate }),
        }).catch(console.error)
      }

      document.body.removeChild(input)
    })

    input.addEventListener('blur', () => {
      if (document.body.contains(input)) {
        document.body.removeChild(input)
      }
    })

    input.showPicker?.()
    input.focus()
  }

  private cycleStatus() {
    const pos = this.getPos()
    if (pos === undefined) return
    const { tr } = this.view.state
    const node = tr.doc.nodeAt(pos)
    if (!node) return

    const statuses = ['active', 'someday', 'done']
    const current = (node.attrs.projectStatus as string) || 'active'
    const idx = statuses.indexOf(current)
    const next = statuses[(idx + 1) % statuses.length]

    tr.setNodeMarkup(pos, undefined, { ...node.attrs, projectStatus: next })
    this.view.dispatch(tr)
  }

  private formatDate(dateStr: string): string {
    const d = new Date(dateStr + 'T12:00:00')
    const now = new Date()
    // Compare dates only (strip time) to get correct day diff
    const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const nDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const diff = Math.round((dDate.getTime() - nDate.getTime()) / 86400000)
    if (diff === 0) return 'I dag'
    if (diff === 1) return 'I morgen'
    if (diff === -1) return 'I går'
    if (diff > 1 && diff < 7) return d.toLocaleDateString('nb-NO', { weekday: 'short' })
    return d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })
  }

  destroy() {
    // Cleanup if needed
  }

  stopEvent(event: Event): boolean {
    const target = event.target as HTMLElement | null
    if (!target) return false
    // Check if target is inside a button, input, select, or the properties panel
    return Boolean(
      target.closest('button, input, select') ||
      target.closest('.entity-properties') ||
      target.closest('.entity-block__expand')
    )
  }
}

export const EntityBlockView = Extension.create({
  name: 'entityBlockView',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: entityBlockViewKey,
        props: {
          nodeViews: {
            paragraph: (node: ProseMirrorNode, view: EditorView, getPos: () => number | undefined) => {
              return new EntityNodeView(node, view, getPos)
            },
            heading: (node: ProseMirrorNode, view: EditorView, getPos: () => number | undefined) => {
              return new EntityNodeView(node, view, getPos)
            },
          },
        },
      }),
    ]
  },
})
