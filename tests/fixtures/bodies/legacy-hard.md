**Describe the project you are working on:**
An open world game with streamed terrain.

**Describe the problem or limitation you are having in your project:**
Importing very large heightmaps blocks the editor for minutes.

**Describe the feature / enhancement and how it helps to overcome the problem or limitation:**
Make the texture importer run in a background thread.

**Describe how your proposal will work, with code, pseudo-code, mock-ups and/or diagrams:**
The import dock shows progress while the editor stays usable.

**If this enhancement will not be used often, can it be worked around with a few lines of script?**
Not really, the import pipeline is internal to the engine.

**Is there a reason why this should be core and not an add-on in the asset library?**
**Yes**, performance matters here: doing it in GDScript is too slow.
