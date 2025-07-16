<script lang="ts">
import CommonButton from '$lib/components/CommonButton.svelte'
import CommonInput from '$lib/components/CommonInput.svelte'
import { validateDisplayName } from '@grabstream/core'
import { onDestroy, onMount } from 'svelte'
import type { Action } from 'svelte/action'

type Props = {
  roomId: string
  onJoin: (values: {
    displayName: string
    password?: string
    mediaStream?: MediaStream
  }) => void
}

let { roomId, onJoin }: Props = $props()

let displayName = $state('')
let password = $state('')
let mediaStream = $state<MediaStream>()
let mediaDevices = $state<MediaDeviceInfo[]>([])

let videoOptions = $derived(
  mediaDevices
    .filter((device) => device.kind === 'videoinput')
    .map((device) => ({
      id: device.deviceId,
      label: device.label || `Unknown Video Device (${device.deviceId})`,
      selected: mediaStream
        ?.getTracks()
        .some(
          (track) =>
            track.kind === 'video' &&
            track.getSettings().deviceId === device.deviceId
        )
    }))
)

let audioOptions = $derived(
  mediaDevices
    .filter((device) => device.kind === 'audioinput')
    .map((device) => ({
      id: device.deviceId,
      label: device.label || `Unknown Audio Device (${device.deviceId})`,
      selected: mediaStream
        ?.getTracks()
        .some(
          (track) =>
            track.kind === 'audio' &&
            track.getSettings().deviceId === device.deviceId
        )
    }))
)

let isJoining = false

const srcObject: Action<HTMLVideoElement, () => MediaStream | undefined> = (
  node,
  streamEffect
) => {
  $effect(() => {
    node.srcObject = streamEffect() ?? null
    return () => {
      node.srcObject = null
    }
  })
}

const getMediaStream = async ({
  audioId,
  videoId
}: {
  audioId?: string
  videoId?: string
} = {}) => {
  return await navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: audioId ? { exact: audioId } : undefined
    },
    video: {
      deviceId: videoId ? { exact: videoId } : undefined,
      frameRate: { max: 30 },
      width: { ideal: 640 },
      height: { ideal: 480 }
    }
  })
}

const join = () => {
  const trimmedDisplayName = displayName.trim()
  const validateDisplayNameResult = validateDisplayName(trimmedDisplayName)

  if (!validateDisplayNameResult.success) {
    alert(validateDisplayNameResult.error)
    return
  }

  onJoin({
    displayName: trimmedDisplayName,
    password: password || undefined,
    mediaStream: mediaStream
  })
  isJoining = true
}

onMount(async () => {
  try {
    mediaDevices = await navigator.mediaDevices.enumerateDevices()
    mediaStream = await getMediaStream()
  } catch (error) {
    alert(
      `Failed to get media stream: ${error instanceof Error ? error.message : String(error)}`
    )
  }
})

onDestroy(() => {
  if (!isJoining && mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop())
    mediaStream = undefined
  }
})
</script>

<div class="idle-room">
  <p class="fs-2xl mb-md">Room ID: {roomId}</p>
  <!-- TODO: password -->
  <div class="d-flex flex-column md:flex-row g-md mb-md">
    <video
      autoplay
      muted
      playsinline
      use:srcObject={() => mediaStream}
    ></video>
    <div class="d-flex flex-column g-xs md:g-sm">
      <select name="videoId" id="videoId">
        {#each videoOptions as { id, label, selected }}
          <option value={id} {selected}>{label}</option>
        {/each}
      </select>
      <select name="audioId" id="audioId">
        {#each audioOptions as { id, label, selected }}
          <option value={id} {selected}>{label}</option>
        {/each}
      </select>
    </div>
  </div>
  <CommonInput
    type="text"
    id="displayName"
    name="displayName"
    placeholder="Display Name"
    bind:value={displayName}
  />
  <div class="btn-wrapper">
    <CommonButton variant="primary" onclick={join}>Join</CommonButton>
  </div>
</div>

<style lang="scss">
  .idle-room {
    width: 100%;
    max-width: 800px;
    padding: 10px 20px;
    background-color: var(--color-background);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius-md);
    box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.1),
                0px 8px 16px rgba(0, 0, 0, 0.1);

    video {
      width: 100%;
      max-width: 400px;
      height: auto;
      transform: scaleX(-1);
      border-radius: var(--border-radius-md);
    }
  }

  .btn-wrapper {
    margin: 20px 0 0 auto;
    width: 100px;
  }
</style>
