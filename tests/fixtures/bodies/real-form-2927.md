## Describe the project you are working on
Markdown to BBCode converter

## Describe the problem or limitation you are having in your project
No particular limitation for now, but it was hard to achive this because by lack of documentation.
I was trying to parse multiline text by regex and I was strugling.
The full story can found [here](https://github.com/godotengine/godot/issues/49927)
 

## Describe the feature / enhancement and how it helps to overcome the problem or limitation
It would be nice to extend the compile function of `RegEx` class by optional flags e.g.

<html>
<body>
<!--StartFragment-->

<h1> RegEx flags to control the parsing</h1>

Flag | value | Description
-- | -- | --
IGNORECASE | 1 | ignore case.
MULTILINE | 2 | make begin/end {^, $} consider each line.
DOTALL | 4 | make . match newline too.
UNICODE | 8 | make {\w, \W, \b, \B} follow Unicode rules.
LOCALE | 16 | make {\w, \W, \b, \B} follow locale.
VERBOSE | 32 | allow comment in regex.

<!--EndFragment-->
</body>
</html>        

### function signature 
- flags are optional do not break the API
```
        Error compile(pattern: String, flags := 0)
```



## Describe how your proposal will work, with code, pseudo-code, mock-ups, and/or diagrams
Use the flags to configure regex to parse on multilines
```
	var regex := RegEx.new()
	var err = regex.compile("^### (.*)$", RegEx.MULTILINE)

````

## Is there a reason why this should be core and not an add-on in the asset library?
This is part of the built-in regex module.