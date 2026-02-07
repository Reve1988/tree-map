<script setup lang="ts">
import { computed, ref, nextTick, watch, onMounted, onUnmounted } from 'vue';
import { useMediaQuery } from '@vueuse/core';
import type { MindMapNode } from '../types/mindmap';
import { useMindMapStore } from '../stores/mindmap';
import { getMarkerById } from '../types/markers';
import { resizeImage } from '../utils/imageUtils';

// Detect touch device
const isTouchDevice = useMediaQuery('(pointer: coarse)');

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

// Node context menu uses store.nodeContextMenu for global state

// Image upload
const imageInputRef = ref<HTMLInputElement | null>(null);

// Image zoom modal
const showImageModal = ref(false);

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
  
  // If this node is being dragged over (for touch), show visual feedback
  if (newVal === props.node.id) {
    isDragOver.value = true;
    dropZone.value = store.touchDropZone;
  }
});

// Watch touchDropZone to update visual feedback during touch drag
watch(() => store.touchDropZone, (newVal) => {
  if (store.dragOverNodeId === props.node.id) {
    dropZone.value = newVal;
  }
});

function selectNode(e: MouseEvent) {
   // Prevent bubbling so container doesn't deselect
   e.stopPropagation();
   // Close any open menus
   closeNodeMenu();
   closeMarkerMenu();
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
      if (e.key === 'Enter' && e.shiftKey) {
          // Shift+Enter: allow line break (default contenteditable behavior)
          return;
      } else if (e.key === 'Enter') {
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

// Node context menu handlers
function onNodeRightClick(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
  
  // On touch devices, context menu is handled by long press timer with accurate touch coordinates
  if (isTouchDevice.value) return;
  
  store.nodeContextMenu = { nodeId: props.node.id, x: e.clientX, y: e.clientY };
}

function closeNodeMenu() {
  store.nodeContextMenu = { nodeId: null, x: 0, y: 0 };
}

function deleteNodeFromMenu() {
  if (props.node.id !== 'root') {
    store.deleteNode(props.node.id);
  }
  closeNodeMenu();
}

// ===== Touch Event Handlers =====
const touchStartTime = ref(0);
const touchStartPos = ref({ x: 0, y: 0 });
const longPressTimer = ref<ReturnType<typeof setTimeout> | null>(null);
const isLongPressing = ref(false);
const isTouchDragging = ref(false);
const lastDoubleTapTime = ref(0);
const markerLongPressTimer = ref<ReturnType<typeof setTimeout> | null>(null);

const CONTEXT_MENU_DURATION = 500; // ms - long press for context menu
const LONG_PRESS_DURATION = 800; // ms - longer press for drag
const DOUBLE_TAP_DELAY = 300; // ms
const DRAG_THRESHOLD = 10; // pixels

// Separate timer for context menu on touch
const contextMenuTimer = ref<ReturnType<typeof setTimeout> | null>(null);
const touchContextPos = ref({ x: 0, y: 0 });

function onNodeTouchStart(e: TouchEvent) {
  if (isEditing.value) return;
  
  // Allow 2-finger gestures to propagate to container for pinch zoom
  if (e.touches.length >= 2) {
    return; // Let container handle pinch zoom
  }
  
  const touch = e.touches[0];
  if (!touch) return;
  
  e.stopPropagation();
  
  touchStartTime.value = Date.now();
  touchStartPos.value = { x: touch.clientX, y: touch.clientY };
  touchContextPos.value = { x: touch.clientX, y: touch.clientY };
  isLongPressing.value = false;
  isTouchDragging.value = false;
  
  // Stage 1: Context menu after 500ms
  contextMenuTimer.value = setTimeout(() => {
    // Show context menu at touch position
    store.nodeContextMenu = { nodeId: props.node.id, x: touchContextPos.value.x, y: touchContextPos.value.y };
    isLongPressing.value = true;
    
    // Cancel drag timer since we showed context menu
    if (longPressTimer.value) {
      clearTimeout(longPressTimer.value);
      longPressTimer.value = null;
    }
  }, CONTEXT_MENU_DURATION);
  
  // Stage 2: Drag after 800ms (only if context menu wasn't shown)
  longPressTimer.value = setTimeout(() => {
    // Cancel context menu timer if drag starts first
    if (contextMenuTimer.value) {
      clearTimeout(contextMenuTimer.value);
      contextMenuTimer.value = null;
    }
    // Close context menu if it was opened
    store.nodeContextMenu = { nodeId: null, x: 0, y: 0 };
    
    isLongPressing.value = true;
    isTouchDragging.value = true;
    store.draggingNodeId = props.node.id;
    
    // Visual feedback
    if (nodeRef.value) {
      nodeRef.value.style.opacity = '0.5';
    }
  }, LONG_PRESS_DURATION);
}

function onNodeTouchMove(e: TouchEvent) {
  // Allow 2-finger gestures to propagate to container for pinch zoom
  if (e.touches.length >= 2) {
    // Cancel all timers if we switched to 2 fingers
    if (longPressTimer.value) {
      clearTimeout(longPressTimer.value);
      longPressTimer.value = null;
    }
    if (contextMenuTimer.value) {
      clearTimeout(contextMenuTimer.value);
      contextMenuTimer.value = null;
    }
    return; // Let container handle pinch zoom
  }
  
  const touch = e.touches[0];
  if (!touch) return;
  
  const dx = touch.clientX - touchStartPos.value.x;
  const dy = touch.clientY - touchStartPos.value.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // If moved beyond threshold before long press, cancel all timers
  if (distance > DRAG_THRESHOLD && !isLongPressing.value) {
    if (longPressTimer.value) {
      clearTimeout(longPressTimer.value);
      longPressTimer.value = null;
    }
    if (contextMenuTimer.value) {
      clearTimeout(contextMenuTimer.value);
      contextMenuTimer.value = null;
    }
    return;
  }
  
  // If long pressing and dragging, handle drop zone detection
  if (isTouchDragging.value) {
    e.preventDefault();
    e.stopPropagation();
    
    // Find element under touch point
    const elemUnder = document.elementFromPoint(touch.clientX, touch.clientY);
    const nodeUnder = elemUnder?.closest('.mind-map-node') as HTMLElement | null;
    
    if (nodeUnder && nodeUnder !== nodeRef.value) {
      const targetId = nodeUnder.getAttribute('data-node-id');
      if (targetId && targetId !== props.node.id && store.canMoveNode(props.node.id, targetId)) {
        store.dragOverNodeId = targetId;
        
        // Calculate drop zone based on touch position relative to target node
        const rect = nodeUnder.getBoundingClientRect();
        const y = touch.clientY - rect.top;
        const height = rect.height;
        
        if (y < height * 0.25) {
          store.touchDropZone = 'top';
        } else if (y > height * 0.75) {
          store.touchDropZone = 'bottom';
        } else {
          store.touchDropZone = 'middle';
        }
      }
    } else {
      store.dragOverNodeId = null;
      store.touchDropZone = null;
    }
  }
}

function onNodeTouchEnd() {
  // Clear all timers
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value);
    longPressTimer.value = null;
  }
  if (contextMenuTimer.value) {
    clearTimeout(contextMenuTimer.value);
    contextMenuTimer.value = null;
  }
  
  const touchDuration = Date.now() - touchStartTime.value;
  const now = Date.now();
  
  // Restore opacity
  if (nodeRef.value) {
    nodeRef.value.style.opacity = '1';
  }
  
  // Handle long press drag end
  if (isTouchDragging.value) {
    const targetId = store.dragOverNodeId;
    const currentDropZone = store.touchDropZone;
    
    if (targetId && targetId !== props.node.id) {
      // Handle the drop based on drop zone
      // Use multi-node functions to move all selected nodes together
      if (currentDropZone === 'middle') {
        store.moveSelectedNodesToParent(props.node.id, targetId);
      } else if (currentDropZone === 'top') {
        store.reorderSelectedNodes(props.node.id, targetId, true);
      } else if (currentDropZone === 'bottom') {
        store.reorderSelectedNodes(props.node.id, targetId, false);
      }
    }
    
    store.draggingNodeId = null;
    store.dragOverNodeId = null;
    store.touchDropZone = null;
    isTouchDragging.value = false;
    isLongPressing.value = false;
    return;
  }
  
  // Handle tap vs double tap (only if it was a quick tap)
  if (touchDuration < CONTEXT_MENU_DURATION && !isLongPressing.value) {
    if (now - lastDoubleTapTime.value < DOUBLE_TAP_DELAY) {
      // Double tap -> edit
      lastDoubleTapTime.value = 0;
      startEditing();
    } else {
      // Single tap -> select
      lastDoubleTapTime.value = now;
      store.selectNode(props.node.id, false);
    }
  }
  
  isLongPressing.value = false;
  isTouchDragging.value = false;
}

function onMarkerTouchStart(e: TouchEvent, groupId: string) {
  const touch = e.touches[0];
  if (!touch) return;
  
  e.stopPropagation();
  
  // Start long press timer for marker menu
  markerLongPressTimer.value = setTimeout(() => {
    selectedMarkerGroupId.value = groupId;
    markerMenuPosition.value = { x: touch.clientX, y: touch.clientY };
    showMarkerMenu.value = true;
  }, LONG_PRESS_DURATION);
}

function onMarkerTouchEnd() {
  if (markerLongPressTimer.value) {
    clearTimeout(markerLongPressTimer.value);
    markerLongPressTimer.value = null;
  }
}

function onMarkerTouchMove() {
  // Cancel long press if moved
  if (markerLongPressTimer.value) {
    clearTimeout(markerLongPressTimer.value);
    markerLongPressTimer.value = null;
  }
}

// Image attachment handlers
function attachImage() {
  imageInputRef.value?.click();
}

async function handleImageSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  
  if (!file) return;
  
  // Check if file is an image
  if (!file.type.startsWith('image/')) {
    alert('Please select an image file');
    return;
  }
  
  try {
    const base64Image = await resizeImage(file, 1000, 0.8);
    props.node.image = base64Image;
    // Clear input to allow selecting the same file again
    input.value = '';
    
    // Trigger layout recalculation after image is added
    await nextTick();
    // Force update by touching the node to trigger reactivity
    store.updateNodeSize(props.node.id, props.node.width || 300, props.node.height || 40);
  } catch (error) {
    console.error('Failed to process image:', error);
    alert('Failed to load image. Please try again.');
  }
}

async function removeImage() {
  props.node.image = undefined;
  closeNodeMenu();
  
  // Trigger layout recalculation after image is removed
  await nextTick();
  store.updateNodeSize(props.node.id, props.node.width || 300, props.node.height || 40);
}

function openImageModal() {
  showImageModal.value = true;
}

function closeImageModal() {
  showImageModal.value = false;
}

// Close menus on click outside
onMounted(() => {
  document.addEventListener('click', closeMarkerMenu);
  document.addEventListener('click', closeNodeMenu);
});

onUnmounted(() => {
  document.removeEventListener('click', closeMarkerMenu);
  document.removeEventListener('click', closeNodeMenu);
  if (longPressTimer.value) clearTimeout(longPressTimer.value);
  if (markerLongPressTimer.value) clearTimeout(markerLongPressTimer.value);
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
  // Use multi-node functions to move all selected nodes together
  if (dropZone.value === 'middle') {
    // Drop in the middle: make them children
    store.moveSelectedNodesToParent(draggedNodeId, props.node.id);
  } else if (dropZone.value === 'top') {
    // Drop on top: insert before this node (as siblings)
    store.reorderSelectedNodes(draggedNodeId, props.node.id, true);
  } else if (dropZone.value === 'bottom') {
    // Drop on bottom: insert after this node (as siblings)
    store.reorderSelectedNodes(draggedNodeId, props.node.id, false);
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
    :data-node-id="node.id"
    @click="selectNode"
    @dblclick="startEditing"
    @keydown="onKeyDown"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
    @touchstart="onNodeTouchStart"
    @touchmove="onNodeTouchMove"
    @touchend="onNodeTouchEnd"
    @contextmenu="onNodeRightClick"
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
      <!-- Text and markers row -->
      <div class="text-row">
        <div class="markers-container" v-if="nodeMarkers.length > 0">
          <span 
            v-for="marker in nodeMarkers" 
            :key="marker.id" 
            class="marker-badge"
            :style="{ backgroundColor: marker.color }"
            :title="marker.label"
            @contextmenu="onMarkerRightClick($event, marker.groupId)"
            @touchstart="onMarkerTouchStart($event, marker.groupId)"
            @touchmove="onMarkerTouchMove"
            @touchend="onMarkerTouchEnd"
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
      
      <!-- Image preview -->
      <div v-if="node.image" class="node-image" @click.stop="openImageModal">
        <img :src="node.image" alt="Node image" />
      </div>
    </div>
    
    <!-- Hidden file input for image upload -->
    <input 
      ref="imageInputRef"
      type="file"
      accept="image/*"
      style="display: none"
      @change="handleImageSelect"
    />
    


    <button 
      v-if="node.children.length > 0" 
      class="toggle-btn"
      @click.stop="store.toggleCollapse(node.id)"
      @touchend.stop.prevent="store.toggleCollapse(node.id)"
      @mousedown.stop
    >
      {{ node.isCollapsed ? '+' : '-' }}
    </button>

    <!-- Mobile action buttons (touch devices only) -->
    <template v-if="isTouchDevice && isSelected && !isEditing && store.selectedNodeIds.size === 1">
      <!-- Add child -->
      <button 
        class="mobile-action-btn mobile-action-right"
        @click.stop="store.addChild(node.id)"
        @touchstart.stop
        @touchend.stop.prevent="store.addChild(node.id)"
        title="자식 노드 추가"
      >+</button>
      
      <!-- Add sibling below -->
      <button 
        v-if="node.id !== 'root'"
        class="mobile-action-btn mobile-action-bottom"
        @click.stop="store.addSibling(node.id)"
        @touchstart.stop
        @touchend.stop.prevent="store.addSibling(node.id)"
        title="형제 노드 추가"
      >+</button>
    </template>

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
  
  <!-- Node Context Menu (teleported to body) -->
  <Teleport to="body">
    <div 
      v-if="store.nodeContextMenu.nodeId === node.id" 
      class="node-context-menu"
      :style="{ left: `${store.nodeContextMenu.x}px`, top: `${store.nodeContextMenu.y}px` }"
      @click.stop
    >
      <button @click="attachImage" class="menu-item">이미지 첨부</button>
      <button v-if="node.image" @click="removeImage" class="menu-item">이미지 삭제</button>
      <button v-if="node.id !== 'root'" @click="deleteNodeFromMenu" class="menu-item delete-item">노드 삭제</button>
      <button v-else @click="closeNodeMenu" class="menu-item" disabled>루트 노드는 삭제할 수 없습니다</button>
    </div>
  </Teleport>
  
  <!-- Image Zoom Modal (teleported to body) -->
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="showImageModal" class="image-modal-overlay" @click="closeImageModal">
        <div class="image-modal-content" @click.stop>
          <button class="image-modal-close" @click="closeImageModal">×</button>
          <img :src="node.image" alt="Node image" class="image-modal-img" />
        </div>
      </div>
    </Transition>
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
  flex-direction: column; /* Stack text and image vertically */
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

/* Text row: contains markers and text in horizontal layout */
.text-row {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
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
  background: var(--node-bg, white);
  border: 1px solid var(--border-color, #ccc);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10000;
  min-width: 120px;
  padding: 4px 0;
}

.marker-context-menu .menu-item {
  background: transparent;
  padding: 10px 16px;
  border-radius: 0;
}

.marker-context-menu .menu-item:hover {
  background: rgba(0, 0, 0, 0.05);
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

/* Node Context Menu */
.node-context-menu {
  position: fixed;
  background: var(--node-bg, white);
  border: 1px solid var(--border-color, #ccc);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  min-width: 120px;
  padding: 4px 0;
}

.node-context-menu .menu-item {
  display: block;
  width: 100%;
  padding: 10px 16px;
  border: none;
  background: transparent;
  color: var(--text-color, #333);
  text-align: left;
  cursor: pointer;
  font-size: 14px;
}

.node-context-menu .menu-item:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.05);
}

.node-context-menu .menu-item:disabled {
  color: #999;
  cursor: not-allowed;
}

.node-context-menu .delete-item {
  color: #f44336;
}

.node-context-menu .delete-item:hover {
  background: rgba(244, 67, 54, 0.1);
}

/* Mobile action buttons */
.mobile-action-btn {
  position: absolute;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid #646cff;
  background: var(--node-bg, white);
  color: #646cff;
  font-size: 16px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 15;
  touch-action: manipulation;
}

.mobile-action-btn:active {
  background: #646cff;
  color: white;
}

.mobile-action-top {
  top: -40px;
  left: 50%;
  transform: translateX(-50%);
}

.mobile-action-right {
  right: -10px;
  top: 50%;
  transform: translate(100%, -50%);
}

.mobile-action-bottom {
  bottom: 0;
  left: 50%;
  transform: translate(-50%, 100%);
}

/* Node Image Preview */
.node-image {
  margin-top: 8px;
  width: auto;
  max-width: 300px;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
}

.node-image img {
  width: 100%;
  height: auto;
  display: block;
  object-fit: contain;
}

/* Image Zoom Modal */
.image-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.image-modal-content {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-modal-img {
  max-width: 100%;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.image-modal-close {
  position: absolute;
  top: -40px;
  right: 0;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.image-modal-close:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Modal fade transition */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

</style>
