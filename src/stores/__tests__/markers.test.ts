import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMindMapStore } from '../mindmap'

describe('MindMap Store - Marker Tests', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    it('should add a marker to a node', () => {
        const store = useMindMapStore()

        store.addMarkerToNodes(['root'], 'tag', 'tag-red')

        expect(store.root.markers).toBeDefined()
        expect(store.root.markers?.['tag']).toBe('tag-red')
    })

    it('should replace marker in the same group', () => {
        const store = useMindMapStore()

        // Add red tag
        store.addMarkerToNodes(['root'], 'tag', 'tag-red')
        expect(store.root.markers?.['tag']).toBe('tag-red')

        // Replace with blue tag
        store.addMarkerToNodes(['root'], 'tag', 'tag-blue')
        expect(store.root.markers?.['tag']).toBe('tag-blue')
    })

    it('should allow multiple markers from different groups', () => {
        const store = useMindMapStore()

        store.addMarkerToNodes(['root'], 'tag', 'tag-red')
        store.addMarkerToNodes(['root'], 'priority', 'priority-1')

        expect(store.root.markers?.['tag']).toBe('tag-red')
        expect(store.root.markers?.['priority']).toBe('priority-1')
    })

    it('should remove a marker group from nodes', () => {
        const store = useMindMapStore()

        // Add markers
        store.addMarkerToNodes(['root'], 'tag', 'tag-red')
        store.addMarkerToNodes(['root'], 'priority', 'priority-1')

        // Remove tag group
        store.removeMarkerGroupFromNodes(['root'], 'tag')

        expect(store.root.markers?.['tag']).toBeUndefined()
        expect(store.root.markers?.['priority']).toBe('priority-1')
    })

    it('should clean up markers object when empty', () => {
        const store = useMindMapStore()

        store.addMarkerToNodes(['root'], 'tag', 'tag-red')
        store.removeMarkerGroupFromNodes(['root'], 'tag')

        expect(store.root.markers).toBeUndefined()
    })

    it('should add markers to multiple nodes simultaneously', () => {
        const store = useMindMapStore()

        // Add two child nodes
        store.addChild('root')
        store.addChild('root')
        const child1Id = store.root.children[0]!.id
        const child2Id = store.root.children[1]!.id

        // Add marker to both children
        store.addMarkerToNodes([child1Id, child2Id], 'priority', 'priority-3')

        expect(store.root.children[0]!.markers?.['priority']).toBe('priority-3')
        expect(store.root.children[1]!.markers?.['priority']).toBe('priority-3')
    })

    it('should get node markers correctly', () => {
        const store = useMindMapStore()

        store.addMarkerToNodes(['root'], 'tag', 'tag-red')
        store.addMarkerToNodes(['root'], 'priority', 'priority-1')

        const markers = store.getNodeMarkers('root')

        expect(markers).toEqual({
            tag: 'tag-red',
            priority: 'priority-1'
        })
    })

    it('should return empty object for node without markers', () => {
        const store = useMindMapStore()

        const markers = store.getNodeMarkers('root')

        expect(markers).toEqual({})
    })
})
