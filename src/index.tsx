import { createElement, ClassAttributes } from 'react';
import * as ReactDOM from 'react-dom';

import {
    Workspace, WorkspaceProps, SparqlDataProvider, OWLStatsSettings, OWLRDFSSettings, SparqlQueryMethod,
    LinkModel, SparqlGraphBuilder, LinkConfiguration, Link
} from 'ontodia';
import { saveLayoutToLocalStorage, tryLoadLayoutFromLocalStorage } from './localstorage';
import {Dictionary, ElementModel, IriProperty, LiteralProperty} from "ontodia/ontodia/data/model";
import {SerializedDiagram} from "ontodia/ontodia/editor/serializedDiagram";

const p = 'http://ontodia.org/schema#';

function onWorkspaceMounted(workspace: Workspace) {
    if (!workspace) { return; }

    const model = workspace.getModel();

    let sparqlDataProvider = new SparqlDataProvider({
        endpointUrl: '/sparql-endpoint',
        queryMethod: SparqlQueryMethod.POST,
    }, {...OWLStatsSettings, ...{
            defaultPrefix: OWLStatsSettings.defaultPrefix + `
            PREFIX ontodia: <>
`,
            linksInfoQuery: `SELECT ?source ?type ?target ?propType ?propValue
            WHERE { 
                VALUES (?source) {\${ids}}
                VALUES (?target) {\${ids}}
                graph ?propValue {?source ?type ?target.}
                BIND(<http://sputniq.space/graph> as ?propType) 
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
                    ?s ?p ?o
                    } WHERE {
                    ?s ?p ?o
                    FILTER(ISIRI(?o)) 
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
    return {
        renderLink: (link: Link) => {
            const prop = link.data.properties['http://sputniq.space/graph'];
            const graphName = (prop as LiteralProperty).values[0].text;
            const linkTypeName = uri2name(link.typeId);
            return {
                label: {attrs: {text: {text: [{text: `<${graphName}> ${linkTypeName}`, lang: ''}]}, rect: {}}},
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

export function uri2name(uri: string): string {
    const hashIndex = uri.lastIndexOf('#');
    if (hashIndex !== -1 && hashIndex !== uri.length - 1) {
        return uri.substring(hashIndex + 1);
    }
    const endsWithSlash = uri[uri.length - 1] === '/';
    if (endsWithSlash) {
        uri = uri.substring(0, uri.length - 1);
    }

    const lastPartStart = uri.lastIndexOf('/');
    if (lastPartStart !== -1 && lastPartStart !== uri.length - 1) {
        return uri.substring(lastPartStart + 1);
    }
    return uri;
}