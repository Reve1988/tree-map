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

  // Optional: smooth transition? For now, instant.
  transform.value.x = targetX;
  transform.value.y = targetY;
}

function centerRoot() {
    centerNode('root');
}

// Ensure layout is up to date before centering?
// Sometimes layout needs a tick.
watch(() => store.selectedNodeId, (newId) => {
    if (newId) {
        // Wait for layout update if it was a new node
        nextTick(() => {
             centerNode(newId);
        });
    }
});

onMounted(() => {
  // Wait for initial layout and DOM render
  nextTick(() => {
    centerRoot();
  });
});

function onMouseDown(e: MouseEvent) {
  if ((e.target as HTMLElement).closest('.node-content')) return; // Don't drag if clicking node
  
  // If clicking background, deselect
  store.selectNode(null);

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
