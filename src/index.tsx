import { createElement, ClassAttributes } from 'react';
import * as ReactDOM from 'react-dom';

import {
    Workspace, WorkspaceProps, SparqlDataProvider, OWLStatsSettings, OWLRDFSSettings, SparqlQueryMethod,
    LinkModel,
} from 'ontodia';
import { saveLayoutToLocalStorage, tryLoadLayoutFromLocalStorage } from './localstorage';
import {LinkConfiguration} from 'ontodia/ontodia/data/sparql/sparqlDataProviderSettings';


function onWorkspaceMounted(workspace: Workspace) {
    if (!workspace) { return; }

    const model = workspace.getModel();

    const p = 'http://ontodia.org/schema#';

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

    const resolveLinkTemplates = (linkTypeId: string) => {
        return ['${p}mapsTo', '${p}mapsFrom'].find(test => test === linkTypeId) == undefined ? undefined : {
            markerTarget: {
                fill: '#d7e1ec',
            },
            renderLink: (link: LinkModel) => {
                const label = link.properties['http://www.w3.org/2000/01/rdf-schema#label'].values[0].text;
                return {
                    connection: {
                        stroke: '#d7e1ec',
                        'stroke-width': 1,
                    },
                    label: {
                        attrs: {
                            rect: {fill: '#f8f8f8'},
                            text: {
                                fill: '#8CA0B3',
                                'font-size': '11px',
                                text: label !== undefined ? [{text: label, lang: ''}] : undefined,
                            },
                        },
                    },
                };
            },
        };
    };
    workspace.getDiagram().registerLinkTemplateResolver(resolveLinkTemplates);

    const layoutData = tryLoadLayoutFromLocalStorage();
    model.importLayout({
        layoutData,
        validateLinks: true,        
        dataProvider: new SparqlDataProvider({
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
        }
        }),
    });
}



const props: WorkspaceProps & ClassAttributes<Workspace> = {
    ref: onWorkspaceMounted,
    viewOptions: {
        onIriClick: iri => {
            window.open(iri);
            console.log(iri);
            },
    },
    onSaveDiagram: workspace => {
        const {layoutData} = workspace.getModel().exportLayout();
        window.location.hash = saveLayoutToLocalStorage(layoutData);
        window.location.reload();
    },
};

 document.addEventListener('DOMContentLoaded', () => {
        const container = document.createElement('div');
        container.id = 'root';
        document.body.appendChild(container);
        ReactDOM.render(createElement(Workspace, props), container)
    });
