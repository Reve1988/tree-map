<script setup lang="ts">
import { useMindMapStore } from '../stores/mindmap';
import { ref, onMounted, onUnmounted, computed } from 'vue';
import MarkerPicker from './MarkerPicker.vue';

const store = useMindMapStore();
const toolbarRef = ref<HTMLElement | null>(null);

type ThemeMode = 'light' | 'dark' | 'auto';
const themeMode = ref<ThemeMode>('auto');
const showThemePicker = ref(false);

function selectTheme(mode: ThemeMode) {
  themeMode.value = mode;
  showThemePicker.value = false;
  updateTheme();
}

function updateTheme() {
  const root = document.documentElement;
  let actualTheme: 'light' | 'dark';

  if (themeMode.value === 'auto') {
    // Follow system preference
    actualTheme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    localStorage.setItem('theme', 'auto');
  } else {
    actualTheme = themeMode.value;
    localStorage.setItem('theme', themeMode.value);
  }

  if (actualTheme === 'light') {
    root.classList.add('light-mode');
  } else {
    root.classList.remove('light-mode');
  }
}

let mediaQuery: MediaQueryList | null = null;
let mediaQueryListener: ((e: MediaQueryListEvent) => void) | null = null;

onMounted(() => {
  const savedTheme = localStorage.getItem('theme') as ThemeMode | null;
  if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
    themeMode.value = savedTheme;
  } else {
    themeMode.value = 'auto';
  }
  
  updateTheme();

  // Listen to system theme changes
  mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
  mediaQueryListener = () => {
    if (themeMode.value === 'auto') {
      updateTheme();
    }
  };
  mediaQuery.addEventListener('change', mediaQueryListener);

  // Close marker picker on outside click
  document.addEventListener('click', handleOutsideClick);
});

onUnmounted(() => {
  if (mediaQuery && mediaQueryListener) {
    mediaQuery.removeEventListener('change', mediaQueryListener);
  }
  document.removeEventListener('click', handleOutsideClick);
});

function exportData() {
  const data = JSON.stringify(store.root, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mindmap.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importData(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string;
      const data = JSON.parse(content);
      // Basic validation: check if it has children array
      if (data && Array.isArray(data.children)) {
          store.root = data;
      } else {
        alert('Invalid MindMap JSON');
      }
    } catch (err) {
      alert('Failed to parse JSON');
    }
  };
  reader.readAsText(file);
}

function resetMap() {
    showResetModal.value = true;
}

function confirmReset() {
    store.reset();
    showResetModal.value = false;
}

function cancelReset() {
    showResetModal.value = false;
}

const showResetModal = ref(false);

// Marker picker state
const showMarkerPicker = ref(false);
const hasSelection = computed(() => store.selectedNodeIds.size > 0);

function toggleMarkerPicker() {
  if (!hasSelection.value) return;
  showMarkerPicker.value = !showMarkerPicker.value;
}

function handleOutsideClick(event: MouseEvent) {
  if (!toolbarRef.value || !showMarkerPicker.value) return;
  if (!toolbarRef.value.contains(event.target as Node)) {
    showMarkerPicker.value = false;
  }
}

function handleMarkerSelect(groupId: string, markerId: string) {
  const selectedIds = Array.from(store.selectedNodeIds);
  store.addMarkerToNodes(selectedIds, groupId, markerId);
  showMarkerPicker.value = false;
}

const emit = defineEmits<{
  (e: 'convert'): void
}>();
</script>

<template>
  <div class="toolbar" ref="toolbarRef">
    <!-- Marker Button -->
    <div class="marker-button-container">
      <button 
        @click="toggleMarkerPicker" 
        class="marker-btn"
        :class="{ disabled: !hasSelection }"
        :disabled="!hasSelection"
        title="마커 추가"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      </button>
    </div>
    <button @click="resetMap" title="새 파일">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="12" y1="18" x2="12" y2="12"/>
        <line x1="9" y1="15" x2="15" y2="15"/>
      </svg>
    </button>
    <button @click="exportData" title="다운로드">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
    </button>
    <label class="file-btn" title="업로드">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      <input type="file" accept=".json" @change="importData" hidden />
    </label>
    <!-- Theme Picker -->
    <div class="theme-picker-container">
      <button @click="showThemePicker = !showThemePicker" class="theme-toggle" title="테마 선택">
        <!-- Sun icon for light mode -->
        <svg v-if="themeMode === 'light'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
        <!-- Moon icon for dark mode -->
        <svg v-else-if="themeMode === 'dark'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
        <!-- Auto icon (monitor) for system sync -->
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
      </button>
    </div>
    
    <!-- Marker Picker below toolbar -->
    <MarkerPicker :show="showMarkerPicker" @selectMarker="handleMarkerSelect" />
  </div>
  
  <!-- Theme Dropdown (same level as toolbar) -->
  <div v-if="showThemePicker" class="theme-dropdown">
    <button @click="selectTheme('light')" :class="{ active: themeMode === 'light' }" title="라이트 모드">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="5"/>
        <line x1="12" y1="1" x2="12" y2="3"/>
        <line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/>
        <line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>
    </button>
    <button @click="selectTheme('dark')" :class="{ active: themeMode === 'dark' }" title="다크 모드">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
      </svg>
    </button>
    <button @click="selectTheme('auto')" :class="{ active: themeMode === 'auto' }" title="시스템 설정">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    </button>
  </div>
  
  <!-- Reset Confirm Modal -->
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="showResetModal" class="modal-overlay" @click="cancelReset">
        <div class="modal-content" @click.stop>
          <div class="modal-icon warning">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h3 class="modal-title">새 파일 만들기</h3>
          <p class="modal-message">
            현재 작업 중인 마인드맵이 초기화됩니다.<br/>
            저장하지 않은 내용은 복구할 수 없습니다.<br/>
            계속 진행하시겠습니까?
          </p>
          <div class="modal-actions">
            <button class="modal-btn modal-cancel" @click="cancelReset">취소</button>
            <button class="modal-btn modal-confirm" @click="confirmReset">초기화</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.toolbar {
  position: fixed;
  top: 10px;
  right: 10px;
  background: var(--toolbar-bg);
  padding: 8px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  display: flex;
  gap: 8px;
  z-index: 100;
}

button, .file-btn {
  padding: 6px 8px;
  background: var(--button-bg);
  color: var(--text-color);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-family: inherit;
  transition: background 0.3s;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 8px;
  min-width: 36px;
}

.theme-toggle svg {
  display: block;
}

button:hover, .file-btn:hover {
  background: var(--button-hover);
}

.marker-button-container {
  position: relative;
  display: flex;
}

.marker-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.marker-btn.disabled:hover {
  background: var(--button-bg);
}

.theme-picker-container {
  position: relative;
  display: flex;
}

.theme-dropdown {
  position: fixed;
  top: 70px;
  right: 10px;
  background: var(--toolbar-bg);
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 8px;
  display: flex;
  gap: 8px;
  z-index: 100;
}

.theme-dropdown button {
  border: none;
}

.theme-dropdown button.active {
  background: var(--button-hover);
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal-content {
  background: var(--toolbar-bg);
  color: var(--text-color);
  border-radius: 16px;
  padding: 32px;
  width: 320px;
  max-width: 90vw;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  border: 1px solid var(--border-color);
}

.modal-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.modal-icon.warning {
  background: rgba(244, 67, 54, 0.1);
  color: #f44336;
}

.modal-title {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-color);
}

.modal-message {
  margin: 0 0 24px 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-color);
  opacity: 0.8;
}

.modal-actions {
  display: flex;
  gap: 12px;
  width: 100%;
}

.modal-btn {
  flex: 1;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  height: auto;
  width: auto;
}

.modal-cancel {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-color);
}

.modal-cancel:hover {
  background: var(--button-bg);
}

.modal-confirm {
  background: #f44336;
  border: none;
  color: white;
  box-shadow: 0 2px 8px rgba(244, 67, 54, 0.3);
}

.modal-confirm:hover {
  background: #d32f2f;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(244, 67, 54, 0.4);
}

/* Modal Transition */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .modal-content {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-fade-leave-active .modal-content {
  transition: all 0.2s ease-in;
}

.modal-fade-enter-from .modal-content,
.modal-fade-leave-to .modal-content {
  transform: scale(0.9);
  opacity: 0;
}
</style>
