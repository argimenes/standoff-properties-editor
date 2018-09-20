## Browsers support
| [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/edge/edge_48x48.png" alt="IE / Edge" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)</br>IE / Edge | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/firefox/firefox_48x48.png" alt="Firefox" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)</br>Firefox | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/chrome/chrome_48x48.png" alt="Chrome" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)</br>Chrome | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/safari/safari_48x48.png" alt="Safari" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)</br>Safari |
| --------- | --------- | --------- | --------- |
| IE11, Edge| last 2 versions| last 2 versions| last 2 versions

# Introduction
This project is a standoff property editor module built in JavaScript and HTML that can be dropped into any web application. It aims to provide the basic features of a standard text editor along with the ability to create user-defined annotations that can overlap freely. The editor can import or export data in a JSON format and makes no assumptions about the back-end data-store. All annotations are user-defined and passed in as a configuration object. Various event hooks are provided to enable your application code to manage things such as LOD lookups.

In the demo example LOD identifiers are requested via a simple JavaScript prompt, but the continuation-style callbacks allow you to lookup IDs asynchronously. (In my own Digital Humanities project, '[The Codex](https://the-codex.net/)', lookups are accomplished with modal windows that allow you to either search the backend Neo4j graph database, or quickly create entities inline and pass them back to the editor.)

## Standoff properties
A standoff property is a property that 'stands off' from the text it refers to, that is stored apart from the text source. There is a fundamental separation between the raw (or unformatted) text and the properties which standoff from it, and describe the styling and annotations that apply to the text. A property in this context is a data structure that represents a range of characters in the text along with information relevant to the annotation, such as the annotation type. Annotations can be of any type, e.g. stylistic (italics; bold; underline), semantic (line; paragraph; page), or linked entities (database record; URL). The standoff properties editor (SPE) does not mandate any annotations, but some typical ones are provided in the demo example.  

## Solving the overlap problem
The fundamental limitation of XML and HTML is that semantics are encoded in a tree structure. While descriptive XML schemas have been developed to encode digital humanities texts, XML does not cope well with [overlapping annotations](https://en.wikipedia.org/wiki/Overlapping_markup). This is because the tree structure of XML mandates that an overlapping annotation (two or more annotations that overlap the same text sequence) cross one or more branches of that tree structure. The result can be complex and ambiguous XML. By representing annotations as discrete, unstructured properties that refer to text with character indexes, annotations can freely overlap as they do not have to conform to a tree structure. An attempt to reconcile the two approaches lead to the creation of the _standoff markup_ format, which encodes annotations as XML elements that define the annotation as the joining of branches in the XML tree. However, such markup generates even less readable XML annotations and could run into problems when the source text changes. These problems disappear, however, if the text and its annotation properties are kept entirely separate. The text, then, is stored in a raw or unformatted state, annotated by a collection of discrete standoff properties.

## Static vs dynamic
The technical challenge posed by standoff properties is that they require indexes to link annotations to the words in the text, which suggests that the text cannot be changed without breaking the annotations. However, by using a linked list-style structure composed of SPANs it is possible to create properties that reference characters by pointers, allowing text to be freely inserted or deleted without breaking the annotations. Indexes are only calculated at the end of the session, when the annotated text is to be exported (and presumably saved). Some special handling is required for handling deletions at property boundaries, but everything is basically managed through DOM pointers.

Currently the main speed limitation is the browser's rendering phase when loading very large texts (e.g., hundreds of pages), but there are options for dealing with this.

## Layers
As there is no defined limit on the number or types of annotations that can be added to a text, there is the chance that texts may become visually cluttered with annotations. To address this, there is an option to assign a user-defined 'layer' to an annotation for the purpose of grouping them. Layers can be shown and hidden at will, thus reducing clutter. This is particularly helpful when it comes to computer-generated annotations, such as syntactic or semantic annotations created by an NLP library or other text analysis tools.

## Annotate the world
As suggested above, there is no reason annotations should be limited to those manually entered by users. Algorithms and libraries could also generate annotations automatically, such as the following:

- Lemma
- Syntax trees
- Entity name recognition
- Textual variants (versioning)
- Translations (inter-text standoff properties)

Anything that can be mined or derived from a text can be stored as a standoff property.

## Text as a graph
While standoff properties can be stored in any format storing them as LOD entities in a graph database vastly increases their potential. For example, if you were searching for all references to a person you would not only find the texts but the exact character positions in the text. If you expanded your query from a person like Leonardo da Vinci, say, to all artists you could see every instance an artist is mentioned in any text. Queries could also be combined across annotation types. For example, if you had the syntax tree of a text you could find every occurence of a term within a given syntactical unit. The more annotation types you record, the greater the number of text minining options become available.

## Features
I use the term Standoff Property Document (SPD) to refer to the combination of the raw text and its standoff properties.

- Separation of annotations from text source
- Text is dynamically editable without corrupting annotations
- Annotations can be overlaid freely
- Supports zero-point annotations (ZPA), like word-breaking hyphens that need to be marked up from a manuscript but which shouldn't be stored in the text itself
- Documents are exported and imported as JSON
- Annotations can be grouped into layers, to manage visual complexity
- The standoff property data model can easily be extended by the user in their application code through various event hooks, to store as much as or as little data as they need
- The editor makes no assumption about where LOD data is stored, and can be easily extended to query any data source

In addition:

- Annotations are annotatable with SPDs
- SPDs can be annotated with other SPDs (e.g., footnotes, margin notes)
- As suggested above, the SPD can be considered a 'first class citizen' capable of infinite recursion

## The editor
The demo editor contains four sections. The only mandatory one is the editor panel.

- Annotation buttons -- used to apply an annotation to the selected text
- Editor panel -- where the text and annotations are entered 
- Monitor -- lists the annotations at the cursor position, along with tools for managing them
- Bind/unbind panel -- the input/output section for the JSON data

## Configuration

All annotations are configured in a JSON object passed into the SPEEDy constructor; there are no default or built-in annotations. Along with the type of an annotation (its name), the editor requires annotations to have a *format* and a *topology*.

### Format
The format value ('decorate' or 'overlay') refers to how styles are to be applied to annotated text. The editor distinguishes between CSS styles that _decorate_ a HTMLElement and CSS styles that _overlay_ a HTMLElement. Because there is a limit of a single underline (border-bottom) per HTMLElement, multiple lines are rendered in the editor by stacking SPANs inside the character SPAN, allowing several lines to overlay a character.

### Topology
Topology refers to whether the annotation is _one-dimensional_ (a text range) or _zero-dimensional_ (a point). The usual concept of an annotation is that it applies to a range of text, but SPEEDy also handles annotations that are refer to a position in the text stream _between_ characters (a point). These _point annotations_ can be used to represent things like footnotes or margin notes which need to be located in the text but not represented in the text stream, or to represent characters in the original medium (such as hyphens in a manuscript) that are not required in the text stream.

#### A simple style annotation
```json
{
   type: "italics",
   format: "style",
   className: "italics"
}
```

#### A simple agent annotation
```json
{
   type: "agent",
   format: "overlay",
   className: "agent",
   propertyValueSelected: function(property, process) {
      // Values are retrieved through whatever mechanism is required -- whether through a simple dialog box
      // or through an AJAX call to a database in a modal search window -- and passed to the process callback.
      var value = prompt("Agent GUID", property.value);
      process(value);
   }
}
```

- container: HTMLElement;
- monitor: HTMLElement;

- monitorButton
   - link: string;
   - layer: string;
   - remove: string;
   - comment: string;
   
- propertyType
  - format: string;
  - shortcut: string: 
  - className: string;
  - propertyValueSelector: function (prop: Property, process: function (guid: string; name: string;));
  - labelRenderer: function() => string;
  
## Hooks
- onPropertyCreated: function (prop: Property, data: JSON);
- onPropertyChanged: function (prop: Property);
- onPropertyDeleted: function (prop: Property);
- onPropertyUnbound: function (data: JSON; prop: Property);

- commentManager: (prop: Property);

## Methods
- bind: { text: string; properties: IStandoffProperty[]; }
- setLayerVisibility: (layer: string; selected: bool);
- modeClicked: (mode: string);
- unbind: function () => IStandoffPropertyEditor;

## Demo
https://argimenes.github.io/standoff-properties-editor/ 
