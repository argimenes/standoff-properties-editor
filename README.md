# Introduction
This project is a standoff property editor module built in JavaScript and HTML that can be dropped into any web application. It aims to provide the basic features of a standard text editor along with the ability to create user-defined annotations that can overlap freely. The editor can import or export data in a JSON format and makes no assumptions about the back-end data-store. All annotations are user-defined and passed in as a configuration object. Various event hooks are provided to enable your application code to manage things such as LOD lookups.

In the demo example LOD identifiers are requested via a simple JavaScript prompt, but the continuation-style callbacks allow you to lookup IDs asynchronously. (In my own Digital Humanities project, '[The Codex](https://the-codex.net/)', lookups are accomplished with modal windows that allow you to either search the backend Neo4j graph database, or quickly create entities inline and pass them back to the editor.)

## Standoff properties
A standoff property is a property that 'stands off' from the text it refers to, that is stored apart from the text source. There is a fundamental separation between the raw (or unformatted) text and the properties which standoff from it, and describe the styling and annotations that apply to the text. A property in this context is a data structure that represents a range of characters in the text along with information relevant to the annotation, such as the annotation type. Annotations can be of any type, e.g. stylistic (italics; bold; underline), semantic (line; paragraph; page), or linked entities (database record; URL). The standoff properties editor (SPE) does not mandate any annotations, but some typical ones are provided in the demo example.  

## Solving the overlap problem
The fundamental limitation of XML and HTML is that semantics are encoded in a tree structure. While descriptive XML schemas have been developed to encode digital humanities texts, XML does not cope well with [overlapping annotations](https://en.wikipedia.org/wiki/Overlapping_markup). This is because the tree structure of XML mandates that an overlapping annotation (two or more annotations that overlap the same text sequence) cross one or more branches of that tree structure. The result can be complex and ambiguous XML. By representing annotations as discrete, unstructured properties that refer to text with character indexes, annotations can freely overlap as they do not have to conform to a tree structure. An attempt to reconcile the two approaches lead to the creation of the _standoff markup_ format, which encodes annotations as XML elements that define the annotation as the joining of branches in the XML tree. However, such markup generates even less readable XML annotations and could run into problems when the source text changes. These problems disappear, however, if the text and its annotation properties are kept entirely separate. The text, then, is stored in a raw or unformatted state, annotated by a collection of discrete standoff properties.

## Enter the editor
The technical challenge posed by standoff properties is that they require indexes to link annotations to the words in the text, which suggests that the text cannot be changed without breaking the annotations. However, by using a linked list-style structure composed of SPANs it is possible to create properties that reference characters by pointers, allowing text to be freely inserted or deleted without breaking the annotations. Indexes are only calculated at the end of the session, when the annotated text is to be exported (and presumably saved). Some special handling is required for handling deletions at property boundaries, but everything is basically managed through DOM pointers.

Currently the main speed limitation is the browser's rendering phase when loading very large texts (e.g., hundreds of pages), but there are options for dealing with this.

## Configuration

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
  - propertyValueSelector: function (prop: Property, process: function);
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
