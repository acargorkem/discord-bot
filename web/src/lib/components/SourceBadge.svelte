<script lang="ts">
  import type { IconName } from "../icons";
  import { sourceColor, sourceLabel, type TrackSource, trackSource } from "../source";
  import Icon from "./Icon.svelte";

  let { uri }: { uri: string | null } = $props();

  const source = $derived(trackSource(uri));
  const glyph: Record<TrackSource, IconName> = {
    spotify: "srcSpotify",
    youtube: "srcYoutube",
    soundcloud: "srcSoundcloud",
    deezer: "srcDeezer",
    applemusic: "music",
    bandcamp: "music",
    other: "music",
  };
</script>

<span class="badge" style="background:{sourceColor[source]}" title={sourceLabel[source]}>
  <Icon name={glyph[source]} size={12} />
</span>

<style>
  .badge {
    width: 18px;
    height: 18px;
    border-radius: 5px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
    color: #fff;
  }
</style>
