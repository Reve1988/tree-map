import type { MindMapNode } from '../types/mindmap';

export const NODE_WIDTH = 300;
export const NODE_HEIGHT = 40;
export const GAP_X = 80;
export const GAP_Y = 20;

export function useMindMapLayout() {

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

    function layoutNode(node: MindMapNode, x = 0, startY = 0): number {
        // Use actual dimensions or defaults
        const nodeW = node.width || NODE_WIDTH;
        const nodeH = node.height || NODE_HEIGHT;

        node.x = x;

        // If no children, it takes up its own height plus gap
        if (!node.children || node.children.length === 0 || node.isCollapsed) {
            node.y = startY;
            return nodeH + GAP_Y; // Return total height used
        }

        // Layout children
        let currentY = startY;
        let childrenTotalHeight = 0;

        const childX = x + nodeW + GAP_X;

        for (const child of node.children) {
            const childHeight = layoutNode(child, childX, currentY);
            currentY += childHeight;
            childrenTotalHeight += childHeight;
        }

        // Calculate parent Y
        // Center parent relative to children's vertical span
        const firstChild = node.children[0];
        const lastChild = node.children[node.children.length - 1];

        if (firstChild && lastChild) {
            // Get Y center of the children block
            // Note: child.y is top-left.
            const firstChildCenter = firstChild.y + (firstChild.height || NODE_HEIGHT) / 2;
            const lastChildCenter = lastChild.y + (lastChild.height || NODE_HEIGHT) / 2;
            const childrenCenterY = (firstChildCenter + lastChildCenter) / 2;

            // Center parent relative to children, but don't go above startY
            // This prevents tall parent nodes (e.g., with images) from overlapping siblings
            const idealY = childrenCenterY - nodeH / 2;
            node.y = Math.max(idealY, startY);
        }

        // Calculate the actual space this subtree occupies
        // We need to consider both the children's space and the parent's space
        const parentTop = node.y;
        const parentBottom = node.y + nodeH;
        const childrenTop = startY;
        const childrenBottom = startY + childrenTotalHeight;

        // The subtree occupies from the topmost to the bottommost element
        const subtreeTop = Math.min(parentTop, childrenTop);
        const subtreeBottom = Math.max(parentBottom, childrenBottom);
        const subtreeHeight = subtreeBottom - subtreeTop + GAP_Y;

        return subtreeHeight;
    }

    return {
        calculateTreeLayout
    };
}
