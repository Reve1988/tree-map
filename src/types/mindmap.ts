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
    markers?: Record<string, string>; // markerGroupId -> markerId
    image?: string; // Base64 encoded image
}
