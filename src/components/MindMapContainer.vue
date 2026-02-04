<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { useMindMapStore } from '../stores/mindmap';
import { useMindMapLayout, NODE_WIDTH, NODE_HEIGHT } from '../composables/useLayout';
import MindMapNodeComponent from './MindMapNode.vue';
import ConnectionLine from './ConnectionLine.vue';
import Toolbar from './Toolbar.vue';
import type { MindMapNode } from '../types/mindmap';

const store = useMindMapStore();
const { calculateTreeLayout } = useMindMapLayout();

const transform = ref({ x: 0, y: 0, k: 1 });
const isDragging = ref(false);
const lastPos = ref({ x: 0, y: 0 });
const containerRef = ref<HTMLElement | null>(null);

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

function centerRoot() {
  if (!containerRef.value) return;
  
  const containerWidth = containerRef.value.clientWidth;
  const containerHeight = containerRef.value.clientHeight;
  
  // Target position to center the root node
  // Root node is at store.root.x, store.root.y
  // We want: transform.x + store.root.x * k + NODE_WIDTH/2 * k = containerWidth / 2
  // But wait, the transform applies to the whole canvas.
  // The root is usually at 0,0 relative to the canvas origin if it's the first node, 
  // but let's use its actual coordinates to be safe.
  
  const targetX = (containerWidth - NODE_WIDTH) / 2 - store.root.x;
  const targetY = (containerHeight - NODE_HEIGHT) / 2 - store.root.y;
  
  transform.value = {
    x: targetX,
    y: targetY,
    k: 1
  };
}

onMounted(() => {
  // Wait for initial layout and DOM render
  nextTick(() => {
    centerRoot();
  });
});

function onMouseDown(e: MouseEvent) {
  if ((e.target as HTMLElement).closest('.node-content')) return; // Don't drag if clicking node
  isDragging.value = true;
  lastPos.value = { x: e.clientX, y: e.clientY };
}

function onMouseMove(e: MouseEvent) {
  if (!isDragging.value) return;
  const dx = e.clientX - lastPos.value.x;
  const dy = e.clientY - lastPos.value.y;
  transform.value.x += dx;
  transform.value.y += dy;
  lastPos.value = { x: e.clientX, y: e.clientY };
}

function onMouseUp() {
  isDragging.value = false;
}

function onWheel(e: WheelEvent) {
  e.preventDefault();
  const scaleBy = 1.1;
  const oldScale = transform.value.k;
  const newScale = e.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
  // Simple zoom (centered on mouse would be better but simple scale is fine for now)
  transform.value.k = newScale;
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
  </div>
</template>

<style scoped>
.mindmap-container {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: #f0f2f5;
  cursor: grab;
}

.mindmap-container:active {
  cursor: grabbing;
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
  width: 100%; /* Ideally infinite, but SVG needs size? */
  height: 100%; /* We might needs a huge SVG or overflow visible */
  overflow: visible;
  pointer-events: none;
  z-index: 0;
}
</style>
