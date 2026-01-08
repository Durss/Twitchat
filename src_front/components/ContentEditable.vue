<template>
  <component
    :is="tag"
    ref="elementRef"
    :contenteditable="computedContentEditableValue"
    @input="update"
    @blur="update"
    @keypress="onKeypress"
  ></component>
</template>

<script setup lang="ts">
/**
 * Extracted from the following inactive repository while fixing an issue
 * that emits warnings on the console:
 * https://github.com/hl037/vue-contenteditable
 */
import { computed, onMounted, useTemplateRef, watch } from 'vue'

const {
  tag,
  noHtml = true,
  noNl = false,
  modelValue = '',
  contenteditable = true,
} = defineProps<{
  tag: string
  noHtml?: boolean
  noNl?: boolean
  modelValue?: string
  contenteditable?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'returned', value: string): void
}>()

const computedContentEditableValue = computed(() => {
  if (!contenteditable) return false
  return noHtml ? 'plaintext-only' : true
})

const elementRef$ = useTemplateRef<HTMLElement>('elementRef')

function focus() {
  elementRef$.value?.focus()
}

function moveCaretTo(position: number) {
  if (elementRef$.value) {
    const range = document.createRange()
    const sel = window.getSelection()
    const nodes = elementRef$.value.childNodes
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      if (node instanceof Text) {
        if (node.length >= position) {
          range.setStart(node, position)
          break
        } else {
          position -= node.length
        }
      } else {
        position--
      }
    }
    range.collapse(true)
    sel?.removeAllRanges()
    sel?.addRange(range)
  }
}
defineExpose({
  focus,
  moveCaretTo,
})

function currentContent() {
  if (elementRef$.value == null) {
    return ''
  }
  return noHtml ? elementRef$.value.innerText : elementRef$.value.innerHTML
}

function updateContent(newcontent: string) {
  if (noHtml) {
    elementRef$.value!.innerText = newcontent
  } else {
    elementRef$.value!.innerHTML = newcontent
  }
}

function update() {
  emit('update:modelValue', currentContent())
}

function onKeypress(event: KeyboardEvent) {
  if (event.key == 'Enter' && noNl) {
    event.preventDefault()
    emit('returned', currentContent())
  }
}

onMounted(() => {
  updateContent(modelValue ?? '')
})

watch(
  () => modelValue,
  (newval, oldval) => {
    if (newval != currentContent()) {
      updateContent(newval ?? '')
    }
  }
)

watch(
  () => noHtml,
  (newval, oldval) => {
    updateContent(modelValue ?? '')
  }
)

watch(
  () => tag,
  (newval, oldval) => {
    updateContent(modelValue ?? '')
  },
  { flush: 'post' }
)
</script>
