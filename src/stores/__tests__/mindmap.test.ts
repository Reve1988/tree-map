import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMindMapStore } from '../mindmap'

describe('MindMap Store - Basic Tests', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    it('should initialize with a root node', () => {
        const store = useMindMapStore()
        expect(store.root).toBeDefined()
        expect(store.root.id).toBe('root')
        expect(store.root.text).toBe('Main Topic')
    })

    it('should add a child node', () => {
        const store = useMindMapStore()
        const initialChildCount = store.root.children.length

        store.addChild('root')

        expect(store.root.children.length).toBe(initialChildCount + 1)
    })

    it('should find a node by id', () => {
        const store = useMindMapStore()
        const node = store.findNode('root')

        expect(node).toBeDefined()
        expect(node?.id).toBe('root')
    })
})
