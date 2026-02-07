<script setup lang="ts">
import { ref, computed } from 'vue';
import { useMediaQuery } from '@vueuse/core';

const show = ref(false);
const isMobile = useMediaQuery('(pointer: coarse)');

const pcGuide = [
  { icon: '🖱️', title: '기본 조작', items: [
    '좌클릭: 노드 선택',
    '더블클릭: 노드 텍스트 편집',
    '우클릭 드래그: 캔버스 이동',
    '마우스 휠: 확대/축소',
  ]},
  { icon: '⌨️', title: '키보드 단축키', items: [
    'Tab: 자식 노드 추가',
    'Enter: 형제 노드 추가',
    'Delete: 노드 삭제',
    'Shift+Enter: 줄바꿈 (편집 중)',
    'Escape: 편집 취소',
    'Space: 선택한 노드 편집',
    '방향키: 노드 간 이동',
    'Ctrl+클릭: 다중 선택',
  ]},
  { icon: '📦', title: '드래그 & 선택', items: [
    '좌클릭 드래그 (배경): 범위 선택',
    '노드 드래그: 노드 이동/순서 변경',
  ]},
  { icon: '🔧', title: '도구', items: [
    '⭐ 마커 추가: 노드 선택 후 마커 버튼',
    '🔍 검색: 검색 버튼으로 노드 찾기',
    '📥 다운로드/📤 업로드: JSON 파일 관리',
  ]},
];

const mobileGuide = [
  { icon: '👆', title: '기본 조작', items: [
    '탭: 노드 선택',
    '더블탭: 노드 텍스트 편집',
    '한 손가락 드래그 (배경): 캔버스 이동',
    '두 손가락 핀치: 확대/축소',
  ]},
  { icon: '📦', title: '노드 관리', items: [
    '선택 후 + 버튼: 자식/형제 노드 추가',
    '길게 누르기 (0.5초): 우클릭 메뉴',
    '길게 누르기 (0.8초): 드래그로 노드 이동',
  ]},
  { icon: '✨', title: '다중 선택', items: [
    '배경 더블탭 + 드래그: 범위 선택',
  ]},
  { icon: '🔧', title: '도구', items: [
    '⭐ 마커 추가: 노드 선택 후 마커 버튼',
    '🔍 검색: 검색 버튼으로 노드 찾기',
    '📥 다운로드/📤 업로드: JSON 파일 관리',
  ]},
];

const guide = computed(() => isMobile.value ? mobileGuide : pcGuide);
const deviceLabel = computed(() => isMobile.value ? '모바일' : 'PC');
</script>

<template>
  <!-- Help Button -->
  <button class="help-btn" @click="show = true" title="사용 가이드">?</button>
  
  <!-- Guide Modal -->
  <Teleport to="body">
    <div v-if="show" class="guide-overlay" @click.self="show = false">
      <div class="guide-modal">
        <div class="guide-header">
          <h2>사용 가이드 <span class="device-badge">{{ deviceLabel }}</span></h2>
          <button class="close-btn" @click="show = false">✕</button>
        </div>
        <div class="guide-body">
          <div v-for="section in guide" :key="section.title" class="guide-section">
            <div class="section-title">{{ section.icon }} {{ section.title }}</div>
            <ul>
              <li v-for="item in section.items" :key="item">{{ item }}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.help-btn {
  position: fixed;
  bottom: 24px;
  right: 270px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--toolbar-bg);
  color: var(--text-color);
  border: none;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s, opacity 0.2s;
  opacity: 0.7;
}

.help-btn:hover {
  transform: scale(1.1);
  opacity: 1;
}

.guide-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 10000;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.guide-modal {
  width: 480px;
  max-width: 90vw;
  max-height: 80vh;
  background: var(--toolbar-bg);
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.guide-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color, #eee);
}

.guide-header h2 {
  margin: 0;
  font-size: 18px;
  color: var(--text-color);
  display: flex;
  align-items: center;
  gap: 8px;
}

.device-badge {
  font-size: 12px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
}

.close-btn {
  background: none;
  border: none;
  font-size: 18px;
  color: var(--text-color);
  opacity: 0.5;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}

.close-btn:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.05);
}

.guide-body {
  overflow-y: auto;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.guide-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-color);
}

ul {
  margin: 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

li {
  font-size: 13px;
  color: var(--text-color);
  opacity: 0.8;
  line-height: 1.5;
}
</style>
