<script setup lang="ts">
import { useBroadcastChannel } from '@vueuse/core'
import { shallowRef, watch } from 'vue'

const {
  isSupported,
  data,
  post,
  error,
} = useBroadcastChannel({ name: 'vueuse-demo-channel' })

const message = shallowRef('')

watch(data, () => {
  if (data.value)
    alert(data.value)
})
</script>

<template>
  <div>
    <p>
      Supported:
      <b>{{ isSupported }}</b>
    </p>

    <p>Please open this page in at least two tabs</p>
  </div>

  <div v-if="isSupported">
    <form @submit.prevent="post(message)">
      <input v-model="message" type="text">
      <button type="submit">
        Send Message
      </button>
    </form>

    <p v-if="data">
      received: {{ data }}
    </p>

    <p v-if="error">
      error: {{ error }}
    </p>
  </div>
  <div v-else>
    Aww, snap! The Broadcast Channel Web API is not supported in your browser.
  </div>
</template>
