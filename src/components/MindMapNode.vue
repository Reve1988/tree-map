<script setup lang="ts">
import { computed } from 'vue';
import type { MindMapNode } from '../types/mindmap';
import { useMindMapStore } from '../stores/mindmap';

const props = defineProps<{
  node: MindMapNode;
}>();

const store = useMindMapStore();

const style = computed(() => ({
  left: `${props.node.x}px`,
  top: `${props.node.y}px`,
  position: 'absolute' as const,
}));

function addChild() {
  store.addChild(props.node.id);
}

function removeNode() {
  store.deleteNode(props.node.id);
}

function updateText(e: Event) {
  const target = e.target as HTMLElement;
  store.updateNodeText(props.node.id, target.innerText);
}

function onEnter(e: KeyboardEvent) {
  (e.target as HTMLElement).blur(); // Trigger updateText
  store.addSibling(props.node.id);
}

function onTab() {
  store.addChild(props.node.id);
  // Optional: functionality to focus the new child could be added here
}
</script>

<template>
  <div class="mind-map-node" :style="style">
    <div 
      class="node-content" 
      contenteditable 
      @blur="updateText" 
      @keydown.enter.prevent="onEnter"
      @keydown.tab.prevent="onTab"
    >
      {{ node.text }}
    </div>
    
    <div class="node-actions">
      <button @click="addChild" title="Add Child">+</button>
      <button @click="removeNode" title="Delete" v-if="node.id !== 'root'">x</button>
    </div>

    <button 
      v-if="node.children.length > 0" 
      class="toggle-btn"
      @click="store.toggleCollapse(node.id)"
    >
      {{ node.isCollapsed ? '+' : '-' }}
    </button>

  </div>
</template>

<style scoped>
.mind-map-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  /* We use absolute positioning calculated by layout */
  width: 150px;
}

.node-content {
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 8px;
  min-height: 20px;
  width: 100%;
  text-align: center;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.node-actions {
  display: flex;
  gap: 4px;
  margin-top: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.mind-map-node:hover .node-actions {
  opacity: 1;
}

button {
  padding: 2px 6px;
  font-size: 12px;
  cursor: pointer;
}

.toggle-btn {
  position: absolute;
  right: -10px; /* Adjust position based on design */
  top: 50%;
  transform: translateY(-50%);
  border-radius: 50%;
  width: 20px;
  height: 20px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #ccc;
  background: white;
  font-size: 14px;
}
</style>
