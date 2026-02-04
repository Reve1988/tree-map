import { defineStore } from 'pinia';
import { ref } from 'vue';
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

    const selectedNodeId = ref<string | null>(null);

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
            selectNode(newNode.id);
        }
    }

    function deleteNode(id: string) {
        if (id === 'root') return; // Cannot delete root

        // We need to find the parent to remove the child
        // Since our findNode returns the node, we might need a findParent or store parentId ref (which we did).
        // Let's search for the parent.
        const node = findNode(id);
        if (node && node.parentId) {
            const parent = findNode(node.parentId);
            if (parent) {
                parent.children = parent.children.filter(child => child.id !== id);
            }
        }
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
        selectedNodeId.value = null;
    }

    function selectNode(id: string | null) {
        selectedNodeId.value = id;
    }

    function updateNodeSize(id: string, width: number, height: number) {
        const node = findNode(id);
        if (node) {
            // Only update if changed to avoid unnecessary re-layouts
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
                // Select the middle child for better UX, or just the first?
                // Let's select the middle one to align with visual intuition
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
        addChild,
        addSibling,
        deleteNode,
        updateNodeText,
        toggleCollapse,
        findNode,
        reset,
        selectNode,
        updateNodeSize,
        navigateNode
    };
});
