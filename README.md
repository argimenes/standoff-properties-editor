# Introduction
This project is a standoff property editor module built in JavaScript and HTML that can be dropped into any web application. It aims to provide the basic features of a standard text editor along with the ability to create user-defined annotations that can overlap freely. The editor can import or export data in a JSON format and makes no assumptions about the back-end data-store. All annotations are user-defined and passed in as a configuration object. Various event hooks are provided to enable your application code to manage things such as LOD lookups.

In the demo example LOD identifiers are requested via a simple JavaScript prompt, but the continuation-style callbacks allow you to lookup IDs asynchronously. (In my own Digital Humanities project, 'The Codex', lookups are accomplished with modal windows that allow you to either search the backend Neo4j graph database, or quickly create entities inline and pass them back to the editor.)

## What is a standoff property?
A standoff property is a property that 'stands off' from the text it refers to, that is stored apart from the text source. There is a fundamental separation between the raw (or unformatted) text and the properties which standoff from it, and describe the styling and annotations that apply to the text. A property in this context is a data structure that represents a range of characters in the text along with information relevant to the annotation, such as the annotation type. Annotations can be of any type, but they typically fall into three categories: stylistic (italics; bold; underline), semantic (line; paragraph; page), or linked entities (database record; URL). The standoff properties editor (SPE) does not mandate any annotations, but some typical ones are provided in the demo example.  

## What are its advantages?
The fundamental limitation of XML and HTML is that semantics are encoded in a tree structure. While descriptive XML schemas have been developed to encode digital humanities texts, XML does not cope well with overlapping annotations. This is because the tree structure of XML mandates that an overlapping annotation (two or more annotations that overlap the same text sequence) cross one or more branches of that tree structure. The result can be complex and ambiguous XML. By representing annotations as discrete, unstructured properties that refer to text with character indexes, annotations can freely overlap as they do not have to conform to a tree structure. An attempt to reconcile the two approaches lead to the creation of the _standoff markup_ format, which encodes annotations as XML elements that define the annotation as the joining of branches in the XML tree. However, such markup generates even less readable XML annotations. These problems disappear, however, if the text and its annotation properties are kept entirely separate. The text, then, is stored in a raw or unformatted state, annotated by a collection of discrete standoff properties.

## The challenges of designing a standoff property editor
TBC

## Demo
https://argimenes.github.io/standoff-properties-editor/ 
