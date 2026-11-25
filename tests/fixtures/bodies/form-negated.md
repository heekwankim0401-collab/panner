### Describe the project you are working on

A 2D level editor tool built inside Godot.

### Describe the problem or limitation you are having in your project

Custom gizmos cannot be drawn in the 2D viewport the way they can in 3D.

### Describe the feature / enhancement and how it helps to overcome the problem or limitation

Add an EditorNode2DGizmoPlugin API.

### Describe how your proposal will work, with code, pseudo-code, mock-ups, and/or diagrams

Mirror the existing EditorNode3DGizmoPlugin API for 2D.

### If this enhancement will not be used often, can it be worked around with a few lines of script?

A plugin is not possible here because the editor does not expose the 2D viewport gizmos.

### Is there a reason why this should be core and not an add-on in the asset library?

Yes.
