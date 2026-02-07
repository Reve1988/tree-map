<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { useMindMapStore } from '../stores/mindmap';
import { useMindMapLayout, NODE_WIDTH, NODE_HEIGHT } from '../composables/useLayout';
import MindMapNodeComponent from './MindMapNode.vue';
import ConnectionLine from './ConnectionLine.vue';
import Toolbar from './Toolbar.vue';
import ZoomControl from './ZoomControl.vue';
import UserGuide from './UserGuide.vue';
import type { MindMapNode } from '../types/mindmap';

const store = useMindMapStore();
const { calculateTreeLayout } = useMindMapLayout();

declare const __APP_VERSION__: string;
const appVersion = __APP_VERSION__;

const transform = ref({ x: 0, y: 0, k: 1 });
const isPanning = ref(false);
const isSelecting = ref(false);
const selectionBox = ref({ x: 0, y: 0, width: 0, height: 0 });
const selectionStart = ref({ x: 0, y: 0 });
const lastPos = ref({ x: 0, y: 0 });
const containerRef = ref<HTMLElement | null>(null);

// Zoom limits
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;

// Flatten the tree for rendering
const flatNodes = computed(() => {
  const nodes: MindMapNode[] = [];
  traverse(store.root, nodes);
  return nodes;
});

function traverse(node: MindMapNode, list: MindMapNode[]) {
  list.push(node);
  if (!node.isCollapsed) {
    for (const child of node.children) {
      traverse(child, list);
    }
  }
}

// Watch changes to data and re-layout
watch(() => store.root, () => {
  calculateTreeLayout(store.root);
}, { deep: true, immediate: true });

function centerNode(id: string) {
  if (!containerRef.value) return;
  const node = store.findNode(id);
  if (!node) return;

  const containerWidth = containerRef.value.clientWidth;
  const containerHeight = containerRef.value.clientHeight;
  const k = transform.value.k;

  const nodeW = node.width || NODE_WIDTH;
  const nodeH = node.height || NODE_HEIGHT;

  // Node Center in Canvas Space
  const nodeCenterX = node.x + nodeW / 2;
  const nodeCenterY = node.y + nodeH / 2;

  // Screen Center = CanvasPoint * k + Translate
  // Translate = Screen Center - CanvasPoint * k
  const targetX = (containerWidth / 2) - (nodeCenterX * k);
  const targetY = (containerHeight / 2) - (nodeCenterY * k);

  transform.value.x = targetX;
  transform.value.y = targetY;
}

function centerRoot() {
    centerNode('root');
}

// Center only when a new node is added (not on selection)
watch(() => store.newlyAddedNodeId, (newId) => {
    if (newId) {
        nextTick(() => {
             centerNode(newId);
             store.newlyAddedNodeId = null; // Clear after centering
        });
    }
});

onMounted(() => {
  nextTick(() => {
    centerRoot();
  });
});

function onMouseDown(e: MouseEvent) {
  if ((e.target as HTMLElement).closest('.node-content')) return;
  // Prevent clearing selection when clicking toolbar
  if ((e.target as HTMLElement).closest('.toolbar')) return;

  if (e.button === 2) {
      // Right Click -> Pan
      isPanning.value = true;
      lastPos.value = { x: e.clientX, y: e.clientY };
  } else if (e.button === 0) {
      // Left Click -> Selection (but not if dragging a node)
      // Check if we're starting a drag on a node
      const isDraggingNode = (e.target as HTMLElement).closest('.mind-map-node');
      if (isDraggingNode) {
          // Let the node handle the drag
          return;
      }
      
      // If not holding Ctrl/Shift, clear previous selection (unless handled by node click, but this is background)
      if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
          store.clearSelection();
      }
      
      isSelecting.value = true;
      // Start pos in screen coordinates relevant to container
      const rect = containerRef.value?.getBoundingClientRect();
      if (rect) {
          selectionStart.value = { x: e.clientX - rect.left, y: e.clientY - rect.top };
          selectionBox.value = { x: selectionStart.value.x, y: selectionStart.value.y, width: 0, height: 0 };
      }
  }
}

function onMouseMove(e: MouseEvent) {
  if (isPanning.value) {
      const dx = e.clientX - lastPos.value.x;
      const dy = e.clientY - lastPos.value.y;
      transform.value.x += dx;
      transform.value.y += dy;
      lastPos.value = { x: e.clientX, y: e.clientY };
  } else if (isSelecting.value) {
      const rect = containerRef.value?.getBoundingClientRect();
      if (!rect) return;
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;
      
      const x = Math.min(selectionStart.value.x, currentX);
      const y = Math.min(selectionStart.value.y, currentY);
      const width = Math.abs(currentX - selectionStart.value.x);
      const height = Math.abs(currentY - selectionStart.value.y);
      
      selectionBox.value = { x, y, width, height };
  }
}

function onMouseUp(e: MouseEvent) {
  if (isPanning.value) {
      isPanning.value = false;
  }
  if (isSelecting.value) {
      isSelecting.value = false;
      // Calculate selected nodes
      finishSelection(e.ctrlKey || e.metaKey || e.shiftKey); // Pass modifier to append selection if desired
      // Reset box
      selectionBox.value = { x: 0, y: 0, width: 0, height: 0 };
  }
}

function finishSelection(append: boolean) {
    // Transform selection box to canvas coordinates to compare with nodes
    // SelectionBox is in Container(Screen) coordinates (relative to container top-left)
    // Node Coordinates are Canvas coordinates.
    // ScreenPoint = CanvasPoint * k + Transform
    // CanvasPoint = (ScreenPoint - Transform) / k
    
    const k = transform.value.k;
    const tx = transform.value.x;
    const ty = transform.value.y;

    const boxLeft = (selectionBox.value.x - tx) / k;
    const boxTop = (selectionBox.value.y - ty) / k;
    const boxRight = (selectionBox.value.x + selectionBox.value.width - tx) / k;
    const boxBottom = (selectionBox.value.y + selectionBox.value.height - ty) / k;

    // Check intersection with all nodes
    const idsInBox = flatNodes.value.filter(node => {
        const nodeW = node.width || NODE_WIDTH;
        const nodeH = node.height || NODE_HEIGHT; // Approximation if height unknown
        
        // Check overlap
        const nodeLeft = node.x;
        const nodeTop = node.y;
        const nodeRight = node.x + nodeW;
        const nodeBottom = node.y + nodeH;

        return !(nodeLeft > boxRight || 
                 nodeRight < boxLeft || 
                 nodeTop > boxBottom || 
                 nodeBottom < boxTop);
    }).map(n => n.id);

    // Apply selection
    if (!append) {
        store.clearSelection();
    }
    
    idsInBox.forEach(id => {
        // If append mode, we might want to toggle? Standard behavior usually selects.
        // Let's just select them.
        store.selectNode(id, true); // true to add to set
    });
}

function onWheel(e: WheelEvent) {
  e.preventDefault();
  const scaleBy = 1.1;
  const oldScale = transform.value.k;
  let newScale = e.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
  
  // Enforce zoom limits
  newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newScale));
  transform.value.k = newScale;
}

function zoomIn() {
  const newZoom = Math.min(transform.value.k + 0.1, MAX_ZOOM);
  transform.value.k = newZoom;
}

function zoomOut() {
  const newZoom = Math.max(transform.value.k - 0.1, MIN_ZOOM);
  transform.value.k = newZoom;
}

function resetZoom() {
  transform.value.k = 1;
}

function onContextMenu(e: Event) {
    e.preventDefault();
}

// ===== Touch Event Handlers =====
const lastTouchPos = ref({ x: 0, y: 0 });
const lastPinchDistance = ref(0);
const isTouchPanning = ref(false);

// Double-tap-drag selection state
const lastTapTime = ref(0);
const lastTapPos = ref({ x: 0, y: 0 });
const isTouchSelecting = ref(false);
const DOUBLE_TAP_DELAY = 300; // ms
const DOUBLE_TAP_DISTANCE = 30; // px

function getTouchDistance(touches: TouchList): number {
  if (touches.length < 2) return 0;
  const t0 = touches[0];
  const t1 = touches[1];
  if (!t0 || !t1) return 0;
  const dx = t0.clientX - t1.clientX;
  const dy = t0.clientY - t1.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function getTouchCenter(touches: TouchList): { x: number; y: number } {
  const t0 = touches[0];
  if (!t0) return { x: 0, y: 0 };
  
  if (touches.length === 1) {
    return { x: t0.clientX, y: t0.clientY };
  }
  const t1 = touches[1];
  if (!t1) return { x: t0.clientX, y: t0.clientY };
  
  return {
    x: (t0.clientX + t1.clientX) / 2,
    y: (t0.clientY + t1.clientY) / 2,
  };
}

function onTouchStart(e: TouchEvent) {
  // Ignore if touching toolbar or node
  if ((e.target as HTMLElement).closest('.toolbar')) return;
  if ((e.target as HTMLElement).closest('.mind-map-node')) return;
  
  const t0 = e.touches[0];
  if (!t0) return;
  
  if (e.touches.length === 1) {
    const now = Date.now();
    const dx = t0.clientX - lastTapPos.value.x;
    const dy = t0.clientY - lastTapPos.value.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Check for double-tap
    if (now - lastTapTime.value < DOUBLE_TAP_DELAY && dist < DOUBLE_TAP_DISTANCE) {
      // Double-tap detected: enter selection mode
      isTouchSelecting.value = true;
      isSelecting.value = true;
      isTouchPanning.value = false;
      store.clearSelection();
      
      const rect = containerRef.value?.getBoundingClientRect();
      if (rect) {
        selectionStart.value = { x: t0.clientX - rect.left, y: t0.clientY - rect.top };
        selectionBox.value = { x: selectionStart.value.x, y: selectionStart.value.y, width: 0, height: 0 };
      }
      
      lastTapTime.value = 0; // Reset to prevent triple-tap
      return;
    }
    
    // Record tap for double-tap detection
    lastTapTime.value = now;
    lastTapPos.value = { x: t0.clientX, y: t0.clientY };
    
    // Single finger: start panning
    isTouchPanning.value = true;
    lastTouchPos.value = { x: t0.clientX, y: t0.clientY };
    store.clearSelection();
  } else if (e.touches.length === 2) {
    // Two fingers: start pinch zoom (cancel selection if active)
    isTouchPanning.value = false;
    isTouchSelecting.value = false;
    isSelecting.value = false;
    selectionBox.value = { x: 0, y: 0, width: 0, height: 0 };
    lastPinchDistance.value = getTouchDistance(e.touches);
    lastTouchPos.value = getTouchCenter(e.touches);
  }
}

function onTouchMove(e: TouchEvent) {
  e.preventDefault();
  
  const t0 = e.touches[0];
  if (!t0) return;
  
  if (e.touches.length === 1 && isTouchSelecting.value) {
    // Double-tap drag selection
    const rect = containerRef.value?.getBoundingClientRect();
    if (!rect) return;
    const currentX = t0.clientX - rect.left;
    const currentY = t0.clientY - rect.top;
    
    const x = Math.min(selectionStart.value.x, currentX);
    const y = Math.min(selectionStart.value.y, currentY);
    const width = Math.abs(currentX - selectionStart.value.x);
    const height = Math.abs(currentY - selectionStart.value.y);
    
    selectionBox.value = { x, y, width, height };
  } else if (e.touches.length === 1 && isTouchPanning.value) {
    // Single finger panning
    const dx = t0.clientX - lastTouchPos.value.x;
    const dy = t0.clientY - lastTouchPos.value.y;
    transform.value.x += dx;
    transform.value.y += dy;
    lastTouchPos.value = { x: t0.clientX, y: t0.clientY };
  } else if (e.touches.length >= 2) {
    // Stop panning when switching to 2 fingers
    isTouchPanning.value = false;
    
    // Pinch zoom
    const currentDistance = getTouchDistance(e.touches);
    const currentCenter = getTouchCenter(e.touches);
    
    // Initialize pinch distance if this is the first 2-finger touch
    if (lastPinchDistance.value === 0) {
      lastPinchDistance.value = currentDistance;
      lastTouchPos.value = currentCenter;
      return;
    }
    
    // Apply zoom (only if distance changed significantly)
    if (currentDistance > 0 && lastPinchDistance.value > 0) {
      const scale = currentDistance / lastPinchDistance.value;
      if (Math.abs(scale - 1) > 0.01) { // Threshold to avoid jitter
        let newZoom = transform.value.k * scale;
        newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
        transform.value.k = newZoom;
      }
    }
    
    // Also pan with two fingers
    const dx = currentCenter.x - lastTouchPos.value.x;
    const dy = currentCenter.y - lastTouchPos.value.y;
    transform.value.x += dx;
    transform.value.y += dy;
    
    lastPinchDistance.value = currentDistance;
    lastTouchPos.value = currentCenter;
  }
}

function onTouchEnd(e: TouchEvent) {
  if (e.touches.length === 0) {
    if (isTouchSelecting.value) {
      // Finish selection
      isTouchSelecting.value = false;
      isSelecting.value = false;
      finishSelection(false);
      selectionBox.value = { x: 0, y: 0, width: 0, height: 0 };
    }
    isTouchPanning.value = false;
    lastPinchDistance.value = 0;
  } else if (e.touches.length === 1) {
    // Switched from 2 to 1 finger
    const t0 = e.touches[0];
    if (t0) {
      lastTouchPos.value = { x: t0.clientX, y: t0.clientY };
      isTouchPanning.value = true;
    }
  }
}


</script>

<template>
  <div 
    class="mindmap-container" 
    ref="containerRef"
    @mousedown="onMouseDown"
    @mousemove="onMouseMove"
    @mouseup="onMouseUp"
    @mouseleave="onMouseUp"
    @wheel="onWheel"
    @contextmenu="onContextMenu"
    @touchstart="onTouchStart"
    @touchmove.prevent="onTouchMove"
    @touchend="onTouchEnd"
  >
    <Toolbar @center-on-root="centerNode('root')" @navigate-to-node="(id: string) => centerNode(id)" />
    <div 
      class="mindmap-canvas" 
      :style="{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})` }"
    >
      <svg class="connections-layer">
        <ConnectionLine 
          v-for="node in flatNodes" 
          :key="'conn-' + node.id" 
          :node="node" 
        />
      </svg>
      
      <MindMapNodeComponent 
        v-for="node in flatNodes" 
        :key="node.id" 
        :node="node" 
      />
    </div>
    
    <!-- Selection Box -->
    <div 
        v-if="isSelecting" 
        class="selection-box"
        :style="{
            left: selectionBox.x + 'px',
            top: selectionBox.y + 'px',
            width: selectionBox.width + 'px',
            height: selectionBox.height + 'px'
        }"
    ></div>
    
    <!-- Zoom Control -->
    <ZoomControl 
      :zoom="transform.k"
      :min-zoom="MIN_ZOOM"
      :max-zoom="MAX_ZOOM"
      @zoom-in="zoomIn"
      @zoom-out="zoomOut"
      @reset-zoom="() => { resetZoom(); centerRoot(); }"
    />
    
    <!-- Version Label -->
    <div class="version-label">v{{ appVersion }}</div>
    
    <!-- User Guide -->
    <UserGuide />
  </div>
</template>

<style scoped>
.mindmap-container {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: var(--bg-color);
  color: var(--text-color);
  cursor: default;
  user-select: none;
  touch-action: none; /* Prevent browser handling of touch gestures */
}

.mindmap-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transform-origin: 0 0;
}

.connections-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%; 
  height: 100%; 
  overflow: visible;
  pointer-events: none;
  z-index: 0;
}

.selection-box {
    position: absolute;
    border: 1px solid var(--selection-color);
    background-color: var(--selection-bg);
    pointer-events: none;
    z-index: 1000;
}

.version-label {
  position: fixed;
  bottom: 8px;
  left: 12px;
  font-size: 20px;
  color: var(--text-color);
  opacity: 0.3;
  pointer-events: none;
  user-select: none;
  z-index: 10;
}
</style>
