### Describe the project you are working on

A 3D racing game.

### Describe the problem or limitation you are having in your project

Wheel colliders jitter at high speed.

### Describe the feature / enhancement and how it helps to overcome the problem or limitation

Add continuous collision detection for VehicleWheel3D.

### Describe how your proposal will work, with code, pseudo-code, mock-ups, and/or diagrams

A `ccd_enabled` property on VehicleWheel3D.

### If this enhancement will not be used often, can it be worked around with a few lines of script?

I don’t think a plugin could do this, the physics server API isn’t there.

### Is there a reason why this should be core and not an add-on in the asset library?

Yes, it can’t be done as an add-on.
