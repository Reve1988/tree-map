import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { MindMapNode } from '../types/mindmap';

export const useMindMapStore = defineStore('mindmap', () => {
    const root = ref<MindMapNode>({
        id: 'root',
        text: 'Main Topic',
        children: [],
        x: 0,
        y: 0,
        parentId: null,
    });

    // Multi-selection state
    const selectedNodeIds = ref<Set<string>>(new Set());

    // Computed for backward compatibility (returns the most recently selected one)
    const selectedNodeId = computed(() => {
        if (selectedNodeIds.value.size === 0) return null;
        const ids = Array.from(selectedNodeIds.value);
        return ids[ids.length - 1] || null;
    });

    // Helper to check if a node is selected
    function isNodeSelected(id: string) {
        return selectedNodeIds.value.has(id);
    }

    function findNode(id: string, node: MindMapNode = root.value): MindMapNode | undefined {
        if (node.id === id) return node;
        for (const child of node.children) {
            const found = findNode(id, child);
            if (found) return found;
        }
        return undefined;
    }

    function addChild(parentId: string) {
        const parent = findNode(parentId);
        if (parent) {
            if (parent.isCollapsed) parent.isCollapsed = false;
            const newNode: MindMapNode = {
                id: crypto.randomUUID(),
                text: 'New Node',
                children: [],
                x: 0, // Layout will update this
                y: 0,
                parentId: parentId,
            };
            parent.children.push(newNode);
            selectNode(newNode.id); // Default single select new node
        }
    }

    function deleteNode(id: string) {
        if (selectedNodeIds.value.has(id)) {
            deleteSelectedNodes();
        } else {
            deleteOneNode(id);
        }
    }

    function deleteOneNode(id: string) {
        if (id === 'root') return;
        const node = findNode(id);
        if (node && node.parentId) {
            const parent = findNode(node.parentId);
            if (parent) {
                parent.children = parent.children.filter(child => child.id !== id);
            }
        }
        if (selectedNodeIds.value.has(id)) {
            const newSet = new Set(selectedNodeIds.value);
            newSet.delete(id);
            selectedNodeIds.value = newSet;
        }
    }

    function deleteSelectedNodes() {
        const idsToDelete = Array.from(selectedNodeIds.value);

        idsToDelete.forEach(id => {
            if (id === 'root') return;
            const node = findNode(id);
            if (node && node.parentId) {
                const parent = findNode(node.parentId);
                if (parent) {
                    parent.children = parent.children.filter(child => child.id !== id);
                }
            }
        });

        selectedNodeIds.value = new Set();
    }

    function updateNodeText(id: string, text: string) {
        const node = findNode(id);
        if (node) {
            node.text = text;
        }
    }

    function toggleCollapse(id: string) {
        const node = findNode(id);
        if (node && node.children.length > 0) {
            node.isCollapsed = !node.isCollapsed;
        }
    }

    function addSibling(id: string) {
        if (id === 'root') return;
        const node = findNode(id);
        if (node && node.parentId) {
            addChild(node.parentId);
        }
    }

    function reset() {
        root.value = {
            id: 'root',
            text: 'Main Topic',
            children: [],
            x: 0,
            y: 0,
            parentId: null,
        };
        selectedNodeIds.value = new Set();
    }

    function selectNode(id: string | null, multiSelect = false) {
        if (!id) {
            selectedNodeIds.value = new Set();
            return;
        }

        const newSet = new Set(multiSelect ? selectedNodeIds.value : []);
        if (multiSelect) {
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
        } else {
            newSet.add(id);
        }
        selectedNodeIds.value = newSet;
    }

    function clearSelection() {
        selectedNodeIds.value = new Set();
    }

    function updateNodeSize(id: string, width: number, height: number) {
        const node = findNode(id);
        if (node) {
            if (node.width !== width || node.height !== height) {
                node.width = width;
                node.height = height;
            }
        }
    }

    function navigateNode(id: string, direction: 'up' | 'down' | 'left' | 'right') {
        const node = findNode(id);
        if (!node) return;

        if (direction === 'left') {
            if (node.parentId) {
                selectNode(node.parentId);
            }
        } else if (direction === 'right') {
            if (node.children.length > 0 && !node.isCollapsed) {
                const mid = Math.floor(node.children.length / 2);
                selectNode(node.children[mid].id);
            }
        } else if (direction === 'up' || direction === 'down') {
            if (node.parentId) {
                const parent = findNode(node.parentId);
                if (parent) {
                    const index = parent.children.findIndex(c => c.id === id);
                    if (index !== -1) {
                        if (direction === 'up' && index > 0) {
                            selectNode(parent.children[index - 1].id);
                        } else if (direction === 'down' && index < parent.children.length - 1) {
                            selectNode(parent.children[index + 1].id);
                        }
                    }
                }
            }
        }
    }

    return {
        root,
        selectedNodeId,
        selectedNodeIds,
        isNodeSelected,
        addChild,
        addSibling,
        deleteNode,
        deleteSelectedNodes,
        updateNodeText,
        toggleCollapse,
        findNode,
        reset,
        selectNode,
        clearSelection,
        updateNodeSize,
        navigateNode
    };
});
