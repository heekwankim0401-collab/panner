### Describe the project you are working on

A roguelike with procedurally generated tilemaps.

### Describe the problem or limitation you are having in your project

TileMap autotiling is too slow for very large maps.

### Describe the feature / enhancement and how it helps to overcome the problem or limitation

Move terrain matching to a multithreaded C++ path.

### Describe how your proposal will work, with code, pseudo-code, mock-ups, and/or diagrams

Add a `threaded` flag to `set_cells_terrain_connect()`.

### If this enhancement will not be used often, can it be worked around with a few lines of script?

Not with a few lines.

```gdscript
# my_plugin.gd
extends EditorPlugin
```

It needs changes to the engine source.

### Is there a reason why this should be core and not an add-on in the asset library?

Yes.
