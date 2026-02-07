// 마커 타입
export type MarkerType = 'tag' | 'priority' | 'shape';

// 마커 인터페이스
export interface Marker {
    id: string;
    groupId: string;
    label: string;
    color: string;
    icon?: string; // Priority의 경우 숫자 (1-9)
}

// 마커 그룹 인터페이스
export interface MarkerGroup {
    id: string;
    name: string;
    type: MarkerType;
    markers: Marker[];
}

// Tag 마커 정의 (6가지 색상)
const TAG_COLORS = [
    { id: 'tag-red', label: 'Red', color: '#ef4444' },
    { id: 'tag-orange', label: 'Orange', color: '#f97316' },
    { id: 'tag-yellow', label: 'Yellow', color: '#eab308' },
    { id: 'tag-green', label: 'Green', color: '#22c55e' },
    { id: 'tag-blue', label: 'Blue', color: '#3b82f6' },
    { id: 'tag-purple', label: 'Purple', color: '#a855f7' },
];

// Priority 마커 정의 (1-9, 색상이 점점 옅어짐)
const PRIORITY_MARKERS = Array.from({ length: 9 }, (_, i) => {
    const num = i + 1;
    // HSL을 사용하여 명도를 조절 (1은 진하고, 9는 옅음)
    // Lightness: 40% (진함) -> 75% (옅음)
    const lightness = 40 + (i * 4.4); // 40, 44.4, 48.8, ..., 75.2
    return {
        id: `priority-${num}`,
        label: `Priority ${num}`,
        color: `hsl(0, 75%, ${lightness}%)`,
        icon: num.toString(),
    };
});

// Shape 마커 정의 (TAG와 동일한 6가지 색상, 모양 아이콘)
const SHAPE_COLORS = [
    { label: 'Red', color: '#ef4444' },
    { label: 'Orange', color: '#f97316' },
    { label: 'Yellow', color: '#eab308' },
    { label: 'Green', color: '#22c55e' },
    { label: 'Blue', color: '#3b82f6' },
    { label: 'Purple', color: '#a855f7' },
];

const SHAPE_GROUPS = [
    { id: 'stars', name: 'Stars', icon: '★' },
    { id: 'flags', name: 'Flags', icon: '⚑' },
    { id: 'people', name: 'People', icon: '♟' },
];

// 마커 그룹 정의
export const MARKER_GROUPS: MarkerGroup[] = [
    {
        id: 'tag',
        name: 'Tag',
        type: 'tag',
        markers: TAG_COLORS.map(({ id, label, color }) => ({
            id,
            groupId: 'tag',
            label,
            color,
        })),
    },
    {
        id: 'priority',
        name: 'Priority',
        type: 'priority',
        markers: PRIORITY_MARKERS.map(({ id, label, color, icon }) => ({
            id,
            groupId: 'priority',
            label,
            color,
            icon,
        })),
    },
    ...SHAPE_GROUPS.map(shape => ({
        id: shape.id,
        name: shape.name,
        type: 'shape' as MarkerType,
        markers: SHAPE_COLORS.map(({ label, color }) => ({
            id: `${shape.id}-${label.toLowerCase()}`,
            groupId: shape.id,
            label: `${shape.name} ${label}`,
            color,
            icon: shape.icon,
        })),
    })),
];

// 헬퍼 함수: 마커 ID로 마커 찾기
export function getMarkerById(markerId: string): Marker | undefined {
    for (const group of MARKER_GROUPS) {
        const marker = group.markers.find((m) => m.id === markerId);
        if (marker) return marker;
    }
    return undefined;
}

// 헬퍼 함수: 그룹 ID로 그룹 찾기
export function getMarkerGroupById(groupId: string): MarkerGroup | undefined {
    return MARKER_GROUPS.find((g) => g.id === groupId);
}
