### Describe the project you are working on

A 2D strategy game with thousands of units on screen.

### Describe the problem or limitation you are having in your project

Draw calls explode when many CanvasItems use different materials.

### Describe the feature / enhancement and how it helps to overcome the problem or limitation

Expose a way to control canvas batching per material group.

### Describe how your proposal will work, with code, pseudo-code, mock-ups, and/or diagrams

Add a `batch_group` property to CanvasItem.

### If this enhancement will not be used often, can it be worked around with a few lines of script?

No. This requires engine changes because the 2D renderer internals are not exposed to scripts.

### Is there a reason why this should be core and not an add-on in the asset library?

Yes, this cannot be implemented as an add-on since GDExtension has no access to the canvas batching.
