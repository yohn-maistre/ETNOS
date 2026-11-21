<script lang="ts">
  // An image or an image set as a viewer body: the zoomable image view with the record's photos.
  import ImageBody from './ImageBody.svelte'
  import type { ViewerObject } from '../viewer-data.ts'
  let { object }: { object: ViewerObject } = $props()
</script>

<ImageBody photos={object.photos ?? []} label={object.title} />
