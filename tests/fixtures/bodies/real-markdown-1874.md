## Describe the project you are working on:

### [Goost](https://goostengine.github.io/) - Godot Engine extension

## Describe the problem or limitation you are having in your project:
Me and other people have a number of input-related proposals which are unlikely to be implemented in Godot due to perceived complexity, but nonetheless would benefit from core changes done to `Input`, or such features are very easy to implement in core, but infinitely hard to implement via script by beginners:
- Add a fighting game input buffer: #100.
- Input buffering: goostengine/goost#16.
- Distinguish between the system that filters input and the data structure that contains input state: #104.
- Implement input action duration: godotengine/godot#36460.

TBD:
- Add a signal for detecting action toggle states (pressed/released) in `Input`: godotengine/godot#43646.
- Add Input `is_anything_pressed` method godotengine/godot#35012.

## Describe the feature / enhancement and how it helps to overcome the problem or limitation:
Unity has `InputExtentions` class, perhaps that's something we should also aim for.

See also https://forum.unity.com/threads/creating-an-extension-class-for-input.132870/

## Describe how your proposal will work, with code, pseudocode, mockups, and/or diagrams:
I propose this is implemented similarly to godotengine/godot#42875.

## If this enhancement will not be used often, can it be worked around with a few lines of script?:
Things like #104, not possible.

## Is there a reason why this should be core and not an add-on in the asset library?:
Those proposals should not be part of the core, that's the point with this proposal.

If approved, I can work on this myself, I think it would require minimum core changes.
