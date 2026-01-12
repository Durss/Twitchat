<template>
  <component
    :is="tag"
    ref="elementRef"
    :contenteditable="computedContentEditableValue"
    :class="$attrs['class']"
    @input="update(false)"
    @blur="update(true)"
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

const props = withDefaults(defineProps<{
  tag: string
  noHtml?: boolean
  noNl?: boolean
  modelValue?: string|number
  numeric?: boolean
  float?: boolean
  min?:number,
  max?:number,
  maxLength?:number,
  contenteditable?: boolean
}>(),
{
  tag: 'div',
  noHtml: false,
  noNl: false,
  numeric: false,
  float: false,
  min: Number.NEGATIVE_INFINITY,
  max: Number.POSITIVE_INFINITY,
  maxLength: undefined,
  contenteditable: true,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string|number): void
  (e: 'returned', value: string|number): void
}>()

const computedContentEditableValue = computed(() => {
  if (!props.contenteditable) return false
  return props.noHtml ? 'plaintext-only' : true
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
    return props.numeric? 0 : ''
  }
  let content:string|number = props.noHtml || props.numeric != false ? elementRef$.value.innerText : elementRef$.value.innerHTML
  if(props.numeric != false) {
    content = parseFloat(content.replace(",", "."));
    if(props.float === false) {
      content = Math.floor(content);
    }
  }
  return content
}

function updateContent(newcontent: string | number) {
  if(props.numeric != false && typeof newcontent === 'string') {
    newcontent = parseFloat(newcontent.replace(",", "."));
    if(props.float === false) {
      newcontent = Math.floor(newcontent);
    }
  }
  if(typeof newcontent === 'number') {
    newcontent = Math.min(props.max, Math.max(props.min, newcontent));
    if(isNaN(newcontent)) newcontent = 0;
    newcontent = newcontent.toString();
  }
  if (props.noHtml || props.numeric != false) {
    elementRef$.value!.innerText = newcontent
  } else {
    elementRef$.value!.innerHTML = newcontent
  }
}

function update(isBlurEvent: boolean) {
  if(isBlurEvent) updateContent(currentContent());
  emit('update:modelValue', currentContent())
}

function onKeypress(event: KeyboardEvent) {
  if (event.key == 'Enter' && props.noNl) {
    event.preventDefault()
    emit('returned', currentContent())
  }
  if(props.numeric != false) {
    if(props.min < 0) {
      // Allow minus sign only at the start for numeric values
      const caretPos = window.getSelection()?.getRangeAt(0).startOffset ?? 0;
      if(event.key == '-' && caretPos == 0) {
        return;
      }

      // Allow comma or dot for float values only if not already present
      if((event.key == '.' || event.key == ',')
      && props.float !== false
      && !/,|\./g.test(currentContent().toString())) {
        return;
      }
    }
    if(!/[\d]/.test(event.key)) {
      event.preventDefault();
    }
  }
}

onMounted(() => {
  updateContent(props.modelValue ?? '')
})

watch(
  () => props.modelValue,
  (newval, oldval) => {
    if (newval != currentContent()) {
      updateContent(newval ?? '')
    }
  }
)

watch(
  () => props.noHtml,
  (newval, oldval) => {
    updateContent(props.modelValue ?? '')
  }
)

watch(
  () => props.tag,
  (newval, oldval) => {
    updateContent(props.modelValue ?? '')
  },
  { flush: 'post' }
)
</script>
