import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { MindMapNode } from '../types/mindmap';

export const useMindMapStore = defineStore('mindmap', () => {
    const root = ref<MindMapNode>({
        id: 'root',
        text: 'Central Topic',
        children: [],
        x: 0,
        y: 0,
        parentId: null,
    });

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

    return {
        root,
        addChild,
        addSibling,
        deleteNode,
        updateNodeText,
        toggleCollapse,
        findNode
    };
});
