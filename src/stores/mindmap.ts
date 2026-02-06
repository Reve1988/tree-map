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

    // Drag and Drop state
    const draggingNodeId = ref<string | null>(null);
    const dragOverNodeId = ref<string | null>(null);
    const touchDropZone = ref<'top' | 'middle' | 'bottom' | null>(null);

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

    // Marker management
    function addMarkerToNodes(nodeIds: string[], markerGroupId: string, markerId: string) {
        nodeIds.forEach(id => {
            const node = findNode(id);
            if (node) {
                if (!node.markers) {
                    node.markers = {};
                }
                // Replace existing marker in this group
                node.markers[markerGroupId] = markerId;
            }
        });
    }

    function removeMarkerGroupFromNodes(nodeIds: string[], markerGroupId: string) {
        nodeIds.forEach(id => {
            const node = findNode(id);
            if (node && node.markers) {
                delete node.markers[markerGroupId];
                // Clean up empty markers object
                if (Object.keys(node.markers).length === 0) {
                    delete node.markers;
                }
            }
        });
    }

    function getNodeMarkers(nodeId: string): Record<string, string> {
        const node = findNode(nodeId);
        return node?.markers || {};
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
                const child = node.children[mid];
                if (child) selectNode(child.id);
            }
        } else if (direction === 'up' || direction === 'down') {
            if (node.parentId) {
                const parent = findNode(node.parentId);
                if (parent) {
                    const index = parent.children.findIndex(c => c.id === id);
                    if (index !== -1) {
                        if (direction === 'up' && index > 0) {
                            const sibling = parent.children[index - 1];
                            if (sibling) selectNode(sibling.id);
                        } else if (direction === 'down' && index < parent.children.length - 1) {
                            const sibling = parent.children[index + 1];
                            if (sibling) selectNode(sibling.id);
                        }
                    }
                }
            }
        }
    }

    // Drag and Drop functions
    function isDescendant(ancestorId: string, descendantId: string): boolean {
        const ancestor = findNode(ancestorId);
        if (!ancestor) return false;

        function checkChildren(node: MindMapNode): boolean {
            if (node.id === descendantId) return true;
            for (const child of node.children) {
                if (checkChildren(child)) return true;
            }
            return false;
        }

        return checkChildren(ancestor);
    }

    function canMoveNode(nodeId: string, targetParentId: string): boolean {
        // Cannot move to itself
        if (nodeId === targetParentId) return false;

        // Cannot move root
        if (nodeId === 'root') return false;

        // Cannot move to its own descendant (would create circular reference)
        if (isDescendant(nodeId, targetParentId)) return false;

        return true;
    }

    function moveNodeToParent(nodeId: string, newParentId: string) {
        if (!canMoveNode(nodeId, newParentId)) {
            console.warn('Cannot move node:', nodeId, 'to', newParentId);
            return;
        }

        const node = findNode(nodeId);
        const newParent = findNode(newParentId);

        if (!node || !newParent) return;

        // Remove from old parent
        if (node.parentId) {
            const oldParent = findNode(node.parentId);
            if (oldParent) {
                oldParent.children = oldParent.children.filter(child => child.id !== nodeId);
            }
        }

        // Add to new parent
        node.parentId = newParentId;
        newParent.children.push(node);

        // Expand new parent if collapsed
        if (newParent.isCollapsed) {
            newParent.isCollapsed = false;
        }
    }

    function reorderNode(nodeId: string, targetSiblingId: string, insertBefore: boolean) {
        const node = findNode(nodeId);
        const targetSibling = findNode(targetSiblingId);

        if (!node || !targetSibling) return;
        if (nodeId === targetSiblingId) return;

        // Cannot reorder root
        if (nodeId === 'root') return;

        // If target is root, move as first/last child of root instead
        if (targetSiblingId === 'root') {
            if (!node.parentId) return;

            // Remove from old parent
            const oldParent = findNode(node.parentId);
            if (oldParent) {
                oldParent.children = oldParent.children.filter(child => child.id !== nodeId);
            }

            // Add to root
            node.parentId = 'root';
            if (insertBefore) {
                root.value.children.unshift(node);
            } else {
                root.value.children.push(node);
            }
            return;
        }

        // If they have different parents, move to target's parent first
        if (node.parentId !== targetSibling.parentId) {
            if (!targetSibling.parentId) return;

            // Remove from old parent
            if (node.parentId) {
                const oldParent = findNode(node.parentId);
                if (oldParent) {
                    oldParent.children = oldParent.children.filter(child => child.id !== nodeId);
                }
            }

            // Update parent reference
            node.parentId = targetSibling.parentId;
        }

        const parent = findNode(node.parentId!);
        if (!parent) return;

        // Remove node from current position in children array (if it's already there)
        parent.children = parent.children.filter(child => child.id !== nodeId);

        // Find target index and insert
        const targetIndex = parent.children.findIndex(child => child.id === targetSiblingId);
        if (targetIndex === -1) {
            // Target not found, just add at end
            parent.children.push(node);
            return;
        }

        const insertIndex = insertBefore ? targetIndex : targetIndex + 1;
        parent.children.splice(insertIndex, 0, node);
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
        navigateNode,
        addMarkerToNodes,
        removeMarkerGroupFromNodes,
        getNodeMarkers,
        // Drag and Drop
        draggingNodeId,
        dragOverNodeId,
        touchDropZone,
        isDescendant,
        canMoveNode,
        moveNodeToParent,
        reorderNode,
    };
});
