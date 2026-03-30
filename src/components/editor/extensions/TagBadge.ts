import { Node, mergeAttributes } from '@tiptap/core'

export interface TagBadgeOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tagBadge: {
      insertTag: (attrs: { tagName: string; tagId: string; color: string }) => ReturnType
    }
  }
}

export const TagBadge = Node.create<TagBadgeOptions>({
  name: 'tagBadge',

  group: 'inline',

  inline: true,

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      tagName: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-tag-name'),
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-tag-name': attributes.tagName,
        }),
      },
      tagId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-tag-id'),
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-tag-id': attributes.tagId,
        }),
      },
      color: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-tag-color'),
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-tag-color': attributes.color,
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-tag-name]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const color = HTMLAttributes['data-tag-color'] || '#9898a0'
    const tagName = HTMLAttributes['data-tag-name'] || ''

    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'tag-badge',
        style: `--tag-color: ${color}`,
        contenteditable: 'false',
      }),
      `#${tagName}`,
    ]
  },

  addCommands() {
    return {
      insertTag:
        (attrs) =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs,
            })
            .insertContent(' ')
            .run()
        },
    }
  },
})
