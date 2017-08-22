# ontodia-typescript-example
Ontodia library embedding example in TypeScript

## Running

First, clone repository and install all dependencies:

    git clone https://github.com/ontodia-org/ontodia-typescript-example.git
    cd ontodia-typescript-example
    npm install

Then, start development server with

    npm run demo

To terminate development server, pless Ctrl-C/Cmd-C in the console.

To start in production mode compile typescript sources and start express.js server:
    
    npm run build
    npm start

## Configuring SPARQL endpoint

To configure URL of SPARQL enpoint set SPARQL_ENDPOINT enviromental variable before starting development or express.js server. Fox example, in MacOS/Linux you can execute the following:

    SPARQL_ENDPOINT=https://library-ontodia-org.herokuapp.com/sparql npm run demo

