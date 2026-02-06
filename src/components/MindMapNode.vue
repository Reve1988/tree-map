<script setup lang="ts">
import { computed, ref, nextTick, watch, onMounted, onUnmounted } from 'vue';
import type { MindMapNode } from '../types/mindmap';
import { useMindMapStore } from '../stores/mindmap';
import { getMarkerById } from '../types/markers';

const props = defineProps<{
  node: MindMapNode;
}>();

const store = useMindMapStore();
const textRef = ref<HTMLElement | null>(null);
const nodeRef = ref<HTMLElement | null>(null);
const isEditing = ref(false);
const originalText = ref('');

// Drag and Drop state
const isDragging = ref(false);
const isDragOver = ref(false);
const dropZone = ref<'top' | 'middle' | 'bottom' | null>(null);

// Marker context menu
const showMarkerMenu = ref(false);
const markerMenuPosition = ref({ x: 0, y: 0 });
const selectedMarkerGroupId = ref<string | null>(null);

const isSelected = computed(() => store.isNodeSelected(props.node.id));

const nodeMarkers = computed(() => {
  if (!props.node.markers) return [];
  return Object.values(props.node.markers)
    .map(markerId => getMarkerById(markerId))
    .filter(marker => marker !== undefined);
});

const style = computed(() => ({
  left: `${props.node.x}px`,
  top: `${props.node.y}px`,
  position: 'absolute' as const,
}));

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
    if (nodeRef.value) {
        resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                // Use borderBoxSize if available for better accuracy, fallback to contentRect
                let width = entry.contentRect.width;
                let height = entry.contentRect.height;
                
                if (entry.borderBoxSize && entry.borderBoxSize.length > 0) {
                    width = entry.borderBoxSize[0]?.inlineSize ?? width;
                    height = entry.borderBoxSize[0]?.blockSize ?? height;
                }
                
                store.updateNodeSize(props.node.id, width, height);
            }
        });
        resizeObserver.observe(nodeRef.value);
    }
});

onUnmounted(() => {
    resizeObserver?.disconnect();
});

// Watch selection to focus the node wrapper for keyboard events
watch(isSelected, (val) => {
  if (val && !isEditing.value) {
    nextTick(() => {
      nodeRef.value?.focus();
    });
  }
}, { immediate: true });

// Watch draggingNodeId to clear drop state when drag ends globally
watch(() => store.draggingNodeId, (val) => {
  if (val === null) {
    // Clear all drop states when drag ends
    isDragOver.value = false;
    dropZone.value = null;
  }
});

// Watch dragOverNodeId to clear drop state when dragging over a different node
watch(() => store.dragOverNodeId, (newVal) => {
  // If dragging over a different node, clear this node's drop state
  if (newVal !== null && newVal !== props.node.id) {
    isDragOver.value = false;
    dropZone.value = null;
  }
});

function selectNode(e: MouseEvent) {
   // Prevent bubbling so container doesn't deselect
   e.stopPropagation(); 
   const multiSelect = e.ctrlKey || e.metaKey || e.shiftKey;
   store.selectNode(props.node.id, multiSelect);
}

function startEditing() {
  originalText.value = props.node.text;
  isEditing.value = true;
  nextTick(() => {
    textRef.value?.focus();
    // Select all text
    const range = document.createRange();
    const sel = window.getSelection();
    if (textRef.value && sel) {
        range.selectNodeContents(textRef.value);
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
      } else if (e.key === 'Escape') {
          e.preventDefault();
          if (textRef.value) {
              textRef.value.innerText = originalText.value;
          }
          isEditing.value = false;
          // Blur to exit focus, updateText will run but with original text
          (e.target as HTMLElement).blur();
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
  } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      const direction = e.key.replace('Arrow', '').toLowerCase() as 'up' | 'down' | 'left' | 'right';
      store.navigateNode(props.node.id, direction);
  }
}

function onMarkerRightClick(e: MouseEvent, groupId: string) {
  e.preventDefault();
  e.stopPropagation();
  selectedMarkerGroupId.value = groupId;
  
  // Use exact click position
  markerMenuPosition.value = { x: e.clientX, y: e.clientY };
  showMarkerMenu.value = true;
}

function deleteMarker() {
  if (selectedMarkerGroupId.value) {
    store.removeMarkerGroupFromNodes([props.node.id], selectedMarkerGroupId.value);
    showMarkerMenu.value = false;
    selectedMarkerGroupId.value = null;
  }
}

function closeMarkerMenu() {
  showMarkerMenu.value = false;
  selectedMarkerGroupId.value = null;
}

// Close menu on click outside
onMounted(() => {
  document.addEventListener('click', closeMarkerMenu);
});

onUnmounted(() => {
  document.removeEventListener('click', closeMarkerMenu);
});

// Drag and Drop handlers
function onDragStart(e: DragEvent) {
  if (isEditing.value) {
    e.preventDefault();
    return;
  }
  
  isDragging.value = true;
  store.draggingNodeId = props.node.id;
  
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', props.node.id);
  }
  
  // Add visual feedback
  setTimeout(() => {
    if (nodeRef.value) {
      nodeRef.value.style.opacity = '0.5';
    }
  }, 0);
}

function onDragEnd() {
  isDragging.value = false;
  isDragOver.value = false;
  dropZone.value = null;
  store.draggingNodeId = null;
  store.dragOverNodeId = null;
  
  if (nodeRef.value) {
    nodeRef.value.style.opacity = '1';
  }
}

function onDragOver(e: DragEvent) {
  e.preventDefault();
  e.stopPropagation();
  
  // Use the store's draggingNodeId (shared across all node instances)
  const draggedId = store.draggingNodeId;
  if (!draggedId || draggedId === props.node.id) {
    return;
  }
  
  // Check if this is a valid drop target
  if (!store.canMoveNode(draggedId, props.node.id)) {
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'none';
    }
    isDragOver.value = false;
    return;
  }
  
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move';
  }
  
  // Update the global dragOverNodeId to clear other nodes' drop states
  store.dragOverNodeId = props.node.id;
  
  isDragOver.value = true;
  
  // Determine drop zone based on mouse position
  const rect = nodeRef.value?.getBoundingClientRect();
  if (rect) {
    const y = e.clientY - rect.top;
    const height = rect.height;
    
    if (y < height * 0.25) {
      dropZone.value = 'top';
    } else if (y > height * 0.75) {
      dropZone.value = 'bottom';
    } else {
      dropZone.value = 'middle';
    }
  }
}

function onDragLeave(e: DragEvent) {
  // Only clear if we're actually leaving the node (not entering a child element)
  const target = e.target as HTMLElement;
  if (target === nodeRef.value) {
    isDragOver.value = false;
    dropZone.value = null;
  }
}

function onDrop(e: DragEvent) {
  e.preventDefault();
  e.stopPropagation();
  
  const draggedNodeId = e.dataTransfer?.getData('text/plain');
  if (!draggedNodeId || draggedNodeId === props.node.id) {
    isDragOver.value = false;
    dropZone.value = null;
    return;
  }
  
  // Handle the drop based on drop zone
  if (dropZone.value === 'middle') {
    // Drop in the middle: make it a child
    store.moveNodeToParent(draggedNodeId, props.node.id);
  } else if (dropZone.value === 'top') {
    // Drop on top: insert before this node (as sibling)
    store.reorderNode(draggedNodeId, props.node.id, true);
  } else if (dropZone.value === 'bottom') {
    // Drop on bottom: insert after this node (as sibling)
    store.reorderNode(draggedNodeId, props.node.id, false);
  }
  
  isDragOver.value = false;
  dropZone.value = null;
}
</script>

<template>
  <div 
    class="mind-map-node" 
    :style="style"
    ref="nodeRef"
    tabindex="0"
    draggable="true"
    @click="selectNode"
    @dblclick="startEditing"
    @keydown="onKeyDown"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
    :class="{ 
      selected: isSelected,
      'drag-over': isDragOver,
      'drop-top': dropZone === 'top',
      'drop-middle': dropZone === 'middle',
      'drop-bottom': dropZone === 'bottom'
    }"
  >
    <div 
      class="node-content" 
    >
      <div class="markers-container" v-if="nodeMarkers.length > 0">
        <span 
          v-for="marker in nodeMarkers" 
          :key="marker.id" 
          class="marker-badge"
          :style="{ backgroundColor: marker.color }"
          :title="marker.label"
          @contextmenu="onMarkerRightClick($event, marker.groupId)"
        >
          <span v-if="marker.icon" class="marker-text">{{ marker.icon }}</span>
        </span>
      </div>
      <span 
        ref="textRef"
        class="node-text"
        :contenteditable="isEditing"
        @blur="updateText"
      >{{ node.text }}</span>
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
  
  <!-- Marker Context Menu (teleported to body) -->
  <Teleport to="body">
    <div 
      v-if="showMarkerMenu" 
      class="marker-context-menu"
      :style="{ left: `${markerMenuPosition.x}px`, top: `${markerMenuPosition.y}px` }"
      @click.stop
    >
      <button @click="deleteMarker" class="menu-item">마커 삭제</button>
    </div>
  </Teleport>
</template>

<style scoped>
.mind-map-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  /* We use absolute positioning calculated by layout */
  width: auto;
  max-width: 400px; /* Max width as requested */
  min-width: 150px; /* Keep a minimum width */
  outline: none; /* Manage focus style manually via selected class */
}

.node-content {
  background: var(--node-bg);
  color: var(--text-color);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 8px;
  min-height: 20px;
  width: 100%;
  text-align: center;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  user-select: none; /* Prevent text selection when dragging/clicking */
  white-space: pre-wrap; /* Allow wrapping */
  word-break: break-word; /* Break long words */
  display: flex;
  align-items: center;
  justify-content: center;
}

.mind-map-node.selected .node-content {
    border-color: #646cff;
    border-width: 2px;
}

.node-text {
  outline: none;
  flex: 1;
}

.node-text[contenteditable="true"] {
  cursor: text;
  user-select: text;
}



button {
  padding: 2px 6px;
  font-size: 12px;
  cursor: pointer;
}

.toggle-btn {
  position: absolute;
  right: -30px; /* Adjust position based on design */
  top: 50%;
  transform: translateY(-50%);
  border-radius: 50%;
  width: 20px;
  height: 20px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
  background: var(--node-bg);
  color: var(--text-color);
  font-size: 14px;
  z-index: 10;
}

.markers-container {
  display: inline-flex;
  gap: 4px;
  margin-right: 6px;
  align-items: center;
}

.marker-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  font-size: 10px;
  font-weight: bold;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  flex-shrink: 0;
}

.marker-text {
  line-height: 1;
}

.marker-context-menu {
  position: fixed;
  background: var(--toolbar-bg);
  border-radius: 8px;
  padding: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 10000;
}

.menu-item {
  display: block;
  width: 100%;
  padding: 8px 12px;
  background: var(--button-bg);
  color: var(--text-color);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  text-align: left;
  white-space: nowrap;
  transition: background 0.2s;
}

.menu-item:hover {
  background: var(--button-hover);
}

/* Drag and Drop styles */
.mind-map-node.drag-over {
  opacity: 0.8;
}

.mind-map-node.drop-top::before,
.mind-map-node.drop-bottom::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 3px;
  background-color: #646cff;
  z-index: 1000;
}

.mind-map-node.drop-top::before {
  top: -2px;
}

.mind-map-node.drop-bottom::after {
  bottom: -2px;
}

.mind-map-node.drop-middle .node-content {
  outline: 2px solid #646cff;
  outline-offset: 2px;
  background-color: rgba(100, 108, 255, 0.1);
}

</style>
