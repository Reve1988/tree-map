<script setup lang="ts">
import { computed } from 'vue';
import type { MindMapNode } from '../types/mindmap';
import { useMindMapStore } from '../stores/mindmap';

const props = defineProps<{
  node: MindMapNode;
}>();

const store = useMindMapStore();

// We need parent position.
const parent = computed(() => {
  if (!props.node.parentId) return null;
  return store.findNode(props.node.parentId);
});

const path = computed(() => {
  if (!parent.value) return '';
  
  const parentW = parent.value.width || 150;
  const parentH = parent.value.height || 40;
  const childH = props.node.height || 40;

  const startX = parent.value.x + parentW; // Parent Right
  const startY = parent.value.y + parentH / 2;  // Parent Center Y
  
  const endX = props.node.x; // Child Left
  const endY = props.node.y + childH / 2; // Child Center Y
  
  // Cubic Bezier
  const c1x = (startX + endX) / 2;
  const c1y = startY;
  const c2x = (startX + endX) / 2;
  const c2y = endY;
  
  return `M ${startX} ${startY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${endX} ${endY}`;
});
</script>

<template>
  <path 
    v-if="path" 
    :d="path" 
    stroke="#cbd5e1" 
    stroke-width="2" 
    fill="none" 
  />
</template>
