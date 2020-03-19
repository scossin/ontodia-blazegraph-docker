# ontodia-blazegraph-docker
A docker-compose with 2 services : 

* ontodia
* blazegraph

Ontodia is a node application forked from https://github.com/ontodia-org/ontodia-typescript-example.git

## Running
First, check the .env file to configure the services.
Then: 
```
docker-compose up -d
```
Ontodia needs a Sparql Endpoint (set the namespace in the .env file) to connect to that doesn't exist when the ontodia service starts.

## How to load data in blazegraph with the API ?
Go to the data folder (a volume of the blazegraph container).
Put the files to load in the ttl folder and execute the scripts loadDir.sh (or loadFile.sh to load only one file). 

loadDir.sh expects one parameter: the folder name

loadFile.sh expects three parameters: the filename, the blazegraph namespace, the blazegraph port

For example :
```
bash loadDir.sh ./ttl # recursively load all files in ttl folder
```

The loading process can be monitored with the 'docker logs' command.