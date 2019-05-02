import { createElement, ClassAttributes } from 'react';
import * as ReactDOM from 'react-dom';

import {
    Workspace, WorkspaceProps, SparqlDataProvider, OWLStatsSettings, OWLRDFSSettings, SparqlQueryMethod,
    LinkModel, SparqlGraphBuilder, LinkConfiguration, Link
} from 'ontodia';
import { saveLayoutToLocalStorage, tryLoadLayoutFromLocalStorage } from './localstorage';
import {LayoutData} from 'ontodia';
import {Dictionary, ElementModel, IriProperty} from "ontodia/ontodia/data/model";
import {SerializedDiagram} from "ontodia/ontodia/editor/serializedDiagram";

const p = 'http://ontodia.org/schema#';

function onWorkspaceMounted(workspace: Workspace) {
    if (!workspace) { return; }

    const model = workspace.getModel();

    const linkConfigurations: LinkConfiguration[] = [
        {
            id: `${p}mapsTo`,
            inverseId: `${p}mapsFrom`,
            path: `?property rdfs:domain $source; rdfs:range $target.`,
            properties: `?property rdfs:label ?propValue. BIND(rdfs:label as ?propType)`
        },
        {
            id: `${p}subClassOf`,
            inverseId: `${p}parentClassOf`,
            path: `$source rdfs:subClassOf $target.`,
        }
    ];

    let sparqlDataProvider = new SparqlDataProvider({
        endpointUrl: '/sparql-endpoint',
        queryMethod: SparqlQueryMethod.POST,
    }, {...OWLRDFSSettings, ...{
            defaultPrefix: OWLRDFSSettings.defaultPrefix + `
            PREFIX ontodia: <>
`,
            linkConfigurations: linkConfigurations,
            linkTypesOfQuery: `
    SELECT ?link (count(distinct ?outObject) as ?outCount) (count(distinct ?inObject) as ?inCount)
    WHERE {
            \${linkConfigurations}        
        } group by ?link           
`,
            linkTypesStatisticsQuery: `
    SELECT ?link (count(distinct ?outObject) as ?outCount) (count(distinct ?inObject) as ?inCount)
    WHERE {
       \${linkConfigurations}   
    } GROUP BY ?link
`,
            linksInfoQuery: `SELECT ?source ?type ?target ?propType ?propValue
            WHERE { 
                VALUES (?source) {\${ids}}
                VALUES (?target) {\${ids}}
                \${linkConfigurations} 
            }                
        `,
            elementInfoQuery: `
        CONSTRUCT {
            ?inst rdf:type ?class .
            ?inst rdfs:label ?label .
            ?inst ?propType ?propValue.
        } WHERE {
            VALUES (?inst) {\${ids}}
            OPTIONAL { ?inst rdfs:isDefinedBy ?class. }
            OPTIONAL { ?inst \${dataLabelProperty} ?label}
            OPTIONAL { ?inst ?propType ?propValue.
            FILTER (isLiteral(?propValue)) }
        }
    `,
        }
    });

    const savedLayoutData = tryLoadLayoutFromLocalStorage();

    let loadingGraph : Promise<{
            preloadedElements: Dictionary<ElementModel>;
        diagram: SerializedDiagram;
    }>;

    if (savedLayoutData) {
        loadingGraph = Promise.resolve({diagram: savedLayoutData, preloadedElements: {}});
    } else {
        const graphBuilder = new SparqlGraphBuilder(sparqlDataProvider);
        loadingGraph = graphBuilder.getGraphFromConstruct(
            `CONSTRUCT { 
                    ?s <http://example.com/prop> "prop"
                    } WHERE {
                    ?s a ?type 
                    VALUES ?type {owl:Class rdfs:Class} 
                    FILTER NOT EXISTS {
                        ?s rdfs:subClassOf? ?blockedTypes. 
                        VALUES ?blockedTypes { <https://spec.edmcouncil.org/fibo/ontology/FBC/DebtAndEquities/Debt/FloatingInterestRate> <https://spec.edmcouncil.org/fibo/ontology/IND/InterestRates/InterestRates/ReferenceInterestRate>}
                        } 
                    }`,
        );
        workspace.showWaitIndicatorWhile(loadingGraph);
    }

    loadingGraph.then(({preloadedElements, diagram}) => {
        diagram.layoutData.links = [];
        console.log(`Elements count: ${diagram.layoutData.elements.length}`);
        return model.importLayout({
            diagram,
            validateLinks: true,
            dataProvider: sparqlDataProvider,
        });
    }).then(() => {
        return model.requestLinksOfType();
    }).then(() => {
        if (!savedLayoutData) {
                workspace.forceLayout();
                workspace.zoomToFit();
        }
    });
}

const resolveLinkTemplates = (linkTypeId: string) => {
    return [`${p}mapsTo`, `${p}mapsFrom`].find(test => test === linkTypeId) == undefined ? undefined : {
        renderLink: (link: Link) => {
            const prop = link.data.properties['http://www.w3.org/2000/01/rdf-schema#label'];
            const label = (prop as IriProperty).values[0].value;
            return {
                label: {attrs: {text: {text: [{text: label, lang: ''}]}, rect: {}}},
                connection: {
                    stroke: '#34c7f3',
                    'stroke-width': 2,
                }};
        },
    };
};

const props: WorkspaceProps & ClassAttributes<Workspace> = {
    ref: onWorkspaceMounted,
    viewOptions: {
        onIriClick: iri => {
            window.open(iri.iri);
            console.log(iri);
            },
    },
    onSaveDiagram: workspace => {
        const diagram = workspace.getModel().exportLayout();
        window.location.hash = saveLayoutToLocalStorage(diagram);
        window.location.reload();
    },
    linkTemplateResolver: resolveLinkTemplates
};

 document.addEventListener('DOMContentLoaded', () => {
        const container = document.createElement('div');
        container.id = 'root';
        document.body.appendChild(container);
        ReactDOM.render(createElement(Workspace, props), container)
    });
