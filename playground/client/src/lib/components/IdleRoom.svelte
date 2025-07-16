<script lang="ts">
import CommonButton from '$lib/components/CommonButton.svelte'
import CommonInput from '$lib/components/CommonInput.svelte'
import CommonSelect from '$lib/components/CommonSelect.svelte'
import { validateDisplayName } from '@grabstream/core'
import { onDestroy, onMount } from 'svelte'
import type { Action } from 'svelte/action'

type Props = {
  roomId: string
  onJoin: (values: {
    displayName: string
    password?: string
    mediaStream: MediaStream
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
        ?.getVideoTracks()
        .some((track) => track.getSettings().deviceId === device.deviceId)
    }))
)

let audioOptions = $derived(
  mediaDevices
    .filter((device) => device.kind === 'audioinput')
    .map((device) => ({
      id: device.deviceId,
      label: device.label || `Unknown Audio Device (${device.deviceId})`,
      selected: mediaStream
        ?.getAudioTracks()
        .some((track) => track.getSettings().deviceId === device.deviceId)
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

const onChangeDevice = async ({
  type,
  value
}: {
  type: 'AUDIO' | 'VIDEO'
  value: string
}) => {
  if (type === 'VIDEO') {
    mediaStream = await getMediaStream({
      videoId: value,
      audioId: mediaStream?.getAudioTracks()[0]?.getSettings().deviceId
    })
  } else if (type === 'AUDIO') {
    mediaStream = await getMediaStream({
      audioId: value,
      videoId: mediaStream?.getVideoTracks()[0]?.getSettings().deviceId
    })
  }
}

const join = () => {
  const trimmedDisplayName = displayName.trim()
  const validateDisplayNameResult = validateDisplayName(trimmedDisplayName)

  if (!validateDisplayNameResult.success) {
    alert(validateDisplayNameResult.error)
    return
  }

  if (!mediaStream) {
    alert('Please allow access to your camera and microphone.')
    return
  }

  onJoin({
    displayName: trimmedDisplayName,
    password: password || undefined,
    mediaStream
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
  <div class="d-flex flex-column-reverse md:flex-row g-md mb-md">
    <video
      autoplay
      muted
      playsinline
      use:srcObject={() => mediaStream}
    ></video>
    <div class="d-flex flex-column g-xs md:g-sm">
      <CommonSelect
        name="video"
        id="video"
        onchange={(e) => {
          const value = (e.target as HTMLSelectElement).value
          onChangeDevice({ type: 'VIDEO', value })
        }}>
        {#each videoOptions as { id, label, selected }}
          <option value={id} {selected}>{label}</option>
        {/each}
      </CommonSelect>
      <CommonSelect
        name="audio"
        id="audio"
        onchange={(e) => {
          const value = (e.target as HTMLSelectElement).value
          onChangeDevice({ type: 'AUDIO', value })
        }}>
        {#each audioOptions as { id, label, selected }}
          <option value={id} {selected}>{label}</option>
        {/each}
      </CommonSelect>
    </div>
  </div>
  <CommonInput
    type="text"
    id="displayName"
    name="displayName"
    placeholder="Display Name"
    autofocus
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
