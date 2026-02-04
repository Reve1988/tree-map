export interface MindMapNode {
    id: string;
    text: string;
    children: MindMapNode[];
    x: number;
    y: number;
    width?: number; // For layout calculations
    height?: number; // For layout calculations
    parentId: string | null;
    isCollapsed?: boolean;
}
