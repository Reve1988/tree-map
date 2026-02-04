import type { MindMapNode } from '../types/mindmap';

export function useMindMapLayout() {
    const NODE_WIDTH = 150;
    const NODE_HEIGHT = 40;
    const GAP_X = 50;
    const GAP_Y = 20;

    function calculateTreeLayout(root: MindMapNode) {
        // First pass: calculate size of each subtree
        // But for a simple mind map, we can just calculate Y positions based on leaf counts or "units" of height.
        // Let's do a simple recursive layout.

        // We'll traverse and assign positions.
        // Root is at (0,0).
        // Children are to the right.

        // reset positions
        layoutNode(root);
    }

    function layoutNode(node: MindMapNode, depth = 0, startY = 0): number {
        // Assign X based on depth
        node.x = depth * (NODE_WIDTH + GAP_X);

        // If no children, it takes up 1 unit of height (or just its own height)
        if (!node.children || node.children.length === 0) {
            node.y = startY;
            return NODE_HEIGHT + GAP_Y; // Return total height used
        }

        // If children, layout them
        let currentY = startY;
        let totalHeight = 0;

        for (const child of node.children) {
            const childHeight = layoutNode(child, depth + 1, currentY);
            currentY += childHeight;
            totalHeight += childHeight;
        }

        // Parent Y is average of children Ys, roughly?
        // Or just centered on the children's bounding box.
        if (node.children.length > 0) {
            const firstChild = node.children[0];
            const lastChild = node.children[node.children.length - 1];
            if (firstChild && lastChild) {
                node.y = (firstChild.y + lastChild.y) / 2;
            }
        }

        return totalHeight;
    }

    return {
        calculateTreeLayout
    };
}
