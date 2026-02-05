<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { useMindMapStore } from '../stores/mindmap';
import { useMindMapLayout, NODE_WIDTH, NODE_HEIGHT } from '../composables/useLayout';
import MindMapNodeComponent from './MindMapNode.vue';
import ConnectionLine from './ConnectionLine.vue';
import Toolbar from './Toolbar.vue';
import ZoomControl from './ZoomControl.vue';
import type { MindMapNode } from '../types/mindmap';

const store = useMindMapStore();
const { calculateTreeLayout } = useMindMapLayout();

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

watch(() => store.selectedNodeId, (newId) => {
    if (newId) {
        nextTick(() => {
             centerNode(newId);
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
      // Left Click -> Selection
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
  >
    <Toolbar />
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
      @reset-zoom="resetZoom"
    />
  </div>
</template>

<style scoped>
.mindmap-container {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: var(--bg-color);
  color: var(--text-color);
  cursor: default; /* Changed from grab since left click is select */
  user-select: none; /* Prevent text selection during drag */
}

/* Add grabbing cursor only when panning */
.mindmap-container:active {
  /* Cursor handling via JS class or just relies on button state logic visual? */
  /* We can't easily detect right-click active via pure CSS efficiently without specific classes */
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
</style>
