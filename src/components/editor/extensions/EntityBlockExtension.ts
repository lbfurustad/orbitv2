import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

/**
 * EntityBlockExtension
 *
 * Adds entity-related attributes (entityType, taskDone, taskPriority, taskDueDate, taskProjectId)
 * to paragraph and heading nodes. When a TagBadge with a known entity type (task, meeting, project)
 * is inserted into a block, this extension's plugin auto-detects it and sets the entityType attribute.
 */

const ENTITY_BLOCK_TYPES = ['paragraph', 'heading']

const ENTITY_TAG_NAMES = ['task', 'meeting', 'project']

export const entityBlockPluginKey = new PluginKey('entityBlock')

export const EntityBlockExtension = Extension.create({
  name: 'entityBlock',

  addGlobalAttributes() {
    return [
      {
        types: ENTITY_BLOCK_TYPES,
        attributes: {
          entityType: {
            default: null,
            parseHTML: (element: HTMLElement) => element.getAttribute('data-entity-type'),
            renderHTML: (attributes: Record<string, unknown>) => {
              if (!attributes.entityType) return {}
              return { 'data-entity-type': attributes.entityType }
            },
          },
          taskDone: {
            default: false,
            parseHTML: (element: HTMLElement) => element.getAttribute('data-task-done') === 'true',
            renderHTML: (attributes: Record<string, unknown>) => {
              if (!attributes.entityType || attributes.entityType !== 'task') return {}
              return { 'data-task-done': String(attributes.taskDone) }
            },
          },
          taskPriority: {
            default: null,
            parseHTML: (element: HTMLElement) => {
              const val = element.getAttribute('data-task-priority')
              return val ? parseInt(val, 10) : null
            },
            renderHTML: (attributes: Record<string, unknown>) => {
              if (attributes.taskPriority == null) return {}
              return { 'data-task-priority': String(attributes.taskPriority) }
            },
          },
          taskDueDate: {
            default: null,
            parseHTML: (element: HTMLElement) => element.getAttribute('data-task-due-date'),
            renderHTML: (attributes: Record<string, unknown>) => {
              if (!attributes.taskDueDate) return {}
              return { 'data-task-due-date': attributes.taskDueDate as string }
            },
          },
          taskProjectId: {
            default: null,
            parseHTML: (element: HTMLElement) => element.getAttribute('data-task-project-id'),
            renderHTML: (attributes: Record<string, unknown>) => {
              if (!attributes.taskProjectId) return {}
              return { 'data-task-project-id': attributes.taskProjectId as string }
            },
          },
          meetingDate: {
            default: null,
            parseHTML: (element: HTMLElement) => element.getAttribute('data-meeting-date'),
            renderHTML: (attributes: Record<string, unknown>) => {
              if (!attributes.meetingDate) return {}
              return { 'data-meeting-date': attributes.meetingDate as string }
            },
          },
          projectStatus: {
            default: null,
            parseHTML: (element: HTMLElement) => element.getAttribute('data-project-status'),
            renderHTML: (attributes: Record<string, unknown>) => {
              if (!attributes.projectStatus) return {}
              return { 'data-project-status': attributes.projectStatus as string }
            },
          },
        },
      },
    ]
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: entityBlockPluginKey,
        appendTransaction: (_transactions, _oldState, newState) => {
          const { tr } = newState
          let modified = false

          newState.doc.descendants((node, pos) => {
            if (!ENTITY_BLOCK_TYPES.includes(node.type.name)) return

            // Scan children for tagBadge nodes
            let foundEntityType: string | null = null
            node.forEach((child) => {
              if (child.type.name === 'tagBadge') {
                const tagName = (child.attrs.tagName || '').toLowerCase()
                if (ENTITY_TAG_NAMES.includes(tagName)) {
                  foundEntityType = tagName
                }
              }
            })

            const currentEntityType = node.attrs.entityType || null

            if (foundEntityType && foundEntityType !== currentEntityType) {
              // Set entity type + defaults for the entity
              const newAttrs: Record<string, unknown> = {
                ...node.attrs,
                entityType: foundEntityType,
              }
              if (foundEntityType === 'task') {
                // Preserve existing task attrs if they exist, otherwise defaults
                if (currentEntityType !== 'task') {
                  newAttrs.taskDone = false
                  newAttrs.taskPriority = null
                  newAttrs.taskDueDate = null
                  newAttrs.taskProjectId = null
                }
              }
              tr.setNodeMarkup(pos, undefined, newAttrs)
              modified = true
            } else if (!foundEntityType && currentEntityType) {
              // TagBadge removed — clear entity attributes
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                entityType: null,
                taskDone: false,
                taskPriority: null,
                taskDueDate: null,
                taskProjectId: null,
                meetingDate: null,
                projectStatus: null,
              })
              modified = true
            }
          })

          return modified ? tr : null
        },
      }),
    ]
  },
})
