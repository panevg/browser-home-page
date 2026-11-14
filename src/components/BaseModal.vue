<script setup>
// Backdrop + form. Clicking the backdrop closes the dialog; submitting the form emits `submit`.
defineEmits(['close', 'submit']);
</script>

<template>
  <div class="backdrop" @mousedown.self="$emit('close')">
    <form class="modal" @submit.prevent="$emit('submit')">
      <slot/>
    </form>
  </div>
</template>