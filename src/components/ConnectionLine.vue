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
  
  const startX = parent.value.x + 150; // Parent Right (Width is 150)
  const startY = parent.value.y + 20;  // Parent Center Y (Height is 40)
  
  const endX = props.node.x; // Child Left
  const endY = props.node.y + 20; // Child Center Y
  
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
