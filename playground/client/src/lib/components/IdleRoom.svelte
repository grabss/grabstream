<script lang="ts">
import CommonButton from '$lib/components/CommonButton.svelte'
import CommonInput from '$lib/components/CommonInput.svelte'
import { validateDisplayName } from '@grabstream/core'
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
  mediaDevices.filter((device) => device.deviceId !== 'default' && device.kind === 'videoinput').map((device) => ({
    id: device.deviceId,
    label: device.label || `Unknown Video Device (${device.deviceId})`
  }))
)
let audioOptions = $derived(
  mediaDevices.filter((device) => device.deviceId !== 'default' && device.kind === 'audioinput').map((device) => ({
    id: device.deviceId,
    label: device.label || `Unknown Audio Device (${device.deviceId})`
  }))
)

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

const srcObject: Action<HTMLVideoElement, () => MediaStream | undefined> = (node, streamEffect) => {
  $effect(() => {
    node.srcObject = streamEffect() ?? null
    return () => {
      node.srcObject = null
    }
  })
}

$effect(() => {
  let localStream: MediaStream | undefined

  ;(async () => {
    try {
      mediaDevices = await navigator.mediaDevices.enumerateDevices()
      console.log(mediaDevices)
      localStream = await getMediaStream()
      mediaStream = localStream
    } catch (error) {
      alert(
        `Failed to get media stream: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  })()

  return () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop())
      localStream = undefined
    }
  }
})
</script>

<div class="idle-room">
  <p class="fs-2xl mb-md">Room ID: {roomId}</p>
  <!-- TODO: password -->
   <div class="d-flex">
      <video
      autoplay
      muted
      playsinline
      use:srcObject={() => mediaStream}
      ></video>
      <div>
        <select name="videoId" id="videoId">
          {#each videoOptions as { id, label }}
            <option value={id}>{label}</option>
          {/each}
        </select>
        <select name="audioId" id="audioId">
          {#each audioOptions as { id, label }}
            <option value={id}>{label}</option>
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
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius-md);

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
