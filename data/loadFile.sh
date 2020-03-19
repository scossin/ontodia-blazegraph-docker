#!/bin/bash
if [ "$#" -ne 3 ]; then
    echo "3 arguments expected: FILENAME BLAZEGRAPH_NAMESPACE BLAZEGRAPH_PORT"
    exit 1
fi

FILENAME=$1
BLAZEGRAPH_NAMESPACE=$2
BLAZEGRAPH_PORT=$3

# ignore directories...
if [ ! -f $FILENAME ]; then
    echo "ignoring $FILENAME..."
    exit 0
fi 

# property file for dataloader API
LOAD_PROP_FILE=/tmp/$$.properties
cat <<EOT >> $LOAD_PROP_FILE
quiet=false
verbose=2
closure=false
durableQueues=true
#Needed for quads
#defaultGraph=
com.bigdata.rdf.store.DataLoader.flush=true
com.bigdata.rdf.store.DataLoader.bufferCapacity=100000
com.bigdata.rdf.store.DataLoader.queueCapacity=10
#Namespace to load
namespace=$BLAZEGRAPH_NAMESPACE
#Files to load
fileOrDirs=/data/$FILENAME
#Property file (if creating a new namespace)
propertyFile=/data/properties.xml
EOT

echo "Loading $FILENAME in $BLAZEGRAPH_NAMESPACE namespace.........."

curl -X POST --data-binary @${LOAD_PROP_FILE} --header 'Content-Type:text/plain' http://localhost:${BLAZEGRAPH_PORT}/bigdata/dataloader
