<script lang="ts">
import { GrabstreamClient } from '@grabstream/client'

type Props = {
  grabstreamClient: GrabstreamClient
  displayName: string
}

let { displayName, grabstreamClient }: Props = $props()
</script>

<p>Joined Room: {displayName}</p>

<style lang="scss"></style>
