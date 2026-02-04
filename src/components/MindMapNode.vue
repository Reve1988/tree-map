<script setup lang="ts">
import { computed, ref, nextTick, watch } from 'vue';
import type { MindMapNode } from '../types/mindmap';
import { useMindMapStore } from '../stores/mindmap';

const props = defineProps<{
  node: MindMapNode;
}>();

const store = useMindMapStore();
const contentRef = ref<HTMLElement | null>(null);
const nodeRef = ref<HTMLElement | null>(null);
const isEditing = ref(false);

const isSelected = computed(() => store.selectedNodeId === props.node.id);

const style = computed(() => ({
  left: `${props.node.x}px`,
  top: `${props.node.y}px`,
  position: 'absolute' as const,
}));

// Watch selection to focus the node wrapper for keyboard events
watch(isSelected, (val) => {
  if (val && !isEditing.value) {
    nextTick(() => {
      nodeRef.value?.focus();
    });
  }
}, { immediate: true });

function selectNode(e: Event) {
   // Prevent bubbling so container doesn't deselect (if we implement that)
   // But we also want to allow things? 
   // Actually, stops propagation might be good.
   e.stopPropagation(); 
   store.selectNode(props.node.id);
}

function startEditing() {
  isEditing.value = true;
  nextTick(() => {
    contentRef.value?.focus();
    // Select all text
    const range = document.createRange();
    const sel = window.getSelection();
    if (contentRef.value && sel) {
        range.selectNodeContents(contentRef.value);
        sel.removeAllRanges();
        sel.addRange(range);
    }
  });
}

function addChild() {
  store.addChild(props.node.id);
}

function removeNode() {
  store.deleteNode(props.node.id);
}

function updateText(e: Event) {
  isEditing.value = false;
  const target = e.target as HTMLElement;
  store.updateNodeText(props.node.id, target.innerText);
  // Re-focus the node wrapper to keep selection active
  nextTick(() => {
      nodeRef.value?.focus();
  });
}

function onKeyDown(e: KeyboardEvent) {
  if (isEditing.value) {
      if (e.key === 'Enter') {
          e.preventDefault();
          (e.target as HTMLElement).blur(); // Just exit edit mode
          // Do not add sibling here
      }
      return;
  }

  // Not editing commands
  if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      startEditing();
  } else if (e.key === 'Enter') {
      // In selection mode, Enter creates a sibling
      e.preventDefault();
      store.addSibling(props.node.id);
  } else if (e.key === 'Tab') {
      e.preventDefault();
      addChild();
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (props.node.id !== 'root') {
          removeNode();
      }
  }
}
</script>

<template>
  <div 
    class="mind-map-node" 
    :style="style"
    ref="nodeRef"
    tabindex="0"
    @click="selectNode"
    @dblclick="startEditing"
    @keydown="onKeyDown"
    :class="{ selected: isSelected }"
  >
    <div 
      ref="contentRef"
      class="node-content" 
      :contenteditable="isEditing" 
      @blur="updateText" 
    >
      {{ node.text }}
    </div>
    
    <div class="node-actions" v-if="isSelected && !isEditing">
      <button @click.stop="addChild" title="Add Child">+</button>
      <button @click.stop="removeNode" title="Delete" v-if="node.id !== 'root'">x</button>
    </div>

    <button 
      v-if="node.children.length > 0" 
      class="toggle-btn"
      @click.stop="store.toggleCollapse(node.id)"
      @mousedown.stop
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
  outline: none; /* Manage focus style manually via selected class */
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
  user-select: none; /* Prevent text selection when dragging/clicking */
}

.node-content[contenteditable="true"] {
    cursor: text;
    user-select: text;
    outline: 2px solid #646cff;
}

.mind-map-node.selected .node-content {
    border-color: #646cff;
    border-width: 2px;
}

.node-actions {
  display: flex;
  gap: 4px;
  margin-top: 4px;
  /* Always show actions if selected for mobile friendliness, or keep hover? 
     Let's rely on selection now since we have it */
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
  z-index: 10;
}
</style>
