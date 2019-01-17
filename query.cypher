// Beginn bei /TEI/text/body/*
// get complete text first
match path=(d:XmlDocument)-[:NE*]->(e:XmlCharacters)
where not (e)-[:NE]->()
with tail(nodes(path)) as words, d
with reduce(s="", x in words| s + x.text ) as allText, d
// traverse the XML structure down to each tag node
match (d)<-[:IS_CHILD_OF]-(:XmlTag{_name:'TEI'})<-[:IS_CHILD_OF]-(:XmlTag{_name:'text'})<-[:IS_CHILD_OF]-(base:XmlTag{_name:'body'})
call apoc.path.expandConfig(base,{
   relationshipFilter: '<IS_CHILD_OF',
   labelFilter: 'XmlTag',
   bfs: false,
   minLevel: 1
}) yield path
with allText, nodes(path)[-1] as this
// follow the tag for the longest loop with LAST_CHILD_OF -> contains text stream underneath this tag
MATCH p=(this)-[:NEXT*]->(x)
where (x)-[:LAST_CHILD_OF*]->(this) and any(x in nodes(p) WHERE x:XmlCharacters)
with allText, this, collect(p)[-1] as longest
with allText, this, [x in nodes(longest) where x:XmlCharacters] as xmlCharacters
with allText, this, 
  apoc.coll.min([x in xmlCharacters | x.startIndex]) as min, 
  apoc.coll.max([x in xmlCharacters | x.endIndex]) as max, 
  apoc.text.join([x in xmlCharacters | x.text], "") as text
with allText, {
   index:id(this), 
   startIndex: min, 
   endIndex: max,
   text: text,
   type: this._name,
   // attributes: apoc.map.fromPairs([x in keys(this) WHERE not x starts with "_" | [x, this[x]] ])
   // amending a fixed dummy attribute to prevent empty maps (which cause issues in cypher-shell)
   attributes: apoc.map.setKey(apoc.map.fromPairs([x in keys(this) WHERE not x starts with "_" | [x, this[x]] ]), "__dummy", 1)
} as standoffProperty
return {text: allText, properties: collect(standoffProperty)} as json;
